from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
import httpx
import os
import sys
import logging
import secrets
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Add api directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import AI Router
from ai_router import ai_router, FeatureType, semantic_cache, rate_limiter

app = FastAPI(title="TravelWithUs API Proxy")
from community_images import router as community_images_router
app.include_router(community_images_router)

# CORS configuration
from api_safety import PublicApiGuard
app.add_middleware(PublicApiGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "https://travellwithus.vercel.app,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://travellwith02.netlify.app").split(",") if origin.strip() and origin.strip() != "*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key"],
)

# API Keys from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")


# ============ Request Models ============

def require_admin(x_admin_key: str = Header(default="")):
    expected = os.getenv("ADMIN_API_KEY", "")
    if not expected or not secrets.compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=403, detail="Administrator access required")


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=64000)

class CompletionRequest(BaseModel):
    model: str = Field(min_length=1, max_length=120)
    messages: List[ChatMessage] = Field(min_length=1, max_length=64)
    max_tokens: int = Field(default=4000, ge=1, le=12000)
    temperature: float = Field(default=0.7, ge=0, le=2, allow_inf_nan=False)
    provider: str = Field(default="groq", pattern="^(groq|openai|gemini)$")
    feature_hint: Optional[str] = Field(default=None, max_length=80)
    use_cache: bool = True

    @model_validator(mode="after")
    def bounded_prompt(self):
        if sum(len(message.content) for message in self.messages) > 128000:
            raise ValueError("Combined messages exceed the prompt limit")
        return self


# ============ Smart LLM Completions with Multi-Model Routing ============

@app.post("/api/completions")
async def smart_completions(request: CompletionRequest):
    """
    Smart LLM completions endpoint with:
    - Feature-aware model routing
    - Automatic fallback on failures
    - Rate limit prediction
    - Semantic caching
    - Never exposes errors to user
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # Route through AI router
    result = await ai_router.route(
        messages=messages,
        endpoint_hint=request.feature_hint,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        use_cache=request.use_cache
    )
    
    # Failed providers must not masquerade as a successful, empty itinerary.
    if result.fallback_level.value == "failed" or not isinstance(result.content, str) or not result.content.strip():
        raise HTTPException(
            status_code=503,
            detail="AI planning is temporarily unavailable. Please try again later."
        )

    # Return in OpenAI-compatible format
    return {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": result.content
            },
            "finish_reason": "stop"
        }],
        "model": result.model_used,
        "usage": result.usage,
        "_routing": {
            "feature_type": result.feature_type.value,
            "fallback_level": result.fallback_level.value,
            "latency_ms": result.latency_ms,
            "retries": result.retries,
            "from_cache": result.from_cache
        }
    }


# ============ Legacy Direct Completions (Backward Compatible) ============

@app.post("/api/completions/direct", dependencies=[Depends(require_admin)])
async def direct_completions(request: CompletionRequest):
    """Direct proxy without smart routing (for debugging)"""
    
    if request.provider == "groq":
        if not GROQ_API_KEY:
            raise HTTPException(status_code=500, detail="Groq API key not configured")
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}"
        }
    elif request.provider == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
    
    payload = {
        "model": request.model,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "max_tokens": request.max_tokens,
        "temperature": request.temperature
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            return response.json()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail="The upstream service could not complete this request")


# ============ Weather API Proxy ============

async def fallback_weather(q, lat, lon):
    """Adapt Open-Meteo current conditions to the existing weather response."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            name, country = "Current location", ""
            if q and q.strip():
                geo = await client.get("https://geocoding-api.open-meteo.com/v1/search", params={"name": q.strip(), "count": 1, "language": "en"})
                geo.raise_for_status()
                matches = geo.json().get("results", [])
                if not matches:
                    raise HTTPException(status_code=404, detail="City not found. Try a city and country.")
                place = matches[0]
                lat, lon = place["latitude"], place["longitude"]
                name, country = place["name"], place.get("country_code", "")
            elif lat is None or lon is None:
                raise HTTPException(status_code=400, detail="Enter a city name to check weather.")
            response = await client.get("https://api.open-meteo.com/v1/forecast", params={"latitude": lat, "longitude": lon, "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m", "wind_speed_unit": "ms"})
            response.raise_for_status()
            current = response.json()["current"]
            code = current["weather_code"]
            description = ("Clear sky" if code == 0 else "Partly cloudy" if code in (1, 2) else "Overcast" if code == 3 else "Fog" if code in (45, 48) else "Thunderstorm" if code >= 95 else "Snow" if code in (71, 73, 75, 77, 85, 86) else "Rain")
            return {"name": name, "sys": {"country": country}, "main": {"temp": current["temperature_2m"] + 273.15, "humidity": current["relative_humidity_2m"]}, "wind": {"speed": current["wind_speed_10m"]}, "weather": [{"description": description}], "provider": "Open-Meteo", "cod": 200}
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=502, detail="Weather is temporarily unavailable. Please try again shortly.")


@app.get("/api/weather")
async def proxy_weather(q: Optional[str] = Query(default=None, max_length=120), lat: Optional[float] = Query(default=None, ge=-90, le=90), lon: Optional[float] = Query(default=None, ge=-180, le=180)):
    """Return weather or a meaningful HTTP error; never mask provider errors as success."""
    if not OPENWEATHER_API_KEY:
        return await fallback_weather(q, lat, lon)
    params = {"appid": OPENWEATHER_API_KEY}
    if q and q.strip():
        params["q"] = q.strip()
    elif lat is not None and lon is not None:
        params.update({"lat": lat, "lon": lon})
    else:
        raise HTTPException(status_code=400, detail="Enter a city name to check weather.")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        data = response.json()
        code = str(data.get("cod", response.status_code))
        if response.status_code in (401, 403) or code in ("401", "403"):
            logger.warning("Weather provider rejected the configured API key")
            return await fallback_weather(q, lat, lon)
        if response.status_code == 404 or code == "404":
            raise HTTPException(status_code=404, detail="City not found. Try the city name followed by its country.")
        if response.status_code == 429 or code == "429":
            raise HTTPException(status_code=503, detail="Weather service is busy. Please try again shortly.")
        if response.status_code != 200 or not isinstance(data.get("main", {}).get("temp"), (int, float)):
            raise HTTPException(status_code=502, detail="Weather provider is unavailable. Please try again later.")
        return data
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Weather request timed out. Please try again.")
    except (httpx.RequestError, ValueError):
        raise HTTPException(status_code=502, detail="Weather provider could not be reached. Please try again later.")


# Local destination search works without geocoding credentials.
@app.get("/api/destinations")
def destination_suggestions(q: str = Query(default="", max_length=120)):
    from destinations import suggest_destinations
    return {"suggestions": suggest_destinations(q), "attribution": "GeoNames"}


# ============ Geocoding API Proxy ============

@app.get("/api/geocode")
async def proxy_geocode(lng: float = Query(ge=-180, le=180), lat: float = Query(ge=-90, le=90)):
    """Proxy endpoint for Mapbox reverse geocoding"""
    
    if not MAPBOX_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Mapbox access token not configured")
    
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json?access_token={MAPBOX_ACCESS_TOKEN}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            return response.json()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail="The upstream service could not complete this request")


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": bool(GROQ_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
        "openweather_configured": bool(OPENWEATHER_API_KEY),
        "mapbox_configured": bool(MAPBOX_ACCESS_TOKEN)
    }


# ============ Router Status & Metrics ============

@app.get("/api/router/status", dependencies=[Depends(require_admin)])
async def router_status():
    """Get AI router status including rate limits and cache stats"""
    return ai_router.get_status()


@app.get("/api/router/metrics", dependencies=[Depends(require_admin)])
async def router_metrics(limit: int = Query(default=100, ge=1, le=1000)):
    """Get recent routing metrics for observability"""
    return ai_router.get_metrics(limit)


@app.post("/api/cache/invalidate", dependencies=[Depends(require_admin)])
async def invalidate_cache(feature_type: Optional[str] = None):
    """Invalidate cache entries"""
    semantic_cache.invalidate(feature_type)
    return {"status": "ok", "invalidated": feature_type or "all"}


@app.get("/api/rate-limits", dependencies=[Depends(require_admin)])
async def get_rate_limits():
    """Get current rate limit status for all models"""
    return rate_limiter.get_all_status()


# Vercel serverless handler
handler = app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
