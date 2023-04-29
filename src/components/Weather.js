import axios from "axios";
import { useState } from "react";
import CityComponent from "./modules/CityComponent";
import WeatherComponent from "./modules/WeatherInfoComponent";
import Navbar from "./Navbar";
import { Button } from "@material-tailwind/react";
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
  const [city, updateCity] = useState();
  const [weather, updateWeather] = useState();

  const fetchWeather = async (e) => {
    e.preventDefault();
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
    );
    console.log(response);
    updateWeather(response.data);
  };

  const handleBackClick = () => {
    updateWeather(null);
  };

  return (
    <div className="flex flex-col items-center mx-auto box-shadow p-6 rounded-lg w-80 bg-white font-Montserrat">
      <Navbar />
      <span className="text-black font-bold text-lg mb-4">
        React Weather App
      </span>
      {weather ? (
        <div>
          <WeatherComponent weather={weather} />
          <Button onClick={handleBackClick}>Back</Button>
        </div>
      ) : (
        <CityComponent updateCity={updateCity} fetchWeather={fetchWeather} />
      )}
    </div>
  );
}

export default Weather;
