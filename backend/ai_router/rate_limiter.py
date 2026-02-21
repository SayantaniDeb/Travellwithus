import time
from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class RateLimitWindow:
    """Sliding window rate limit tracker"""
    requests: List[float] = field(default_factory=list)
    window_seconds: int = 60
    
    def add_request(self):
        now = time.time()
        self.requests.append(now)
        self._cleanup(now)
    
    def _cleanup(self, now: float):
        cutoff = now - self.window_seconds
        self.requests = [t for t in self.requests if t > cutoff]
    
    def current_count(self) -> int:
        self._cleanup(time.time())
        return len(self.requests)
    
    def time_until_available(self, limit: int) -> float:
        """Returns seconds until a slot is available, or 0 if available now"""
        self._cleanup(time.time())
        if len(self.requests) < limit:
            return 0.0
        
        # Find oldest request that will expire
        oldest = min(self.requests)
        wait_time = oldest + self.window_seconds - time.time()
        return max(0.0, wait_time)


class RateLimiter:
    """
    Per-model rate limit tracking with predictive skipping.
    Thread-safe implementation.
    """
    
    def __init__(self):
        self._windows: Dict[str, RateLimitWindow] = defaultdict(RateLimitWindow)
        self._limits: Dict[str, int] = {}
        self._lock = Lock()
        self._failures: Dict[str, List[float]] = defaultdict(list)
        self._failure_window = 300  # 5 minutes
    
    def set_limit(self, model_name: str, rpm: int):
        """Set RPM limit for a model"""
        with self._lock:
            self._limits[model_name] = rpm
    
    def record_request(self, model_name: str):
        """Record a request for rate limiting"""
        with self._lock:
            self._windows[model_name].add_request()
    
    def record_failure(self, model_name: str, is_rate_limit: bool = False):
        """Record a failure, especially rate limit errors"""
        with self._lock:
            now = time.time()
            self._failures[model_name].append(now)
            # Cleanup old failures
            cutoff = now - self._failure_window
            self._failures[model_name] = [
                t for t in self._failures[model_name] if t > cutoff
            ]
    
    def should_skip(self, model_name: str, threshold: float = 0.8) -> bool:
        """
        Predict if model should be skipped based on:
        1. Current RPM vs limit
        2. Recent failure rate
        
        Args:
            threshold: Skip if usage is above this percentage (0.8 = 80%)
        
        Returns:
            True if model should be skipped
        """
        with self._lock:
            limit = self._limits.get(model_name, 30)
            window = self._windows[model_name]
            current = window.current_count()
            
            # Check if near limit
            if current >= limit * threshold:
                logger.info(f"Rate limit prediction: skipping {model_name} ({current}/{limit} RPM)")
                return True
            
            # Check recent failure rate
            failures = self._failures.get(model_name, [])
            if len(failures) >= 3:  # 3+ failures in 5 min window
                logger.info(f"Failure rate prediction: skipping {model_name} ({len(failures)} recent failures)")
                return True
            
            return False
    
    def get_status(self, model_name: str) -> Dict:
        """Get current status for a model"""
        with self._lock:
            limit = self._limits.get(model_name, 30)
            window = self._windows[model_name]
            current = window.current_count()
            failures = len(self._failures.get(model_name, []))
            
            return {
                "model": model_name,
                "current_rpm": current,
                "limit": limit,
                "usage_percent": round(current / limit * 100, 1),
                "recent_failures": failures,
                "should_skip": self.should_skip(model_name),
                "wait_time": window.time_until_available(limit)
            }
    
    def get_all_status(self) -> Dict[str, Dict]:
        """Get status for all tracked models"""
        with self._lock:
            models = set(self._windows.keys()) | set(self._limits.keys())
        return {model: self.get_status(model) for model in models}


# Singleton instance
rate_limiter = RateLimiter()

# Initialize default limits
DEFAULT_LIMITS = {
    "llama-3.3-70b-versatile": 30,
    "mixtral-8x7b-32768": 30,
    "llama-3.1-8b-instant": 30,
    "gemma2-9b-it": 30,
    "qwen/qwen3-32b": 30,
    "local": 1000,
}

for model, limit in DEFAULT_LIMITS.items():
    rate_limiter.set_limit(model, limit)
