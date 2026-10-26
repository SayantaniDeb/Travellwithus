
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { WeatherProvider } from '../context/WeatherContext';
import MobileBottomNav from './MobileBottomNav';
import LocationPermissionModal from './LocationPermissionModal';
import { onAuthStateChanged } from '../Firebase';
import { auth } from '../Firebase';

export default function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);
  // Don't show bottom nav on login page, or if not logged in
  const showBottomNav = user && location.pathname !== '/login';
  return (
    <div className={showBottomNav ? 'pb-16 sm:pb-18 md:pb-20 lg:pb-0' : ''}>
      <ScrollRestoration />
      <WeatherProvider user={user}><Outlet /></WeatherProvider>
      <LocationPermissionModal />
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
