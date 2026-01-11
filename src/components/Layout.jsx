
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import LocationPermissionModal from './LocationPermissionModal';
import { onAuthStateChanged } from 'firebase/auth';
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
    <>
      <Outlet />
      <LocationPermissionModal />
      {showBottomNav && <MobileBottomNav />}
    </>
  );
}
