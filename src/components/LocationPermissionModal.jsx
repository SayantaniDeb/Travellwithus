import React from 'react';
import { useLocation } from '../context/LocationContext';

const LocationPermissionModal = () => {
  const { showPermissionModal, requestLocation, dismissModal, loading } = useLocation();

  if (!showPermissionModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform animate-slideUp">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
          Enable Location
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-center text-sm mb-6">
          Allow us to access your location for personalized route suggestions, nearby services, and weather updates.
        </p>

        {/* Benefits */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-green-500">✓</span>
            <span>Get directions from your current location</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-green-500">✓</span>
            <span>Find nearby hotels & automobiles</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-green-500">✓</span>
            <span>Local weather information</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Getting Location...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>Allow Location Access</span>
              </>
            )}
          </button>
          <button
            onClick={dismissModal}
            className="w-full py-3 px-4 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Your location is stored locally and never shared.
        </p>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
