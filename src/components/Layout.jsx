import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import LocationPermissionModal from './LocationPermissionModal';

export default function Layout() {
  const location = useLocation();
  // Don't show bottom nav on login page
  const showBottomNav = location.pathname !== '/';
  return (
    <>
      <Outlet />
      <LocationPermissionModal />
      {showBottomNav && <MobileBottomNav />}
    </>
  );
}
