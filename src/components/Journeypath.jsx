import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Bottom from './bottomfoot';
import Navbar from './Navbar';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import './Journeypath.css'

// Set access token for Vite
mapboxgl.accessToken = import.meta.env.VITE_ACCESSTOKEN;

function Journeypath() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const directionsRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [destinationName, setDestinationName] = useState(null);

  // Get destination from URL params (from TripPlanner)
  const destLat = searchParams.get('lat');
  const destLng = searchParams.get('lng');
  const destName = searchParams.get('name');

  useEffect(() => {
    if (mapRef.current) return; // Map already initialized

    // Default center (will be updated if geolocation works)
    let center = [77.5946, 12.9716]; // Default: Bangalore
    let zoom = 12;

    // If destination is provided, center on it
    if (destLat && destLng) {
      center = [parseFloat(destLng), parseFloat(destLat)];
      zoom = 14;
      setDestinationName(destName);
    }

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom
    });

    mapRef.current = map;

    // Add navigation control
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add directions control with input fields
    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving-traffic',
      interactive: true,
      controls: {
        inputs: true,
        instructions: true,
        profileSwitcher: true
      },
      placeholderOrigin: 'Enter starting point',
      placeholderDestination: 'Enter destination'
    });

    directionsRef.current = directions;
    map.addControl(directions, 'top-left');

    // Try to get user's location and set as origin
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Set user location as origin
        directions.setOrigin([longitude, latitude]);
        
        // Add marker for current location
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup().setHTML('<b>Your Location</b>'))
          .addTo(map);

        // If destination provided from URL, set it and calculate route
        if (destLat && destLng) {
          const destCoords = [parseFloat(destLng), parseFloat(destLat)];
          directions.setDestination(destCoords);
          
          // Add destination marker
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat(destCoords)
            .setPopup(new mapboxgl.Popup().setHTML(`<b>${destName || 'Destination'}</b>`))
            .addTo(map);

          // Fit map to show both origin and destination
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([longitude, latitude]);
          bounds.extend(destCoords);
          map.fitBounds(bounds, { padding: 100 });
        } else {
          map.flyTo({ center: [longitude, latitude], zoom: 14 });
        }
      },
      (error) => {
        console.log('Geolocation not available:', error.message);
        
        // If no geolocation but destination provided, still set destination
        if (destLat && destLng) {
          const destCoords = [parseFloat(destLng), parseFloat(destLat)];
          directions.setDestination(destCoords);
          
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat(destCoords)
            .setPopup(new mapboxgl.Popup().setHTML(`<b>${destName || 'Destination'}</b>`))
            .addTo(map);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destLat, destLng, destName]);

  return (
    <>
      <Navbar />

      {/* Show destination banner if navigating from TripPlanner */}
      {destinationName && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-blue-600 text-white px-4 py-2 text-center text-sm shadow-lg">
          <span className="font-medium">Navigating to: </span>{destinationName}
        </div>
      )}

      <div id="map" ref={mapContainerRef} style={destinationName ? { marginTop: '100px', height: 'calc(100vh - 100px)' } : {}}></div>

      <div className='w-full fixed bottom-0'>
        <Bottom />
      </div>
    </>
  );
}

export default Journeypath;
