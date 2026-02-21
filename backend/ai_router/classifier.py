import json
import re
from typing import List, Dict, Any, Optional
from .features import FeatureType, FEATURE_KEYWORDS


class FeatureClassifier:
    """Classifies request payload into feature types"""
    
    def __init__(self):
        self._llm_classifier = None
    
    def classify_fast(self, messages: List[Dict[str, str]], endpoint_hint: Optional[str] = None) -> FeatureType:
        """
        Fast keyword-based classification.
        Falls back to LLM classification for ambiguous cases.
        """
        # Extract all text content
        text_content = self._extract_text(messages).lower()
        
        # Endpoint hints for quick classification
        if endpoint_hint:
            hint_lower = endpoint_hint.lower()
            if "itinerary" in hint_lower or "trip" in hint_lower or "plan-trip" in hint_lower:
                return FeatureType.TRIP_ITINERARY
            if "hotel" in hint_lower:
                return FeatureType.HOTEL_RECOMMENDATION
            if "weather" in hint_lower:
                return FeatureType.EXTRACTION
            if "budget" in hint_lower or "cost" in hint_lower:
                return FeatureType.BUDGET_ESTIMATION
        
        # Score each feature type
        scores = {}
        for feature, keywords in FEATURE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_content)
            if score > 0:
                scores[feature] = score
        
        if not scores:
            return self._classify_by_structure(messages, text_content)
        
        # Return highest scoring feature
        return max(scores, key=scores.get)
    
    def _extract_text(self, messages: List[Dict[str, str]]) -> str:
        """Extract all text from messages"""
        parts = []
        for msg in messages:
            if isinstance(msg, dict):
                content = msg.get("content", "")
                if isinstance(content, str):
                    parts.append(content)
        return " ".join(parts)
    
    def _classify_by_structure(self, messages: List[Dict[str, str]], text: str) -> FeatureType:
        """Classify based on request structure patterns"""
        
        # Check for JSON output requests
        if "return only valid json" in text or "json:" in text or '"' in text and '{' in text:
            # Check if it's trip-related JSON
            if any(kw in text for kw in ["days", "itinerary", "morning", "afternoon", "evening"]):
                return FeatureType.TRIP_ITINERARY
            if any(kw in text for kw in ["hotel", "accommodation", "price", "amenities"]):
                return FeatureType.HOTEL_RECOMMENDATION
            if any(kw in text for kw in ["cost", "budget", "expense"]):
                return FeatureType.BUDGET_ESTIMATION
            return FeatureType.JSON_FORMATTING
        
        # Check for modification patterns
        if any(word in text for word in ["instead of", "change the", "modify the", "update the"]):
            return FeatureType.MODIFY_PLAN
        
        # Check for extraction patterns
        if any(word in text for word in ["extract", "parse", "find all", "list all"]):
            return FeatureType.EXTRACTION
        
        # Check for conversational patterns
        if len(messages) > 2 or any(word in text for word in ["?", "tell me", "what", "how", "why"]):
            return FeatureType.CHAT_FOLLOWUP
        
        # Default to trip itinerary for travel-related content
        if any(word in text for word in ["travel", "visit", "trip", "destination"]):
            return FeatureType.TRIP_ITINERARY
        
        return FeatureType.UNKNOWN
    
    async def classify_with_llm(
        self, 
        messages: List[Dict[str, str]], 
        llm_provider
    ) -> FeatureType:
        """
        Use LLM for ambiguous classification.
        Only called when keyword classification is uncertain.
        """
        classification_prompt = f"""Classify this request into exactly one category:
- trip_itinerary: Creating travel plans, day-by-day itineraries
- hotel_recommendation: Finding hotels, accommodations
- modify_plan: Changing existing plans
- chat_followup: Follow-up questions, clarifications
- extraction: Extracting specific data from text
- json_formatting: Formatting or converting to JSON
- budget_estimation: Cost calculations, budget planning

Request: {self._extract_text(messages)[:500]}

Respond with ONLY the category name, nothing else."""

        try:
            response = await llm_provider.generate(
                messages=[{"role": "user", "content": classification_prompt}],
                temperature=0.1,
                max_tokens=50
            )
            
            category = response.strip().lower().replace(" ", "_")
            
            # Map to enum
            for feature in FeatureType:
                if feature.value == category:
                    return feature
            
            return FeatureType.UNKNOWN
            
        except Exception:
            # Fallback to keyword classification
            return self.classify_fast(messages)


# Singleton instance
classifier = FeatureClassifier()
