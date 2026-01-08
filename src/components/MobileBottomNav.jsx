import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  UilCloudSun, 
  UilMapMarkerAlt, 
  UilCar, 
  UilHome,
  UilListUl,
  UilEstate,
  UilCalendarAlt,
  UilWallet
} from '@iconscout/react-unicons';

const mobileNavItems = [
  { name: 'Home', href: '/home', icon: UilEstate },
  { name: 'Trips', href: '/saved-trips', icon: UilCalendarAlt },
  { name: 'Budget', href: '/budgets', icon: UilWallet },
  { name: 'Routes', href: '/Journeypath', icon: UilMapMarkerAlt },
  { name: 'More', href: null, icon: null, isDropup: true },
];

const moreItems = [
  { name: 'Weather', href: '/Weather', icon: UilCloudSun },
  { name: 'Todo List', href: '/Todolist', icon: UilListUl },
  { name: 'Cars', href: '/Automobile', icon: UilCar },
  { name: 'Stays', href: '/Homestay', icon: UilHome },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [showMore, setShowMore] = React.useState(false);

  return (
    <>
      {/* More dropdown */}
      {showMore && (
        <div 
          className="sm:hidden fixed bottom-16 right-0 z-50 bg-white rounded-t-xl shadow-lg border border-gray-200 w-32"
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

      {/* Backdrop for more menu */}
      {showMore && (
        <div 
          className="sm:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setShowMore(false)}
        />
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 px-1">
          {mobileNavItems.map((item, index) => {
            if (item.isDropup) {
              // More button
              const isMoreActive = moreItems.some(m => location.pathname === m.href);
              return (
                <button
                  key="more"
                  onClick={() => setShowMore(!showMore)}
                  className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                    isMoreActive || showMore ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div className={`p-1.5 rounded-full transition-colors ${isMoreActive ? 'bg-blue-100' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
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
