import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

from .features import FeatureType
from .classifier import classifier
from .matrix import get_fallback_chain, ModelConfig, FallbackChain
from .cache import semantic_cache
from .rate_limiter import rate_limiter
from .providers.base import LLMProvider, LLMResponse, LLMProviderError
from .providers.groq_provider import groq_provider
from .providers.local_provider import local_provider

logger = logging.getLogger(__name__)


class FallbackLevel(str, Enum):
    PRIMARY = "primary"
    FALLBACK = "fallback"
    LAST_RESORT = "last_resort"
    DETERMINISTIC = "deterministic"
    FAILED = "failed"


@dataclass
class RoutingResult:
    content: str
    feature_type: FeatureType
    model_used: str
    fallback_level: FallbackLevel
    latency_ms: float
    retries: int
    from_cache: bool = False
    usage: Dict[str, int] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)


@dataclass
class RoutingMetrics:
    """Observability metrics for routing decisions"""
    request_id: str
    feature_type: str
    models_attempted: List[str]
    model_used: str
    fallback_level: str
    total_latency_ms: float
    llm_latency_ms: float
    cache_hit: bool
    retries: int
    errors: List[str]


class AIRouter:
    """
    Feature-aware multi-model routing with automatic fallback.
    Never exposes LLM errors to users.
    """
    
    def __init__(self):
        self._providers: Dict[str, LLMProvider] = {
            "groq": groq_provider,
            "local": local_provider
        }
        self._request_counter = 0
        self._metrics_log: List[RoutingMetrics] = []
    
    def _get_provider(self, model_config: ModelConfig) -> LLMProvider:
        return self._providers.get(model_config.provider, groq_provider)
    
    def _generate_request_id(self) -> str:
        self._request_counter += 1
        return f"req_{int(time.time())}_{self._request_counter}"
    
    async def route(
        self,
        messages: List[Dict[str, str]],
        endpoint_hint: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.7,
        use_cache: bool = True,
        cache_params: Optional[Dict[str, Any]] = None
    ) -> RoutingResult:
        """
        Route request to appropriate model with automatic fallback.
        
        Args:
            messages: Chat messages
            endpoint_hint: Optional hint from endpoint name
            max_tokens: Maximum tokens for response
            temperature: Sampling temperature
            use_cache: Whether to use semantic cache
            cache_params: Optional explicit cache parameters
        
        Returns:
            RoutingResult with response and metadata
        """
        request_id = self._generate_request_id()
        start_time = time.time()
        models_attempted = []
        errors = []
        
        # Step 1: Classify the feature type
        feature_type = classifier.classify_fast(messages, endpoint_hint)
        logger.info(f"[{request_id}] Classified as: {feature_type.value}")
        
        # Step 2: Check cache (for cacheable features)
        if use_cache and feature_type in [FeatureType.TRIP_ITINERARY, FeatureType.HOTEL_RECOMMENDATION]:
            cached = semantic_cache.get(messages, feature_type.value, cache_params)
            if cached:
                return RoutingResult(
                    content=cached,
                    feature_type=feature_type,
                    model_used="cache",
                    fallback_level=FallbackLevel.PRIMARY,
                    latency_ms=(time.time() - start_time) * 1000,
                    retries=0,
                    from_cache=True
                )
        
        # Step 3: Get fallback chain
        chain = get_fallback_chain(feature_type)
        
        # Step 4: Try models in order
        model_sequence: List[Tuple[ModelConfig, FallbackLevel]] = [
            (chain.primary, FallbackLevel.PRIMARY),
            (chain.fallback, FallbackLevel.FALLBACK),
            (chain.last_resort, FallbackLevel.LAST_RESORT)
        ]
        
        llm_latency_ms = 0
        
        for model_config, level in model_sequence:
            # Check rate limit prediction
            if rate_limiter.should_skip(model_config.name):
                logger.info(f"[{request_id}] Skipping {model_config.name} (rate limit prediction)")
                errors.append(f"Skipped {model_config.name}: predicted rate limit")
                continue
            
            models_attempted.append(model_config.name)
            provider = self._get_provider(model_config)
            
            try:
                logger.info(f"[{request_id}] Trying {model_config.name} ({level.value})")
                
                # Record request for rate limiting
                rate_limiter.record_request(model_config.name)
                
                llm_start = time.time()
                response = await provider.generate(
                    messages=messages,
                    model=model_config.name,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                llm_latency_ms = (time.time() - llm_start) * 1000
                
                # Success!
                total_latency = (time.time() - start_time) * 1000
                
                # Cache successful response
                if use_cache and feature_type in [FeatureType.TRIP_ITINERARY, FeatureType.HOTEL_RECOMMENDATION]:
                    semantic_cache.set(messages, response.content, feature_type.value, cache_params)
                
                # Log metrics
                self._log_metrics(RoutingMetrics(
                    request_id=request_id,
                    feature_type=feature_type.value,
                    models_attempted=models_attempted,
                    model_used=model_config.name,
                    fallback_level=level.value,
                    total_latency_ms=total_latency,
                    llm_latency_ms=llm_latency_ms,
                    cache_hit=False,
                    retries=len(models_attempted) - 1,
                    errors=errors
                ))
                
                return RoutingResult(
                    content=response.content,
                    feature_type=feature_type,
                    model_used=model_config.name,
                    fallback_level=level,
                    latency_ms=total_latency,
                    retries=len(models_attempted) - 1,
                    usage=response.usage,
                    errors=errors
                )
                
            except LLMProviderError as e:
                error_msg = f"{model_config.name}: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"[{request_id}] {error_msg}")
                
                # Record failure
                rate_limiter.record_failure(model_config.name, e.is_rate_limit)
                
                # Continue to next model
                continue
                
            except Exception as e:
                error_msg = f"{model_config.name}: Unexpected error - {str(e)}"
                errors.append(error_msg)
                logger.error(f"[{request_id}] {error_msg}", exc_info=True)
                continue
        
        # Step 5: Try deterministic fallback if available
        if chain.deterministic_fallback:
            try:
                logger.info(f"[{request_id}] Using deterministic fallback")
                
                # Extract text content for deterministic processing
                text_content = " ".join(
                    m.get("content", "") for m in messages if m.get("role") == "user"
                )
                
                result = chain.deterministic_fallback(text_content)
                total_latency = (time.time() - start_time) * 1000
                
                self._log_metrics(RoutingMetrics(
                    request_id=request_id,
                    feature_type=feature_type.value,
                    models_attempted=models_attempted,
                    model_used="deterministic",
                    fallback_level=FallbackLevel.DETERMINISTIC.value,
                    total_latency_ms=total_latency,
                    llm_latency_ms=0,
                    cache_hit=False,
                    retries=len(models_attempted),
                    errors=errors
                ))
                
                return RoutingResult(
                    content=result,
                    feature_type=feature_type,
                    model_used="deterministic",
                    fallback_level=FallbackLevel.DETERMINISTIC,
                    latency_ms=total_latency,
                    retries=len(models_attempted),
                    errors=errors
                )
                
            except Exception as e:
                errors.append(f"Deterministic fallback failed: {str(e)}")
        
        # Step 6: Generate graceful failure response (NEVER throw error to user)
        total_latency = (time.time() - start_time) * 1000
        
        self._log_metrics(RoutingMetrics(
            request_id=request_id,
            feature_type=feature_type.value,
            models_attempted=models_attempted,
            model_used="none",
            fallback_level=FallbackLevel.FAILED.value,
            total_latency_ms=total_latency,
            llm_latency_ms=0,
            cache_hit=False,
            retries=len(models_attempted),
            errors=errors
        ))
        
        # Return user-friendly fallback response
        fallback_response = self._generate_graceful_fallback(feature_type, messages)
        
        return RoutingResult(
            content=fallback_response,
            feature_type=feature_type,
            model_used="fallback_message",
            fallback_level=FallbackLevel.FAILED,
            latency_ms=total_latency,
            retries=len(models_attempted),
            errors=errors
        )
    
    def _generate_graceful_fallback(
        self, 
        feature_type: FeatureType, 
        messages: List[Dict[str, str]]
    ) -> str:
        """Generate user-friendly response when all models fail"""
        import json
        
        if feature_type == FeatureType.TRIP_ITINERARY:
            return json.dumps({
                "error": False,
                "message": "We're experiencing high demand. Please try again in a few moments.",
                "suggestion": "You can also try a shorter trip duration or different dates.",
                "days": []
            })
        
        if feature_type == FeatureType.HOTEL_RECOMMENDATION:
            return json.dumps({
                "error": False,
                "message": "Hotel search is temporarily unavailable. Please try again shortly.",
                "hotels": [],
                "suggestion": "Try searching with a different location or budget."
            })
        
        if feature_type == FeatureType.BUDGET_ESTIMATION:
            return json.dumps({
                "error": False,
                "message": "Budget estimation is temporarily unavailable.",
                "estimatedBudget": "Unable to calculate at this time",
                "suggestion": "Please try again in a few moments."
            })
        
        return json.dumps({
            "error": False,
            "message": "Service temporarily unavailable. Please try again.",
            "data": None
        })
    
    def _log_metrics(self, metrics: RoutingMetrics):
        """Log routing metrics for observability"""
        self._metrics_log.append(metrics)
        
        # Keep only last 1000 metrics in memory
        if len(self._metrics_log) > 1000:
            self._metrics_log = self._metrics_log[-1000:]
        
        # Log to standard logger
        logger.info(
            f"[METRICS] {metrics.request_id} | "
            f"feature={metrics.feature_type} | "
            f"model={metrics.model_used} | "
            f"level={metrics.fallback_level} | "
            f"latency={metrics.total_latency_ms:.0f}ms | "
            f"retries={metrics.retries} | "
            f"cache={metrics.cache_hit}"
        )
    
    def get_metrics(self, limit: int = 100) -> List[Dict]:
        """Get recent routing metrics"""
        return [
            {
                "request_id": m.request_id,
                "feature_type": m.feature_type,
                "models_attempted": m.models_attempted,
                "model_used": m.model_used,
                "fallback_level": m.fallback_level,
                "total_latency_ms": m.total_latency_ms,
                "llm_latency_ms": m.llm_latency_ms,
                "cache_hit": m.cache_hit,
                "retries": m.retries,
                "errors": m.errors
            }
            for m in self._metrics_log[-limit:]
        ]
    
    def get_status(self) -> Dict:
        """Get router status including rate limits and cache stats"""
        return {
            "rate_limits": rate_limiter.get_all_status(),
            "cache": semantic_cache.get_stats(),
            "recent_metrics": self.get_metrics(10)
        }


# Singleton instance
ai_router = AIRouter()
