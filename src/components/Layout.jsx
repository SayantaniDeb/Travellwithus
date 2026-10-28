
import NavigationLoading, { LoadingOverlay } from './NavigationLoading';
import React, { Suspense } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import LocationPermissionModal from './LocationPermissionModal';
import { useProfileIdentity } from '../context/ProfileContext';

export default function Layout() {
  const location = useLocation();
  const { user } = useProfileIdentity();
  // Don't show bottom nav on login page, or if not logged in
  const showBottomNav = user && location.pathname !== '/login';
  return (
    <div className={showBottomNav ? 'pb-16 sm:pb-18 md:pb-20 lg:pb-0' : ''}>
      <ScrollRestoration />
      <NavigationLoading />
        <Suspense fallback={<LoadingOverlay/>}>
          <Outlet />
        </Suspense>
      <LocationPermissionModal />
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
