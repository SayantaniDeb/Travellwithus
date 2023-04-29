import React, { useEffect } from 'react';
import Bottom from './bottomfoot';
import Navbar from './Navbar';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
// import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import './Journeypath.css'

function Journeypath() {
  mapboxgl.accessToken =
  "pk.eyJ1IjoiZXNvdGVyaWM0NSIsImEiOiJjbGY0anA4YjYwbzV2M3pudDI5bDR1dThmIn0.mPW7S5k_nzfIyDJrpbVb3g"

  // Get the user's current location and use it as the starting point for the directions
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [longitude, latitude],
      zoom: 15
    });

    new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map);

    const marker = new mapboxgl.Marker()
    .setLngLat([longitude, latitude])
    .setPopup(new mapboxgl.Popup().setHTML("<h1>Hello World!</h1>")) // add popup
    .addTo(map);

    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav);

    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving',
      interactive: true,
      controls: {
        traffic: true,
        inputs: true,
        instructions: true,
        profileSwitcher: true
      },
      traffic: 'live',
      placeholderOrigin: 'Choose starting point'
    });

    directions.setOrigin([longitude, latitude]);
    map.addControl(directions, 'top-left');
  });

  return (
    <>
      <Navbar />

      <div id="map"></div>

      <div className='w-full fixed bottom-0'>
        <Bottom />
      </div>
    </>
  );
}

export default Journeypath;
