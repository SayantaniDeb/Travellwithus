import axios from "axios";
import { useState, useEffect } from "react";
import CityComponent from "./modules/CityComponent";
import WeatherComponent from "./modules/WeatherInfoComponent";
import Navbar from "./Navbar";
import Bottom from "./bottomfoot";
import { Button } from "@material-tailwind/react";
import { useLocation } from "../context/LocationContext";

const API_KEY = 'dd16b6763c687a83382a2fdcd46ddaab';

export const WeatherIcons = {
  "01d": "/icons/sunny.svg",
  "01n": "/icons/night.svg",
  "02d": "/icons/day.svg",
  "02n": "/icons/cloudy-night.svg",
  "03d": "/icons/cloudy.svg",
  "03n": "/icons/cloudy.svg",
  "04d": "/icons/perfect-day.svg",
  "04n": "/icons/cloudy-night.svg",
  "09d": "/icons/rain.svg",
  "09n": "/icons/rain-night.svg",
  "10d": "/icons/rain.svg",
  "10n": "/icons/rain-night.svg",
  "11d": "/icons/storm.svg",
  "11n": "/icons/storm.svg",
};

function Weather() {
  const [city, updateCity] = useState("");
  const [weather, updateWeather] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoLoaded, setAutoLoaded] = useState(false);
  
  const { location, locationName, loading: locationLoading } = useLocation();

  // Auto-fetch weather based on user's location
  useEffect(() => {
    const fetchWeatherByCoords = async () => {
      if (location && !autoLoaded && !weather) {
        setLoading(true);
        setError(null);
        try {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${API_KEY}`
          );
          updateWeather(response.data);
          setAutoLoaded(true);
        } catch (err) {
          console.error('Failed to fetch weather by location:', err);
        }
        setLoading(false);
      }
    };

    fetchWeatherByCoords();
  }, [location, autoLoaded, weather]);

  const fetchWeather = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
      );
      updateWeather(response.data);
    } catch (err) {
      setError('City not found. Please try again.');
    }
    setLoading(false);
  };

  const handleBackClick = () => {
    updateWeather(null);
    setError(null);
    updateCity("");
  };

  // Show loading state while fetching location-based weather
  const isInitialLoading = locationLoading || (location && !autoLoaded && loading);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100 pb-16 sm:pb-0">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 py-8 mt-16 sm:mt-20">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">
            🌤️ Weather App
          </h2>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm sm:text-base text-center">
              {error}
            </div>
          )}

          {/* Initial loading for location-based weather */}
          {isInitialLoading && !weather && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">
                Getting weather for your location...
              </p>
            </div>
          )}
          
          {weather ? (
            <div className="text-center">
              {/* Show location badge if auto-loaded */}
              {autoLoaded && locationName && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full text-xs sm:text-sm text-blue-700 mb-3">
                  📍 {locationName}
                </div>
              )}
              <WeatherComponent weather={weather} />
              <Button 
                onClick={handleBackClick}
                className="mt-4 sm:mt-6 w-full sm:w-auto px-6 py-2 sm:py-3"
              >
                Search Another City
              </Button>
            </div>
          ) : !isInitialLoading && (
            <CityComponent 
              updateCity={updateCity} 
              fetchWeather={fetchWeather}
              loading={loading}
              city={city}
            />
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <Bottom />
      </div>
    </div>
  );
}

export default Weather;
