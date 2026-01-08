import React from "react";
import { WeatherIcons } from "../Weather";

const WeatherInfoIcons = {
  sunset: "/icons/temp.svg",
  sunrise: "/icons/temp.svg",
  humidity: "/icons/humidity.svg",
  wind: "/icons/wind.svg",
  pressure: "/icons/pressure.svg",
};

const Location = ({ children }) => (
  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4">
    {children}
  </h2>
);

const Condition = ({ weather }) => (
  <div className="text-center my-4">
    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-600">
      {`${Math.floor(weather?.main?.temp - 273)}°C`}
    </span>
    <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-2 capitalize">
      {weather?.weather[0].description}
    </p>
  </div>
);

const WeatherInfoLabel = ({ label }) => (
  <h3 className="text-base sm:text-lg font-bold text-gray-700 mt-6 mb-3 text-center">
    {label}
  </h3>
);

const WeatherIcon = ({ weather }) => (
  <img
    src={WeatherIcons[weather?.weather[0].icon]}
    alt={weather?.weather[0].description}
    className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto my-4"
  />
);

const WeatherContainer = ({ children }) => (
  <div className="flex flex-wrap justify-center items-center w-full gap-2">
    {children}
  </div>
);

const WeatherInfoComponent = ({ name, value }) => (
  <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-gray-50 rounded-lg min-w-[70px] sm:min-w-[80px]">
    <img 
      src={WeatherInfoIcons[name]} 
      alt={name} 
      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" 
    />
    <span className="text-xs sm:text-sm text-gray-500 capitalize mt-1">{name}</span>
    <span className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{value}</span>
  </div>
);

const WeatherComponent = ({ weather }) => {
  const isDay = weather?.weather[0].icon?.includes("d");
  const getTime = (timeStamp) => {
    return `${new Date(timeStamp * 1000).getHours()}:${String(new Date(timeStamp * 1000).getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <Location>{`${weather?.name}, ${weather?.sys?.country}`}</Location>
      <WeatherContainer>
        <WeatherIcon weather={weather} />
      </WeatherContainer>
      <Condition weather={weather} />
      <WeatherInfoLabel label="Weather Details" />
      <WeatherContainer>
        <WeatherInfoComponent
          name={isDay ? "sunset" : "sunrise"}
          value={`${getTime(weather?.sys[isDay ? "sunset" : "sunrise"])}`}
        />
        <WeatherInfoComponent name={"humidity"} value={`${weather?.main?.humidity}%`} />
        <WeatherInfoComponent name={"wind"} value={`${weather?.wind?.speed} m/s`} />
        <WeatherInfoComponent name={"pressure"} value={`${weather?.main?.pressure} hPa`} />
      </WeatherContainer>
    </div>
  );
};

export default WeatherComponent;
