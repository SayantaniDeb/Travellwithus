from enum import Enum


class FeatureType(str, Enum):
    TRIP_ITINERARY = "trip_itinerary"
    HOTEL_RECOMMENDATION = "hotel_recommendation"
    MODIFY_PLAN = "modify_plan"
    CHAT_FOLLOWUP = "chat_followup"
    EXTRACTION = "extraction"
    JSON_FORMATTING = "json_formatting"
    BUDGET_ESTIMATION = "budget_estimation"
    UNKNOWN = "unknown"


FEATURE_KEYWORDS = {
    FeatureType.TRIP_ITINERARY: [
        "travel plan", "itinerary", "day-by-day", "trip", "vacation plan",
        "days in", "visit", "tour", "journey", "travel to", "going to",
        "destination", "sightseeing", "morning", "afternoon", "evening"
    ],
    FeatureType.HOTEL_RECOMMENDATION: [
        "hotel", "accommodation", "stay", "lodging", "resort", "hostel",
        "booking", "room", "check-in", "check-out", "per night", "amenities"
    ],
    FeatureType.MODIFY_PLAN: [
        "modify", "change", "update", "edit", "adjust", "replace",
        "swap", "instead", "different", "alter", "revise"
    ],
    FeatureType.CHAT_FOLLOWUP: [
        "tell me more", "what about", "how about", "can you", "please",
        "explain", "suggest", "recommend", "why", "which", "when"
    ],
    FeatureType.EXTRACTION: [
        "extract", "parse", "get", "find", "identify", "list all",
        "pull out", "retrieve", "capture"
    ],
    FeatureType.JSON_FORMATTING: [
        "format", "json", "structure", "convert to", "schema",
        "valid json", "reformat", "organize"
    ],
    FeatureType.BUDGET_ESTIMATION: [
        "budget", "cost", "price", "expense", "estimate", "how much",
        "total cost", "spending", "affordable", "cheap", "expensive"
    ]
}
