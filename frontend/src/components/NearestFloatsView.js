import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './NearestFloatsView.css';

/**
 * NearestFloatsView Component
 * 
 * Purpose: Display floats near a specific coordinate
 * Intent: NEAREST_FLOAT_QUERY
 * 
 * Primary visualization: Interactive Map
 * - Shows search center point
 * - Shows radius circle
 * - Shows matching floats as markers
 * - Clickable float IDs
 */

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function NearestFloatsView({ 
  intent, 
  data = [],
  onFloatClick 
}) {
  const [selectedFloat, setSelectedFloat] = useState(null);
  
  // Extract search parameters from intent
  const searchCenter = [
    intent?.latitude || 0,
    intent?.longitude || 0
  ];
  const radiusDegrees = intent?.radius_degrees || 5;
  
  // Convert degrees to approximate meters (1 degree ≈ 111km)
  const radiusMeters = radiusDegrees * 111000;
  
  // Calculate map zoom based on radius
  const getZoomLevel = (radius) => {
    if (radius <= 2) return 7;
    if (radius <= 5) return 6;
    if (radius <= 10) return 5;
    if (radius <= 20) return 4;
    return 3;
  };
  
  const handleFloatClick = (float) => {
    setSelectedFloat(float);
    if (onFloatClick) {
      onFloatClick(float);
    }
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="nearest-floats-view">
        <div className="view-header">
          <h2>Nearest Floats</h2>
          <p className="search-params">
            Near ({searchCenter[0].toFixed(2)}°, {searchCenter[1].toFixed(2)}°) 
            within {radiusDegrees}°
          </p>
        </div>
        <div className="no-results">
          <div className="no-results-icon">📍</div>
          <p>No floats found in this area</p>
          <p className="hint">Try expanding the search radius or adjusting coordinates</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="nearest-floats-view">
      <div className="view-header">
        <h2>Nearest Floats</h2>
        <p className="search-params">
          Found <strong>{data.length}</strong> floats near 
          ({searchCenter[0].toFixed(2)}°, {searchCenter[1].toFixed(2)}°) 
          within {radiusDegrees}°
        </p>
      </div>
      
      {/* Primary: Map */}
      <div className="map-container">
        <MapContainer
          center={searchCenter}
          zoom={getZoomLevel(radiusDegrees)}
          className="nearest-map"
          scrollWheelZoom={true}
        >
          <MapController center={searchCenter} zoom={getZoomLevel(radiusDegrees)} />
          
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          
          {/* Search radius circle */}
          <Circle
            center={searchCenter}
            radius={radiusMeters}
            pathOptions={{
              color: '#00d9ff',
              fillColor: '#00d9ff',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 10'
            }}
          />
          
          {/* Center point */}
          <CircleMarker
            center={searchCenter}
            radius={10}
            pathOptions={{
              color: '#ff4444',
              fillColor: '#ff4444',
              fillOpacity: 1,
              weight: 2
            }}
          >
            <Popup>
              <div className="center-popup">
                <strong>Search Center</strong>
                <br />
                Lat: {searchCenter[0].toFixed(4)}°
                <br />
                Lon: {searchCenter[1].toFixed(4)}°
              </div>
            </Popup>
          </CircleMarker>
          
          {/* Float markers */}
          {data.map((float, idx) => (
            <CircleMarker
              key={float.float_id || float.floatId || idx}
              center={[float.latitude, float.longitude]}
              radius={8}
              pathOptions={{
                color: selectedFloat?.float_id === float.float_id ? '#ffff00' : '#ffffff',
                fillColor: '#42a5f5',
                fillOpacity: 0.85,
                weight: 2
              }}
              eventHandlers={{
                click: () => handleFloatClick(float)
              }}
            >
              <Popup>
                <div className="float-popup">
                  <strong>Float {float.float_id || float.floatId}</strong>
                  <br />
                  Lat: {float.latitude?.toFixed(4)}°
                  <br />
                  Lon: {float.longitude?.toFixed(4)}°
                  {float.distance && (
                    <>
                      <br />
                      Distance: {float.distance.toFixed(2)}°
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      
      {/* Float list */}
      <div className="float-list">
        <h3>Float Details</h3>
        <div className="float-cards">
          {data.slice(0, 10).map((float, idx) => (
            <div 
              key={float.float_id || float.floatId || idx}
              className={`float-card ${selectedFloat?.float_id === float.float_id ? 'selected' : ''}`}
              onClick={() => handleFloatClick(float)}
            >
              <span className="float-id">{float.float_id || float.floatId}</span>
              <span className="float-coords">
                {float.latitude?.toFixed(2)}°, {float.longitude?.toFixed(2)}°
              </span>
              {float.distance && (
                <span className="float-distance">{float.distance.toFixed(2)}° away</span>
              )}
            </div>
          ))}
        </div>
        {data.length > 10 && (
          <p className="more-indicator">+ {data.length - 10} more floats</p>
        )}
      </div>
    </div>
  );
}
