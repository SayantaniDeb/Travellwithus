import React from "react";
import { ProfileProvider, useProfileIdentity } from "./context/ProfileContext";
import { WeatherProvider } from "./context/WeatherContext";
import RouterPath from "./RouterPath";
import { LocationProvider } from "./context/LocationContext";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

function WeatherSession({ children }) {
  const { user } = useProfileIdentity();
  return <WeatherProvider user={user}>{children}</WeatherProvider>;
}

function App() {
  return (
    <LocationProvider>
      <ProfileProvider><WeatherSession><RouterPath /></WeatherSession></ProfileProvider>
      <PWAInstallPrompt />
    </LocationProvider>
  );
}

export default App;
