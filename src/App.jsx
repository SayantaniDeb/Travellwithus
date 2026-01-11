import React from "react";
import RouterPath from "./RouterPath";
import { LocationProvider } from "./context/LocationContext";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

function App() {
  return (
    <LocationProvider>
      <RouterPath />
      <PWAInstallPrompt />
    </LocationProvider>
  );
}

export default App;
