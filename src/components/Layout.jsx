import CreditBadge from './CreditBadge';
import DeviceSaveNotice from './DeviceSaveNotice';

import NavigationLoading, { LoadingOverlay } from './NavigationLoading';
import React, { Suspense } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import LocationPermissionModal from './LocationPermissionModal';

export default function Layout() {
  const location = useLocation();
  // Guests can reach device trips and hotel search too.
  const showBottomNav = location.pathname !== '/login';
  return (
    <div className={showBottomNav ? 'pb-16 sm:pb-18 md:pb-20 lg:pb-0' : ''}>
      <ScrollRestoration />
      <NavigationLoading />
        <Suspense fallback={<LoadingOverlay/>}>
          <Outlet />
        </Suspense>
      <LocationPermissionModal />
      <DeviceSaveNotice />
      <CreditBadge />
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
