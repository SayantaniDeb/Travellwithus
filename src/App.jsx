import React from "react";
import RouterPath from "./RouterPath";
import { LocationProvider } from "./context/LocationContext";

function App() {
  return (
    <LocationProvider>
      <RouterPath />
    </LocationProvider>
  );
}

export default App;
