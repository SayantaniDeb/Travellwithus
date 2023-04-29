import React, { useState, useEffect } from 'react';
import ReactMapboxGl, { Marker, Popup } from 'react-mapbox-gl';
import Select from 'react-select';
import axios from 'axios';

const Mapbox = ReactMapboxGl({
  accessToken:process.env.REACT_APP_ACCESSTOKEN,
});

const crimeTypes = [
  { value: 'Robbery', label: 'Robbery' },
  { value: 'Assault', label: 'Assault' },
  { value: 'Burglary', label: 'Burglary' },
  { value: 'Theft', label: 'Theft' }
];

function JourneyPath() {
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedCrimeType, setSelectedCrimeType] = useState(null);

  useEffect(() => {
    // Load existing marker data from backend API or local storage
    const savedMarkers = JSON.parse(localStorage.getItem('markers')) || [];
    setMarkers(savedMarkers);
  }, []);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const handleMarkerClose = () => {
    setSelectedMarker(null);
  };

  const handleMapClick = (map, event) => {
    const { lngLat } = event;
    const newMarker = {
      id: markers.length + 1,
      coordinates: [lngLat.lng, lngLat.lat],
      crimeType: selectedCrimeType.value
    };
    setMarkers([...markers, newMarker]);
    setSelectedMarker(newMarker);
    axios.post('/api/markers', newMarker); // Save marker data to backend API
  };

  const handleCrimeTypeChange = (selectedOption) => {
    setSelectedCrimeType(selectedOption);
  };

  const renderMarkers = () => {
    return markers.map((marker) => (
      <Marker
        key={marker.id}
        coordinates={marker.coordinates}
        onClick={() => handleMarkerClick(marker)}
      />
    ));
  };

  return (
    <div className="App">
      <Mapbox
        style="mapbox://styles/mapbox/streets-v11"
        center={[-122.4194, 37.7749]}
        zoom={[12]}
        onClick={handleMapClick}
      >
        {renderMarkers()}
        {selectedMarker && (
          <Popup
            coordinates={selectedMarker.coordinates}
            onClose={handleMarkerClose}
          >
            <div>
              <h3>{selectedMarker.crimeType}</h3>
              <p>Latitude: {selectedMarker.coordinates[1]}</p>
              <p>Longitude: {selectedMarker.coordinates[0]}</p>
            </div>
          </Popup>
        )}
      </Mapbox>
      <Select
        options={crimeTypes}
        value={selectedCrimeType}
        onChange={handleCrimeTypeChange}
      />
    </div>
  );
}

export default JourneyPath;
