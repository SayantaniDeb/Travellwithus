import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut } from 'firebase/auth';
import { auth } from '../Firebase';
import { useLocation as useGeoLocation } from '../context/LocationContext';
import { 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CurrencyDollarIcon,
  CloudIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

// All nav items in one array - no more dropdown needed
const mobileNavItems = [
  { name: 'Search', href: '/home', icon: MagnifyingGlassIcon },
  { name: 'Trips', href: '/saved-trips', icon: CalendarDaysIcon },
  { name: 'Community', href: '/community', icon: ChatBubbleLeftRightIcon },
  { name: 'Budget', href: '/budgets', icon: CurrencyDollarIcon },
  { name: 'Weather', href: '/Weather', icon: CloudIcon },
  { name: 'Todo', href: '/Todolist', icon: ClipboardDocumentListIcon },
  { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon },
  { name: 'Shortlist', href: '/shortlist', icon: HeartIcon },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const geo = useGeoLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Logout confirmation popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 max-w-xs w-full text-center">
            <h2 className="text-lg font-semibold mb-3 text-zinc-800">Are you sure?</h2>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium shadow hover:bg-red-700 transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg font-medium shadow hover:bg-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-between items-center h-12 px-3 sm:px-6 md:px-10 sm:h-14 md:h-16 max-w-2xl mx-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center justify-center p-2 rounded-full transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
              </NavLink>
            );
          })}
        </div>
        {/* Safe area for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>
    </>
  );
}
