import React from 'react'
import { BrowserRouter,Route,Routes } from "react-router-dom";
import Automobile from "./components/Automobile";
import Homestay from "./components/Homestay";
import JourneyPath from "./components/Journeypath";
import LoginForm from './components/LoginForm';
import Section from "./components/Section";
import Todolist from "./components/Todolist";
import Weather from './components/Weather';
import CityComponent from './components/modules/CityComponent';

function RouterPath() {
  return (
    
     <BrowserRouter>
    <Routes>
    <Route exact path="/" element={<LoginForm/>}/>
      <Route exact path="/" element={<Section/>}/>
      <Route exact path="/City" element={<CityComponent/>}/>
      <Route path="/Weather" element={<Weather/>}/>
       <Route path="/Todolist" element={<Todolist/>}/>
       <Route path="/Automobile" element={<Automobile/>}/>
       <Route path="/Homestay" element={<Homestay/>}/>
       <Route path="/Journeypath" element={<JourneyPath/>}/>
    </Routes>
    </BrowserRouter>
    
  )
}

export default RouterPath