import hashlib
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from threading import Lock
import logging

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    value: str
    created_at: float
    ttl_seconds: int
    hit_count: int = 0
    feature_type: str = ""
    
    def is_expired(self) -> bool:
        return time.time() > (self.created_at + self.ttl_seconds)
    
    def time_remaining(self) -> float:
        return max(0, (self.created_at + self.ttl_seconds) - time.time())


class SemanticCache:
    """
    Semantic cache for LLM responses.
    Keys are normalized from request parameters.
    Supports TTL and automatic cleanup.
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 86400):
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = Lock()
        self._max_size = max_size
        self._default_ttl = default_ttl  # 24 hours
        self._hits = 0
        self._misses = 0
    
    def _normalize_key(self, params: Dict[str, Any]) -> str:
        """
        Create normalized cache key from parameters.
        Handles variations in input format.
        """
        normalized = {}
        
        # Normalize destination
        if "destination" in params:
            normalized["dest"] = str(params["destination"]).lower().strip()
        
        # Normalize days/duration
        if "days" in params:
            normalized["days"] = int(params["days"])
        elif "duration" in params:
            normalized["days"] = int(params["duration"])
        elif "start_date" in params and "end_date" in params:
            try:
                from datetime import datetime
                start = datetime.fromisoformat(params["start_date"])
                end = datetime.fromisoformat(params["end_date"])
                normalized["days"] = (end - start).days + 1
            except (ValueError, TypeError):
                pass
        
        # Normalize budget
        if "budget" in params:
            # Round to nearest 100 for better cache hits
            budget = float(str(params["budget"]).replace(",", ""))
            normalized["budget"] = round(budget / 100) * 100
        
        # Normalize currency
        if "currency" in params:
            normalized["currency"] = str(params["currency"]).upper()
        
        # Normalize preferences (sorted for consistency)
        if "preferences" in params:
            prefs = params["preferences"]
            if isinstance(prefs, list):
                normalized["prefs"] = sorted([str(p).lower() for p in prefs])
            elif isinstance(prefs, str):
                normalized["prefs"] = [prefs.lower()]
        
        # Normalize location for hotels
        if "location" in params:
            normalized["location"] = str(params["location"]).lower().strip()
        
        # Normalize check-in/check-out to duration
        if "check_in" in params and "check_out" in params:
            try:
                from datetime import datetime
                check_in = datetime.fromisoformat(params["check_in"])
                check_out = datetime.fromisoformat(params["check_out"])
                normalized["nights"] = (check_out - check_in).days
            except (ValueError, TypeError):
                pass
        
        # Create hash
        key_str = json.dumps(normalized, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()[:32]
    
    def _extract_params_from_messages(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Extract cacheable parameters from messages"""
        params = {}
        
        # Get the user message content
        for msg in messages:
            if msg.get("role") == "user":
                content = msg.get("content", "")
                
                # Extract destination
                import re
                dest_match = re.search(r'(?:to|for|in)\s+"?([^".\n]+)"?', content, re.I)
                if dest_match:
                    params["destination"] = dest_match.group(1).strip()
                
                # Extract days
                days_match = re.search(r'(\d+)[- ]?day', content, re.I)
                if days_match:
                    params["days"] = int(days_match.group(1))
                
                # Extract budget
                budget_match = re.search(r'(?:budget|₹|\$|€|£)\s*[\d,]+', content, re.I)
                if budget_match:
                    budget_str = re.sub(r'[^\d]', '', budget_match.group())
                    if budget_str:
                        params["budget"] = int(budget_str)
                
                # Extract currency
                if "INR" in content or "₹" in content:
                    params["currency"] = "INR"
                elif "USD" in content or "$" in content:
                    params["currency"] = "USD"
                elif "EUR" in content or "€" in content:
                    params["currency"] = "EUR"
                
                break
        
        return params
    
    def get(
        self, 
        messages: List[Dict[str, str]], 
        feature_type: str = "",
        params: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Get cached response if available.
        
        Args:
            messages: The request messages
            feature_type: Feature type for cache segmentation
            params: Optional explicit parameters (overrides extraction)
        
        Returns:
            Cached response or None
        """
        if params is None:
            params = self._extract_params_from_messages(messages)
        
        if not params:
            return None
        
        params["_feature"] = feature_type
        key = self._normalize_key(params)
        
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self._misses += 1
                return None
            
            if entry.is_expired():
                del self._cache[key]
                self._misses += 1
                return None
            
            entry.hit_count += 1
            self._hits += 1
            logger.info(f"Cache HIT for {feature_type}: {key[:8]}... (hits: {entry.hit_count})")
            return entry.value
    
    def set(
        self,
        messages: List[Dict[str, str]],
        response: str,
        feature_type: str = "",
        params: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None
    ):
        """
        Cache a response.
        
        Args:
            messages: The request messages
            response: The response to cache
            feature_type: Feature type for cache segmentation
            params: Optional explicit parameters
            ttl: Time-to-live in seconds (default: 24 hours)
        """
        if params is None:
            params = self._extract_params_from_messages(messages)
        
        if not params:
            return
        
        params["_feature"] = feature_type
        key = self._normalize_key(params)
        
        with self._lock:
            # Evict if at capacity (LRU-ish: remove oldest expired first)
            if len(self._cache) >= self._max_size:
                self._evict()
            
            self._cache[key] = CacheEntry(
                value=response,
                created_at=time.time(),
                ttl_seconds=ttl or self._default_ttl,
                feature_type=feature_type
            )
            logger.info(f"Cache SET for {feature_type}: {key[:8]}...")
    
    def _evict(self):
        """Evict entries to make room"""
        # First, remove expired entries
        now = time.time()
        expired = [k for k, v in self._cache.items() if v.is_expired()]
        for k in expired:
            del self._cache[k]
        
        # If still at capacity, remove oldest entries
        if len(self._cache) >= self._max_size:
            sorted_entries = sorted(
                self._cache.items(),
                key=lambda x: x[1].created_at
            )
            # Remove oldest 10%
            to_remove = max(1, len(sorted_entries) // 10)
            for k, _ in sorted_entries[:to_remove]:
                del self._cache[k]
    
    def invalidate(self, feature_type: Optional[str] = None):
        """Invalidate cache entries"""
        with self._lock:
            if feature_type is None:
                self._cache.clear()
            else:
                to_remove = [
                    k for k, v in self._cache.items() 
                    if v.feature_type == feature_type
                ]
                for k in to_remove:
                    del self._cache[k]
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        with self._lock:
            total = self._hits + self._misses
            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total * 100, 2) if total > 0 else 0,
                "entries_by_feature": self._count_by_feature()
            }
    
    def _count_by_feature(self) -> Dict[str, int]:
        counts = {}
        for entry in self._cache.values():
            ft = entry.feature_type or "unknown"
            counts[ft] = counts.get(ft, 0) + 1
        return counts


# Singleton instance
semantic_cache = SemanticCache()
