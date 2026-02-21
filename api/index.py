from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import os
import sys
import logging
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

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")


# ============ Request Models ============

class ChatMessage(BaseModel):
    role: str
    content: str

class CompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    max_tokens: Optional[int] = 4000
    temperature: Optional[float] = 0.7
    provider: Optional[str] = "groq"
    feature_hint: Optional[str] = None  # Optional hint: "itinerary", "hotel", "budget", etc.
    use_cache: Optional[bool] = True


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

@app.post("/api/completions/direct")
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
            raise HTTPException(status_code=500, detail=str(e))


# ============ Weather API Proxy ============

@app.get("/api/weather")
async def proxy_weather(q: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """Proxy endpoint for OpenWeatherMap API"""
    
    if not OPENWEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenWeather API key not configured")
    
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    
    if q:
        url = f"{base_url}?q={q}&appid={OPENWEATHER_API_KEY}"
    elif lat is not None and lon is not None:
        url = f"{base_url}?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
    else:
        raise HTTPException(status_code=400, detail="Either 'q' (city name) or 'lat' and 'lon' parameters are required")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            return response.json()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ============ Geocoding API Proxy ============

@app.get("/api/geocode")
async def proxy_geocode(lng: float, lat: float):
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
            raise HTTPException(status_code=500, detail=str(e))


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

@app.get("/api/router/status")
async def router_status():
    """Get AI router status including rate limits and cache stats"""
    return ai_router.get_status()


@app.get("/api/router/metrics")
async def router_metrics(limit: int = 100):
    """Get recent routing metrics for observability"""
    return ai_router.get_metrics(limit)


@app.post("/api/cache/invalidate")
async def invalidate_cache(feature_type: Optional[str] = None):
    """Invalidate cache entries"""
    semantic_cache.invalidate(feature_type)
    return {"status": "ok", "invalidated": feature_type or "all"}


@app.get("/api/rate-limits")
async def get_rate_limits():
    """Get current rate limit status for all models"""
    return rate_limiter.get_all_status()


# Vercel serverless handler
handler = app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
