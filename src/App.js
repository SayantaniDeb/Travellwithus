import React from "react";
import { BrowserRouter,Route,Routes } from "react-router-dom";
import Automobile from "./components/Automobile";
import Homestay from "./components/Homestay";
import JourneyPath from "./components/Journeypath";
import Navbar from "./components/Navbar";
import Section from "./components/Section";
import Todolist from "./components/Todolist";
function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route exact path="/" element={<Section/>}/>
       <Route path="/Todolist" element={<Todolist/>}/>
       <Route path="/Automobile" element={<Automobile/>}/>
       <Route path="/Homestay" element={<Homestay/>}/>
       <Route path="/Journeypath" element={<JourneyPath/>}/>
    </Routes>
    </BrowserRouter>

    // <div>
    //   <Navbar />
    //   <Section/>
    // </div>
  );
}

export default App;
