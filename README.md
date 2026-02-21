# 🌍 TravelWithUs

A comprehensive AI-powered travel planning Progressive Web App (PWA) that helps you plan trips, find hotels, track budgets, check weather, and connect with other travelers.

![React](https://img.shields.io/badge/React-18.2.0-blue)
![Vite](https://img.shields.io/badge/Vite-5.x-purple)
![Firebase](https://img.shields.io/badge/Firebase-9.23-orange)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)

### You can find the app:

##### [Hosted here](https://travellwith02.netlify.app)
##### [Video Demo](https://user-images.githubusercontent.com/74983536/230199942-84b3ea7b-6110-4620-a009-d3e147e254fd.mp4)

---

## ✨ Features Overview

| Feature | Description | AI Model / API |
|---------|-------------|----------------|
| **AI Trip Planner** | Generate complete day-by-day itineraries | Groq `llama-3.3-70b-versatile` |
| **AI Hotel Search** | Get personalized hotel recommendations | Groq `llama-3.3-70b-versatile` |
| **Weather Forecast** | Real-time weather for any city | OpenWeatherMap API |
| **Location Detection** | Auto-detect user location | Mapbox Geocoding API |
| **Budget Tracker** | Track travel expenses by category | Firebase Firestore |
| **Community** | Share posts, polls & travel tips | Firebase Firestore |
| **Saved Trips** | Save and edit planned itineraries | Firebase Firestore |
| **Hotel Shortlist** | Bookmark favorite hotels | Firebase Firestore |
| **To-Do List** | Travel checklist with cloud sync | Firebase Firestore |
| **User Profile** | Customizable traveler profiles | Firebase Auth + Firestore |
| **PWA Support** | Installable on mobile & desktop | Service Worker |

---

## 🤖 AI Models & APIs

### Multi-Model Routing System

The backend uses a **feature-aware multi-model routing system** with automatic fallback:

| Feature | Primary Model | Fallback | Last Resort |
|---------|--------------|----------|-------------|
| **Trip Itinerary** | `llama-3.3-70b-versatile` | `mixtral-8x7b-32768` | `llama-3.1-8b-instant` |
| **Hotel Search** | `llama-3.3-70b-versatile` | `qwen/qwen3-32b` | `mixtral-8x7b-32768` |
| **Modify Plan** | `mixtral-8x7b-32768` | `llama-3.1-8b-instant` | Local LLM |
| **Chat Followup** | `mixtral-8x7b-32768` | `llama-3.1-8b-instant` | Local LLM |
| **Budget Estimation** | `qwen/qwen3-32b` | `mixtral-8x7b-32768` | Rule-based |
| **JSON Formatting** | `gemma2-9b-it` | `mixtral-8x7b-32768` | Python formatter |
| **Data Extraction** | `llama-3.1-8b-instant` | `gemma2-9b-it` | Regex parser |

### Reliability Features

- **Rate Limit Prediction**: Skips models near RPM limit before failure
- **Semantic Caching**: 24-hour cache for trip itineraries and hotel searches
- **Graceful Degradation**: Never exposes LLM errors to users
- **Observability**: Full logging of model selection, latency, and fallbacks

The AI generates:
- **Day-by-day itineraries** with morning, afternoon, and evening activities
- **Hotel recommendations** based on destination, budget, and preferences
- **Estimated costs** for activities and accommodations
- **Travel tips** customized for each destination

### External APIs

| API | Provider | Purpose |
|-----|----------|---------|
| Weather | OpenWeatherMap | Real-time weather data |
| Geocoding | Mapbox | Reverse geocoding for location names |
| Authentication | Firebase Auth | Google, Apple & Email/Password login |
| Database | Firebase Firestore | User data, trips, posts, shortlists |
| Storage | Firebase Storage | Profile photos, post images |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│   ┌─────────────┬────────────┬─────────────┬─────────────┐  │
│   │ Trip Planner│Hotel Search│   Weather   │  Community  │  │
│   └──────┬──────┴─────┬──────┴──────┬──────┴──────┬──────┘  │
│          │            │             │             │          │
│          └────────────┴──────┬──────┴─────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                     │
│                    │ Backend API Proxy │                     │
│                    │    (FastAPI)      │                     │
│                    └─────────┬─────────┘                     │
└──────────────────────────────┼───────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Groq API    │    │ OpenWeather  │    │   Mapbox     │
   │ (LLM Model)  │    │     API      │    │  Geocoding   │
   └──────────────┘    └──────────────┘    └──────────────┘
```

### Backend Proxy

All sensitive API calls are routed through a FastAPI backend proxy with intelligent model routing:

| Endpoint | Description | Features |
|----------|-------------|----------|
| `POST /api/completions` | Smart LLM routing | Auto-fallback, caching, rate-limit prediction |
| `POST /api/completions/direct` | Direct LLM proxy | Bypass routing (debug only) |
| `GET /api/weather` | Weather by city/coords | OpenWeatherMap |
| `GET /api/geocode` | Reverse geocoding | Mapbox |
| `GET /api/router/status` | Router health | Rate limits, cache stats |
| `GET /api/router/metrics` | Routing metrics | Latency, fallbacks, errors |
| `GET /api/health` | Health check | API key status |

---

## 📱 App Screens

### 1. **Home / Search** (`/`, `/home`)
- Hero section with Lottie animation
- Destination search to start trip planning
- Quick access to all features

### 2. **AI Trip Planner** (`/plan-trip`)
- Enter destination, dates, budget, and preferences
- AI generates complete day-by-day itinerary
- Save trips to your account
- Start budget tracking from planned trip

**AI Model:** `Groq llama-3.3-70b-versatile`

### 3. **Hotel Search** (`/hotels`)
- Search hotels by destination
- Filter by budget category (Budget/Mid-range/Luxury)
- AI-powered hotel recommendations with ratings
- Shortlist favorite hotels

**AI Model:** `Groq llama-3.3-70b-versatile`

### 4. **Weather** (`/Weather`)
- Search weather by city name
- Auto-detect weather from user location
- Temperature, humidity, wind speed
- Weather icons and conditions

**API:** OpenWeatherMap

### 5. **Saved Trips** (`/saved-trips`)
- View all saved trip itineraries
- Edit day activities
- Delete trips
- Navigate to budget tracker

### 6. **Budget Tracker** (`/budgets`, `/budget/:tripId`)
- Set total trip budget
- Track expenses by category:
  - 🏨 Accommodation
  - 🍽️ Food & Dining
  - 🚗 Transport
  - 🎯 Activities
  - 🛍️ Shopping
  - 📦 Other
- Visual spending breakdown
- Multi-currency support (USD, EUR, INR, etc.)

### 7. **Community** (`/community`)
- Share travel experiences
- Create polls
- Like and comment on posts
- View other travelers' profiles

### 8. **Profile** (`/profile`)
- Customizable profile with photo
- Travel style selection
- Favorite destination
- Countries visited counter

### 9. **To-Do List** (`/Todolist`)
- Create travel checklists
- Cloud-synced across devices
- Mark items complete

### 10. **Shortlist** (`/shortlist`)
- View all bookmarked hotels
- Quick access to favorites
- Remove from shortlist

---

## 🔐 Authentication

Supported login methods:
- **Google Sign-In** (OAuth 2.0)
- **Apple Sign-In** (OAuth 2.0)
- **Email/Password** with verification

All authentication is handled via **Firebase Auth**.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Material Tailwind** - UI components
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lottie** - Animations
- **Mapbox GL** - Maps integration

### Backend
- **FastAPI** - Python API framework
- **httpx** - Async HTTP client
- **python-dotenv** - Environment variables
- **Pydantic** - Data validation

### Services
- **Firebase** - Auth, Firestore, Storage
- **Groq** - LLM inference
- **OpenWeatherMap** - Weather data
- **Mapbox** - Geocoding & maps

---

## 💻 App Showcase
| Desktop-UI | Phone-UI |
|----------|----------|
| ![Desktop-UI-demonstration](https://user-images.githubusercontent.com/74983536/216807229-0cd28563-78d2-423b-bd2a-331222ff94da.gif) | ![Phone-UI-demonstration-video](https://user-images.githubusercontent.com/74983536/216807841-a21b7b0b-1d41-484f-bf45-376553c401bc.gif) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SayantaniDeb/Travellwithus.git
   cd Travellwithus
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment variables**

   Create `.env` in the root directory:
   ```env
   VITE_FIREBASE_API=AIzaSy...your-firebase-api-key
   ```

   Create `backend/.env`:
   ```env
   GROQ_API_KEY=gsk_...your-groq-key
   OPENWEATHER_API_KEY=your-openweather-key
   MAPBOX_ACCESS_TOKEN=pk....your-mapbox-token
   ```

5. **Start the backend server**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

6. **Start the frontend dev server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
Travellwithus/
├── backend/
│   ├── main.py              # FastAPI server with smart routing
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend secrets (not in git)
│   └── ai_router/           # Multi-model routing system
│       ├── router.py        # Main routing logic
│       ├── classifier.py    # Feature classification
│       ├── matrix.py        # Model fallback chains
│       ├── cache.py         # Semantic caching
│       ├── rate_limiter.py  # RPM tracking & prediction
│       ├── features.py      # Feature type definitions
│       └── providers/       # LLM provider implementations
│           ├── groq_provider.py
│           └── local_provider.py
├── public/
│   ├── icons/               # Weather & app icons
│   ├── sw.js                # Service worker for PWA
│   └── site.webmanifest     # PWA manifest
├── src/
│   ├── components/
│   │   ├── TripPlanner.jsx  # AI trip generation
│   │   ├── HotelSearch.jsx  # AI hotel recommendations
│   │   ├── Weather.jsx      # Weather lookup
│   │   ├── BudgetTracker.jsx# Expense tracking
│   │   ├── Community.jsx    # Social features
│   │   ├── Profile.jsx      # User profiles
│   │   ├── SavedTrips.jsx   # Trip management
│   │   ├── Shortlist.jsx    # Hotel bookmarks
│   │   ├── Todolist.jsx     # Travel checklist
│   │   └── ...
│   ├── context/
│   │   └── LocationContext.jsx # Location state management
│   ├── Firebase.jsx         # Firebase configuration
│   ├── RouterPath.jsx       # App routes
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── .env                     # Frontend env vars (VITE_*)
├── package.json
├── vite.config.js           # Vite config with proxy
└── tailwind.config.js
```

---

## 🌐 PWA Features

TravelWithUs is a Progressive Web App:

- ✅ **Installable** on iOS, Android, and desktop
- ✅ **Offline-capable** via service worker
- ✅ **Responsive** design for all screen sizes
- ✅ **Push notifications** ready
- ✅ **App-like experience** with no browser UI

---

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for blazing fast LLM inference
- [Firebase](https://firebase.google.com/) for backend services
- [OpenWeatherMap](https://openweathermap.org/) for weather data
- [Mapbox](https://www.mapbox.com/) for geocoding services
- [LottieFiles](https://lottiefiles.com/) for animations
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Material Tailwind](https://material-tailwind.com/) - Material Design components
- [React](https://react.dev/) - UI library by Meta
- [Unicons](https://iconscout.com/unicons) - Scalable vector icons

---

Built with ❤️ by TravelWithUs Team


