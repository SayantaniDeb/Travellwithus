import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);

  // Check if we already have location stored
  useEffect(() => {
    const storedLocation = localStorage.getItem('userLocation');
    const storedLocationName = localStorage.getItem('userLocationName');
    const permissionWasAsked = localStorage.getItem('locationPermissionAsked');

    if (storedLocation) {
      setLocation(JSON.parse(storedLocation));
      setLocationName(storedLocationName || '');
    }

    if (permissionWasAsked) {
      setPermissionAsked(true);
    } else {
      // Show permission modal after a short delay on first visit
      const timer = setTimeout(() => {
        const isLoggedIn = localStorage.getItem('email');
        if (isLoggedIn && !storedLocation) {
          setShowPermissionModal(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Reverse geocode to get location name
  const getLocationName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_ACCESSTOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        // Get city or locality name
        const place = data.features.find(f => 
          f.place_type.includes('place') || 
          f.place_type.includes('locality')
        ) || data.features[0];
        return place.text || place.place_name?.split(',')[0] || 'Unknown';
      }
      return 'Unknown Location';
    } catch (err) {
      console.error('Error getting location name:', err);
      return 'Unknown Location';
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    setShowPermissionModal(false);
    localStorage.setItem('locationPermissionAsked', 'true');
    setPermissionAsked(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setLocation(newLocation);
      localStorage.setItem('userLocation', JSON.stringify(newLocation));

      // Get location name
      const name = await getLocationName(newLocation.latitude, newLocation.longitude);
      setLocationName(name);
      localStorage.setItem('userLocationName', name);

    } catch (err) {
      console.error('Error getting location:', err);
      if (err.code === 1) {
        setError('Location permission denied');
      } else if (err.code === 2) {
        setError('Location unavailable');
      } else if (err.code === 3) {
        setError('Location request timed out');
      } else {
        setError('Failed to get location');
      }
    } finally {
      setLoading(false);
    }
  };

  const dismissModal = () => {
    setShowPermissionModal(false);
    localStorage.setItem('locationPermissionAsked', 'true');
    setPermissionAsked(true);
  };

  const clearLocation = () => {
    setLocation(null);
    setLocationName('');
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationName');
  };

  const value = {
    location,
    locationName,
    loading,
    error,
    showPermissionModal,
    permissionAsked,
    requestLocation,
    dismissModal,
    clearLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
