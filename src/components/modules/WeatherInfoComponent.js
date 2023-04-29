import React from "react";
import { WeatherIcons } from "../Weather";
import { Navbar } from "@material-tailwind/react";

const WeatherInfoIcons = {
  sunset: "/icons/temp.svg",
  sunrise: "/icons/temp.svg",
  humidity: "/icons/humidity.svg",
  wind: "/icons/wind.svg",
  pressure: "/icons/pressure.svg",
};

const Location = () => (
  <span className="block text-4xl font-bold capitalize"></span>
);

const Condition = ({ weather }) => (
  <span className="block text-center text-xl capitalize my-5">
    <span className="text-4xl font-bold">
      {`${Math.floor(weather?.main?.temp - 273)}°C`}
    </span>
    {` | ${weather?.weather[0].description}`}
  </span>
);

const WeatherInfoLabel = ({ label }) => (
  <span className="block text-xl font-bold capitalize mt-10">{label}</span>
);

const WeatherIcon = ({ weather }) => (
  <img
    src={WeatherIcons[weather?.weather[0].icon]}
    alt={weather?.weather[0].description}
    className="w-40 h-40 mx-auto my-10"
  />
);

const WeatherContainer = ({ children }) => (
  <div className="flex flex-wrap justify-between items-center w-full">
    {children}
  </div>
);

const WeatherInfoComponent = ({ name, value }) => (
  <div className="flex flex-col items-center justify-center m-5">
    <img src={WeatherInfoIcons[name]} alt={name} className="w-16 h-16" />
    <span className="text-sm font-bold capitalize">{name}</span>
    <span className="text-xl font-bold">{value}</span>
  </div>
);

const WeatherComponent = ({ weather }) => {
  const isDay = weather?.weather[0].icon?.includes("d");
  const getTime = (timeStamp) => {
    return `${new Date(timeStamp * 1000).getHours()} : ${new Date(
      timeStamp * 1000
    ).getMinutes()}`;
  };

  return (
    <>
    
      <WeatherContainer>
        <Condition weather={weather} />
        <WeatherIcon weather={weather} />
      </WeatherContainer>
      <Location>{`${weather?.name}, ${weather?.sys?.country}`}</Location>
      <WeatherInfoLabel label="Weather Info" />
      <WeatherContainer>
        <WeatherInfoComponent
          name={isDay ? "sunset" : "sunrise"}
          value={`${getTime(weather?.sys[isDay ? "sunset" : "sunrise"])}`}
        />
        <WeatherInfoComponent name={"humidity"} value={weather?.main?.humidity} />
        <WeatherInfoComponent name={"wind"} value={weather?.wind?.speed} />
        <WeatherInfoComponent name={"pressure"} value={weather?.main?.pressure} />
      </WeatherContainer>
    </>
  );
};

export default WeatherComponent;
