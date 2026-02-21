import os
import time
from typing import Any, Dict, List, Optional
import httpx
import logging

from .base import LLMProvider, LLMResponse, LLMProviderError

logger = logging.getLogger(__name__)


class LocalProvider(LLMProvider):
    """
    Local LLM provider (Ollama or any OpenAI-compatible local endpoint).
    Default endpoint: http://localhost:11434/v1/chat/completions
    """
    
    DEFAULT_BASE_URL = "http://localhost:11434/v1/chat/completions"
    DEFAULT_MODEL = "llama3.2"
    
    def __init__(
        self, 
        base_url: Optional[str] = None, 
        default_model: Optional[str] = None,
        timeout: float = 300.0  # Longer timeout for local models
    ):
        self._base_url = base_url or os.getenv("LOCAL_LLM_URL", self.DEFAULT_BASE_URL)
        self._default_model = default_model or os.getenv("LOCAL_LLM_MODEL", self.DEFAULT_MODEL)
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._available: Optional[bool] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        json_schema: Optional[Dict] = None,
        **kwargs
    ) -> LLMResponse:
        # Use default model if not specified or if "local" is passed
        actual_model = model if model and model != "local" else self._default_model
        
        payload = {
            "model": actual_model,
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False
        }
        
        # Add JSON mode if schema provided
        if json_schema:
            payload["format"] = "json"
        
        start_time = time.time()
        
        try:
            client = await self._get_client()
            response = await client.post(
                self._base_url,
                json=payload
            )
            
            latency_ms = (time.time() - start_time) * 1000
            
            if response.status_code != 200:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_msg)
                except Exception:
                    pass
                    
                raise LLMProviderError(
                    error_msg,
                    provider=self.provider_name,
                    model=actual_model
                )
            
            data = response.json()
            
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = data.get("usage", {})
            
            return LLMResponse(
                content=content,
                model=actual_model,
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                },
                latency_ms=latency_ms,
                provider=self.provider_name,
                raw_response=data
            )
            
        except httpx.ConnectError as e:
            self._available = False
            raise LLMProviderError(
                f"Cannot connect to local LLM at {self._base_url}",
                provider=self.provider_name,
                model=actual_model,
                original_error=e
            )
        except httpx.TimeoutException as e:
            raise LLMProviderError(
                f"Request timed out after {self._timeout}s",
                provider=self.provider_name,
                model=actual_model,
                is_timeout=True,
                original_error=e
            )
        except httpx.RequestError as e:
            raise LLMProviderError(
                f"Request failed: {str(e)}",
                provider=self.provider_name,
                model=actual_model,
                original_error=e
            )
    
    async def health_check(self) -> bool:
        """Check if local LLM is available"""
        if self._available is not None:
            return self._available
            
        try:
            client = await self._get_client()
            # Try to hit the models endpoint or do a minimal completion
            response = await client.get(
                self._base_url.replace("/chat/completions", "/models"),
                timeout=5.0
            )
            self._available = response.status_code == 200
        except Exception:
            # Try alternative health check
            try:
                response = await self.generate(
                    messages=[{"role": "user", "content": "hi"}],
                    model=self._default_model,
                    max_tokens=5,
                    temperature=0
                )
                self._available = bool(response.content)
            except Exception:
                self._available = False
        
        return self._available
    
    @property
    def provider_name(self) -> str:
        return "local"
    
    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance
local_provider = LocalProvider()
