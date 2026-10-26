import LoadingSpinner from './components/LoadingSpinner';
// ...existing code...
import { Navigate, createBrowserRouter, RouterProvider, Route, createRoutesFromElements } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
const LoginForm = lazy(() => import('./components/LoginForm'));
const HotelSearch = lazy(() => import('./components/HotelSearch'));
import Layout from './components/Layout';
import Section from './components/Section';
const Todolist = lazy(() => import('./components/Todolist'));
const CityComponent = lazy(() => import('./components/modules/CityComponent'));
const TripPlanner = lazy(() => import('./components/TripPlanner'));
const SavedTrips = lazy(() => import('./components/SavedTrips'));
const BudgetTracker = lazy(() => import('./components/BudgetTracker'));
const BudgetList = lazy(() => import('./components/BudgetList'));
const Community = lazy(() => import('./components/Community'));
const Profile = lazy(() => import('./components/Profile'));



const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Both / and /home show the dashboard (Section) */}
      <Route element={<Layout/>}>
        <Route path="/" element={<Section/>}/>
        <Route path="/home" element={<Section/>}/>
        <Route path="/City" element={<CityComponent/>}/>
        <Route path="/Weather" element={<Navigate to="/home?weather=1" replace />}/>
        <Route path="/Todolist" element={<Todolist/>}/>
        <Route path="/hotels" element={<HotelSearch/>}/>
        <Route path="/shortlist" element={<Navigate to="/hotels?saved=1" replace />}/>
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><LoadingSpinner label="Opening your next stop…"/></div>}><RouterProvider router={router} future={{ v7_startTransition: true }} /></Suspense>
  );
}

export default RouterPath;