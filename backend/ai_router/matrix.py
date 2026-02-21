from dataclasses import dataclass
from typing import List, Optional, Callable
from .features import FeatureType


@dataclass
class ModelConfig:
    name: str
    provider: str  # "groq" or "local"
    rpm_limit: int = 30
    context_window: int = 8192
    supports_json: bool = True


@dataclass
class FallbackChain:
    primary: ModelConfig
    fallback: ModelConfig
    last_resort: ModelConfig
    deterministic_fallback: Optional[Callable] = None


# Model definitions
MODELS = {
    "llama-3.3-70b-versatile": ModelConfig(
        name="llama-3.3-70b-versatile",
        provider="groq",
        rpm_limit=30,
        context_window=128000,
        supports_json=True
    ),
    "mixtral-8x7b-32768": ModelConfig(
        name="mixtral-8x7b-32768",
        provider="groq",
        rpm_limit=30,
        context_window=32768,
        supports_json=True
    ),
    "llama-3.1-8b-instant": ModelConfig(
        name="llama-3.1-8b-instant",
        provider="groq",
        rpm_limit=30,
        context_window=128000,
        supports_json=True
    ),
    "gemma2-9b-it": ModelConfig(
        name="gemma2-9b-it",
        provider="groq",
        rpm_limit=30,
        context_window=8192,
        supports_json=True
    ),
    "qwen/qwen3-32b": ModelConfig(
        name="qwen/qwen3-32b",
        provider="groq",
        rpm_limit=30,
        context_window=32768,
        supports_json=True
    ),
    "local": ModelConfig(
        name="llama3.2",
        provider="local",
        rpm_limit=1000,
        context_window=8192,
        supports_json=True
    ),
}


def _deterministic_json_formatter(text: str) -> str:
    """Deterministic JSON formatting fallback"""
    import json
    import re
    
    # Try to extract JSON from text
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            return json.dumps(parsed, indent=2)
        except json.JSONDecodeError:
            pass
    
    # Return as-is if cannot parse
    return text


def _deterministic_extraction(text: str) -> str:
    """Deterministic extraction fallback"""
    import json
    import re
    
    # Extract key-value patterns
    patterns = {
        "dates": re.findall(r'\d{4}-\d{2}-\d{2}', text),
        "prices": re.findall(r'[\$€£₹]\s*[\d,]+(?:\.\d{2})?', text),
        "locations": re.findall(r'(?:in|at|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text),
        "numbers": re.findall(r'\b\d+\b', text),
    }
    return json.dumps({k: v for k, v in patterns.items() if v})


def _rule_based_budget_estimation(text: str) -> str:
    """Rule-based budget estimation fallback"""
    import json
    import re
    
    # Default costs per day by region
    DAILY_COSTS = {
        "india": {"budget": 2000, "mid": 5000, "luxury": 15000, "currency": "INR"},
        "usa": {"budget": 100, "mid": 250, "luxury": 500, "currency": "USD"},
        "europe": {"budget": 80, "mid": 200, "luxury": 400, "currency": "EUR"},
        "default": {"budget": 50, "mid": 150, "luxury": 300, "currency": "USD"}
    }
    
    # Extract days
    days_match = re.search(r'(\d+)\s*(?:day|days)', text.lower())
    days = int(days_match.group(1)) if days_match else 3
    
    # Detect region
    text_lower = text.lower()
    if any(city in text_lower for city in ["delhi", "mumbai", "goa", "bangalore", "india"]):
        costs = DAILY_COSTS["india"]
    elif any(city in text_lower for city in ["new york", "los angeles", "usa", "america"]):
        costs = DAILY_COSTS["usa"]
    elif any(city in text_lower for city in ["paris", "london", "rome", "europe"]):
        costs = DAILY_COSTS["europe"]
    else:
        costs = DAILY_COSTS["default"]
    
    return json.dumps({
        "estimatedBudget": {
            "budget": f"{costs['currency']} {costs['budget'] * days}",
            "midRange": f"{costs['currency']} {costs['mid'] * days}",
            "luxury": f"{costs['currency']} {costs['luxury'] * days}"
        },
        "perDay": costs,
        "days": days
    })


# Feature to model chain mapping
MODEL_MATRIX: dict[FeatureType, FallbackChain] = {
    FeatureType.TRIP_ITINERARY: FallbackChain(
        primary=MODELS["llama-3.3-70b-versatile"],
        fallback=MODELS["mixtral-8x7b-32768"],
        last_resort=MODELS["llama-3.1-8b-instant"]
    ),
    FeatureType.HOTEL_RECOMMENDATION: FallbackChain(
        primary=MODELS["llama-3.3-70b-versatile"],
        fallback=MODELS["qwen/qwen3-32b"],
        last_resort=MODELS["mixtral-8x7b-32768"]
    ),
    FeatureType.MODIFY_PLAN: FallbackChain(
        primary=MODELS["mixtral-8x7b-32768"],
        fallback=MODELS["llama-3.1-8b-instant"],
        last_resort=MODELS["local"]
    ),
    FeatureType.CHAT_FOLLOWUP: FallbackChain(
        primary=MODELS["mixtral-8x7b-32768"],
        fallback=MODELS["llama-3.1-8b-instant"],
        last_resort=MODELS["local"]
    ),
    FeatureType.EXTRACTION: FallbackChain(
        primary=MODELS["llama-3.1-8b-instant"],
        fallback=MODELS["gemma2-9b-it"],
        last_resort=MODELS["local"],
        deterministic_fallback=_deterministic_extraction
    ),
    FeatureType.JSON_FORMATTING: FallbackChain(
        primary=MODELS["gemma2-9b-it"],
        fallback=MODELS["mixtral-8x7b-32768"],
        last_resort=MODELS["local"],
        deterministic_fallback=_deterministic_json_formatter
    ),
    FeatureType.BUDGET_ESTIMATION: FallbackChain(
        primary=MODELS["qwen/qwen3-32b"],
        fallback=MODELS["mixtral-8x7b-32768"],
        last_resort=MODELS["local"],
        deterministic_fallback=_rule_based_budget_estimation
    ),
    FeatureType.UNKNOWN: FallbackChain(
        primary=MODELS["mixtral-8x7b-32768"],
        fallback=MODELS["llama-3.1-8b-instant"],
        last_resort=MODELS["local"]
    ),
}


def get_fallback_chain(feature: FeatureType) -> FallbackChain:
    return MODEL_MATRIX.get(feature, MODEL_MATRIX[FeatureType.UNKNOWN])
