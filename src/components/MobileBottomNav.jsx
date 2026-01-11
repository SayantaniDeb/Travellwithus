import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut } from 'firebase/auth';
import { auth } from '../Firebase';
import { useLocation as useGeoLocation } from '../context/LocationContext';
import { 
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  WalletIcon,
  CloudIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  EllipsisHorizontalIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const mobileNavItems = [
  { name: 'Home', href: '/home', icon: HomeIcon },
  { name: 'Trips', href: '/saved-trips', icon: CalendarDaysIcon },
  { name: 'Community', href: '/community', icon: ChatBubbleLeftRightIcon },
 
  { name: 'Budget', href: '/budgets', icon: WalletIcon },
  { name: 'More', href: null, icon: EllipsisHorizontalIcon, isDropup: true },
];

const moreItems = [
  { name: 'Weather', href: '/Weather', icon: CloudIcon },
  { name: 'Todo List', href: '/Todolist', icon: ClipboardDocumentListIcon },
  { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon },
  { name: 'Shortlist', href: '/shortlist', icon: HeartIcon },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
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
      {/* More dropdown */}
      {showMore && (
        <div 
          className="sm:hidden fixed bottom-16 right-0 z-50 bg-white/95 backdrop-blur-md rounded-t-xl shadow-lg border border-gray-200 w-40"
          onClick={() => setShowMore(false)}
        >
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}

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

      {/* Backdrop for more menu */}
      {showMore && (
        <div 
          className="sm:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 px-1">
          {mobileNavItems.map((item, index) => {
            if (item.isDropup) {
              // More button
              const isMoreActive = moreItems.some(m => location.pathname === m.href);
              const MoreIcon = item.icon;
              return (
                <button
                  key="more"
                  onClick={() => setShowMore(!showMore)}
                  className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                    isMoreActive || showMore ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div className={`p-1.5 rounded-full transition-colors ${isMoreActive ? 'bg-blue-100' : ''}`}>
                    <MoreIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] mt-0.5 font-medium ${isMoreActive ? 'text-blue-600' : ''}`}>
                    More
                  </span>
                </button>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-blue-100' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-blue-600' : ''}`}>
                      {item.name}
                    </span>
                  </>
                )}
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
