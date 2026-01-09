import { Fragment, React, useState, useEffect } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon, ArrowRightOnRectangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@material-tailwind/react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../Firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useLocation } from '../context/LocationContext'
import {
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  WalletIcon,
  ClipboardDocumentListIcon,
  CloudIcon,
  MapPinIcon,
  TruckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/home', current: true },
  { name: 'My Trips', href: '/saved-trips', current: false },
  { name: 'Community', href: '/community', current: false },
  { name: 'Budget', href: '/budgets', current: false },
  { name: 'List', href: '/Todolist', current: false },
  { name: 'Weather', href: '/Weather', current: false },
  { name: 'Routes', href: '/Journeypath', current: false },
  { name: 'Automobiles', href: '/Automobile', current: false },
  { name: 'Homestays', href: '/Homestay', current: false },
]

const navIcons = [
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  WalletIcon,
  ClipboardDocumentListIcon,
  CloudIcon,
  MapPinIcon,
  TruckIcon,
  BuildingOfficeIcon
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Location Badge Component
function LocationBadge() {
  const { location, locationName, loading, requestLocation, clearLocation } = useLocation();
  const [showPopup, setShowPopup] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="hidden sm:inline">Locating...</span>
      </div>
    );
  }

  if (location && locationName) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPopup(!showPopup)}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-full text-xs text-blue-700 max-w-[80px] sm:max-w-[120px] transition-colors"
        >
          <MapPinIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate text-[10px] sm:text-xs">{locationName}</span>
        </button>

        {/* Location popup */}
        {showPopup && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPopup(false)}
            />
            {/* Popup */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs text-gray-500">Current Location</p>
                <p className="text-sm font-medium text-gray-800 truncate">{locationName}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    requestLocation();
                    setShowPopup(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Location
                </button>
                <button
                  onClick={() => {
                    clearLocation();
                    setShowPopup(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove Location
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={requestLocation}
      className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
    >
      <MapPinIcon className="w-3 h-3" />
      <span className="hidden sm:inline">Set Location</span>
    </button>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const [userPhoto, setUserPhoto] = useState(null);
  const [userName, setUserName] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Fetch user profile photo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // First set Google photo as default
        setUserPhoto(user.photoURL);
        setUserName(user.displayName || user.email?.split('@')[0] || '');
        // Then try to get custom photo from Firestore
        try {
          const profileRef = doc(db, 'user_profiles', user.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.photoURL) {
              setUserPhoto(data.photoURL);
            }
            if (data.displayName) {
              setUserName(data.displayName);
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Get initials for avatar
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <Disclosure as="nav" className="bg-white fixed top-0 z-50 w-full shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-14 sm:h-16 items-center justify-between">
              {/* Logo - left aligned on mobile, with text on desktop */}
              <div className="flex flex-1 items-center justify-start sm:items-stretch sm:justify-start">
                <NavLink to="/home" className="flex flex-shrink-0 items-center gap-1 md:mr-8">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 md:w-6 md:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                  </svg>
                  <span className='hidden md:inline font-bold font-serif text-lg md:text-2xl'>Travel With Us</span>
                </NavLink>
                {/* Desktop navigation - hidden on mobile */}
                <div className="hidden md:flex flex-1 items-center justify-center space-x-4">
                  {/* Navigation Icons with Labels */}
                  {navigation.map((item, idx) => {
                    const Icon = navIcons[idx];
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          classNames(
                            isActive ? 'bg-gray-900 text-white' : 'text-black hover:bg-gray-700 hover:text-white',
                            'flex flex-col items-center justify-center px-2 py-1 rounded-md text-xs font-medium transition-colors min-w-[48px]'
                          )
                        }
                      >
                        <Icon className="w-5 h-5 mb-0.5" />
                        <span className="hidden md:inline-block text-[10px] leading-tight">{item.name}</span>
                      </NavLink>
                    );
                  })}
                  {/* Location Badge */}
                  <div className="flex flex-col items-center justify-center px-2 py-1">
                    <LocationBadge />
                  </div>
                  {/* Profile Icon */}
                  <NavLink 
                    to="/profile" 
                    className="flex flex-col items-center justify-center px-2 py-1 rounded-full transition-all hover:ring-2 hover:ring-blue-400"
                    title="Profile"
                  >
                    {userPhoto ? (
                      <img 
                        src={userPhoto} 
                        alt={userName} 
                        className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs md:text-sm border-2 border-white shadow-sm">
                        {getInitials(userName)}
                      </div>
                    )}
                  </NavLink>
                  {/* Sign Out Icon */}
                  <button onClick={() => setShowLogoutConfirm(true)} className="flex flex-col items-center justify-center px-2 py-1 rounded-full bg-gray-900 text-white">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
                {/* Mobile navigation row - visible only on mobile */}
                <div className="flex md:hidden flex-1 items-center justify-end gap-2">
                  <LocationBadge />
                  {/* Profile Icon for mobile */}
                  <NavLink 
                    to="/profile" 
                    className="flex items-center px-2 py-1 rounded-full transition-all hover:ring-2 hover:ring-blue-400"
                    title="Profile"
                  >
                    {userPhoto ? (
                      <img 
                        src={userPhoto} 
                        alt={userName} 
                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs border-2 border-white shadow-sm">
                        {getInitials(userName)}
                      </div>
                    )}
                  </NavLink>
                  <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center px-2 py-1 rounded-full bg-gray-900 text-white">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Logout confirmation popup */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xs w-full text-center">
                <h2 className="text-lg font-semibold mb-3 text-zinc-800">Are you sure?</h2>
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={logout}
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
        </>
      )}
    </Disclosure>
  );
}
