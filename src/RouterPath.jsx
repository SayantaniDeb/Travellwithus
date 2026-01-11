// ...existing code...
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import LoginForm from './components/LoginForm';
import HotelSearch from './components/HotelSearch';
import Layout from './components/Layout';
import Section from './components/Section';
import Todolist from './components/Todolist';
import Weather from './components/Weather';
import CityComponent from './components/modules/CityComponent';
import TripPlanner from './components/TripPlanner';
import SavedTrips from './components/SavedTrips';
import BudgetTracker from './components/BudgetTracker';
import BudgetList from './components/BudgetList';
import Community from './components/Community';
import Profile from './components/Profile';
import Shortlist from './components/Shortlist';



const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Both / and /home show the dashboard (Section) */}
      <Route element={<Layout/>}>
        <Route path="/" element={<Section/>}/>
        <Route path="/home" element={<Section/>}/>
        <Route path="/City" element={<CityComponent/>}/>
        <Route path="/Weather" element={<Weather/>}/>
        <Route path="/Todolist" element={<Todolist/>}/>
        <Route path="/hotels" element={<HotelSearch/>}/>
        <Route path="/shortlist" element={<Shortlist/>}/>
        <Route path="/plan-trip" element={<TripPlanner/>}/>
        <Route path="/saved-trips" element={<SavedTrips/>}/>
        <Route path="/budgets" element={<BudgetList/>}/>
        <Route path="/budget/:tripId" element={<BudgetTracker/>}/>
        <Route path="/community" element={<Community/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/login" element={<LoginForm/>}/>
        <Route path="*" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1><p className="text-gray-600">Page not found</p></div></div>}/>
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
  return (
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  );
}

export default RouterPath;