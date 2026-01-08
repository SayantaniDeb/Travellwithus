import { Fragment, React, useState } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { NavLink, useNavigate } from 'react-router-dom'
import { UilNotes, UilSignout, UilMapMarker } from '@iconscout/react-unicons'
import { Button } from '@material-tailwind/react'
import { signOut } from 'firebase/auth'
import { auth } from '../Firebase'
import { useLocation } from '../context/LocationContext'

const navigation = [
  { name: 'Dashboard', href: '/home', current: true },
  { name: 'My Trips', href: '/saved-trips', current: false },
  { name: 'Budget', href: '/budgets', current: false },
  { name: 'List', href: '/Todolist', current: false },
  { name: 'Weather', href: '/Weather', current: false },
  { name: 'Routes', href: '/Journeypath', current: false },
  { name: 'Automobiles', href: '/Automobile', current: false },
  { name: 'Homestays', href: '/Homestay', current: false },
]

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
          <UilMapMarker className="w-3 h-3 flex-shrink-0" />
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
      <UilMapMarker className="w-3 h-3" />
      <span className="hidden sm:inline">Set Location</span>
    </button>
  );
}

export default function Navbar() {
  const navigate = useNavigate();

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
  }

  return (
    <Disclosure as="nav" className="bg-white top fixed top-0 z-50 w-full shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-14 sm:h-16 items-center justify-between">
              {/* Logo - left aligned on mobile, with text on desktop */}
              <div className="flex flex-1 items-center justify-start sm:items-stretch sm:justify-start">
                <NavLink to="/home" className="flex flex-shrink-0 items-center gap-1 sm:mr-8">
                  <UilNotes className="w-6 h-6 sm:w-6 sm:h-6" />
                  <span className='hidden sm:inline font-bold font-serif text-lg sm:text-2xl'>Travel With Us</span>
                </NavLink>
                {/* Desktop navigation - hidden on mobile */}
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) => classNames(
                          isActive ? 'bg-gray-900 text-white' : 'text-black hover:bg-gray-700 hover:text-white',
                          'px-3 py-2 rounded-md text-sm font-medium transition-colors'
                        )}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                {/* Location Badge */}
                <LocationBadge />
                <Button onClick={logout} className="bg-gray-900 rounded-full p-2 sm:p-2.5"><UilSignout className="w-4 h-4 sm:w-5 sm:h-5"/></Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Disclosure>
  )
}
