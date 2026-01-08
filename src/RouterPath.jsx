import React from 'react'
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements } from "react-router-dom";
import Automobile from "./components/Automobile";
import Homestay from "./components/Homestay";
import JourneyPath from "./components/Journeypath";
import LoginForm from './components/LoginForm';
import Section from "./components/Section";
import Todolist from "./components/Todolist";
import Weather from './components/Weather';
import CityComponent from './components/modules/CityComponent';
import Layout from './components/Layout';
import TripPlanner from './components/TripPlanner';
import SavedTrips from './components/SavedTrips';
import BudgetTracker from './components/BudgetTracker';
import BudgetList from './components/BudgetList';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LoginForm/>}/>
      <Route element={<Layout/>}>
        <Route path="/home" element={<Section/>}/>
        <Route path="/City" element={<CityComponent/>}/>
        <Route path="/Weather" element={<Weather/>}/>
        <Route path="/Todolist" element={<Todolist/>}/>
        <Route path="/Automobile" element={<Automobile/>}/>
        <Route path="/Homestay" element={<Homestay/>}/>
        <Route path="/Journeypath" element={<JourneyPath/>}/>
        <Route path="/plan-trip" element={<TripPlanner/>}/>
        <Route path="/saved-trips" element={<SavedTrips/>}/>
        <Route path="/budgets" element={<BudgetList/>}/>
        <Route path="/budget/:tripId" element={<BudgetTracker/>}/>
      </Route>
    </>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function RouterPath() {
  return <RouterProvider router={router} />
}

export default RouterPath