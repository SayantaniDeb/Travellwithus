import os
import time
from typing import Any, Dict, List, Optional
import httpx
import logging

from .base import LLMProvider, LLMResponse, LLMProviderError

logger = logging.getLogger(__name__)


class GroqProvider(LLMProvider):
    """Groq API provider implementation"""
    
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    def __init__(self, api_key: Optional[str] = None, timeout: float = 120.0):
        self._api_key = api_key or os.getenv("GROQ_API_KEY")
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        json_schema: Optional[Dict] = None,
        **kwargs
    ) -> LLMResponse:
        if not self._api_key:
            raise LLMProviderError(
                "Groq API key not configured",
                provider=self.provider_name,
                model=model,
                is_auth_error=True
            )
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._api_key}"
        }
        
        payload = {
            "model": model,
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        # Add JSON mode if schema provided
        if json_schema:
            payload["response_format"] = {"type": "json_object"}
        
        start_time = time.time()
        
        try:
            client = await self._get_client()
            response = await client.post(
                self.BASE_URL,
                json=payload,
                headers=headers
            )
            
            latency_ms = (time.time() - start_time) * 1000
            
            if response.status_code == 429:
                # Rate limit error
                retry_after = response.headers.get("retry-after")
                raise LLMProviderError(
                    f"Rate limit exceeded for {model}",
                    provider=self.provider_name,
                    model=model,
                    is_rate_limit=True,
                    retry_after=float(retry_after) if retry_after else None
                )
            
            if response.status_code == 401:
                raise LLMProviderError(
                    "Invalid API key",
                    provider=self.provider_name,
                    model=model,
                    is_auth_error=True
                )
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
                raise LLMProviderError(
                    error_msg,
                    provider=self.provider_name,
                    model=model
                )
            
            data = response.json()
            
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = data.get("usage", {})
            
            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                },
                latency_ms=latency_ms,
                provider=self.provider_name,
                raw_response=data
            )
            
        except httpx.TimeoutException as e:
            raise LLMProviderError(
                f"Request timed out after {self._timeout}s",
                provider=self.provider_name,
                model=model,
                is_timeout=True,
                original_error=e
            )
        except httpx.RequestError as e:
            raise LLMProviderError(
                f"Request failed: {str(e)}",
                provider=self.provider_name,
                model=model,
                original_error=e
            )
    
    async def health_check(self) -> bool:
        """Quick health check using a minimal request"""
        try:
            response = await self.generate(
                messages=[{"role": "user", "content": "hi"}],
                model="llama-3.1-8b-instant",
                max_tokens=5,
                temperature=0
            )
            return bool(response.content)
        except Exception:
            return False
    
    @property
    def provider_name(self) -> str:
        return "groq"
    
    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance
groq_provider = GroqProvider()
