from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    model: str
    usage: Dict[str, int]
    latency_ms: float
    provider: str
    raw_response: Optional[Dict] = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        json_schema: Optional[Dict] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a completion from the LLM.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            json_schema: Optional JSON schema for structured output
            **kwargs: Additional provider-specific parameters
        
        Returns:
            LLMResponse with content and metadata
        
        Raises:
            LLMProviderError: On provider errors (rate limit, auth, etc.)
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is available"""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return provider identifier"""
        pass


class LLMProviderError(Exception):
    """Base exception for LLM provider errors"""
    
    def __init__(
        self, 
        message: str, 
        provider: str,
        model: str = "",
        is_rate_limit: bool = False,
        is_auth_error: bool = False,
        is_timeout: bool = False,
        retry_after: Optional[float] = None,
        original_error: Optional[Exception] = None
    ):
        super().__init__(message)
        self.provider = provider
        self.model = model
        self.is_rate_limit = is_rate_limit
        self.is_auth_error = is_auth_error
        self.is_timeout = is_timeout
        self.retry_after = retry_after
        self.original_error = original_error
    
    def __str__(self):
        parts = [f"[{self.provider}]"]
        if self.model:
            parts.append(f"[{self.model}]")
        if self.is_rate_limit:
            parts.append("[RATE_LIMIT]")
        if self.is_auth_error:
            parts.append("[AUTH]")
        if self.is_timeout:
            parts.append("[TIMEOUT]")
        parts.append(str(self.args[0]))
        return " ".join(parts)
