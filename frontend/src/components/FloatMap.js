import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './FloatMap.css';

/**
 * FloatMap Component
 * 
 * Purpose: Provide spatial orientation and discovery over ARGO ocean data
 * 
 * Design Rules:
 * - OpenStreetMap is only a background (geographic context)
 * - All meaningful content comes from ARGO data
 * - No interpolation, smoothing, or modification of data
 * - No interpretation or prediction
 * 
 * Answers:
 * - "Where are the floats?"
 * - "Which areas have data?"
 * - "Which floats are closest to this location?"
 */

// Component to handle map center updates
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

// Color scale for temperature (truthful, no interpretation)
function getColorForValue(value, variable) {
  if (value === null || value === undefined) return '#808080'; // Gray for missing
  
  if (variable === 'temperature') {
    // Temperature range: -2°C to 30°C (typical ocean range)
    if (value < 0) return '#0000FF';      // Cold: Blue
    if (value < 10) return '#00FFFF';     // Cool: Cyan
    if (value < 20) return '#00FF00';     // Moderate: Green
    if (value < 25) return '#FFFF00';     // Warm: Yellow
    return '#FF0000';                     // Hot: Red
  }
  
  if (variable === 'salinity') {
    // Salinity range: 30-40 PSU (typical ocean range)
    if (value < 33) return '#FFFF00';     // Low: Yellow
    if (value < 35) return '#00FF00';     // Moderate: Green
    if (value < 37) return '#00FFFF';     // High: Cyan
    return '#0000FF';                     // Very High: Blue
  }
  
  return '#808080'; // Default gray
}

// Float point marker component with solid, attractive design
function FloatMarker({ float, variable, onFloatClick }) {
  const position = [float.latitude, float.longitude];
  const value = variable === 'temperature' ? float.temperature : float.salinity;
  const color = getColorForValue(value, variable);
  
  return (
    <CircleMarker
      center={position}
      radius={8}
      fillColor={color}
      color="rgba(255, 255, 255, 0.9)"
      weight={2}
      opacity={1}
      fillOpacity={0.85}
      eventHandlers={{
        click: () => onFloatClick(float),
      }}
    >
      <Popup>
        <div className="float-popup">
          <h4>Float {float.floatId || float.float_id}</h4>
          <p><strong>Position:</strong> {float.latitude.toFixed(4)}°N, {float.longitude.toFixed(4)}°E</p>
          {float.time && <p><strong>Time:</strong> {new Date(float.time).toLocaleDateString()}</p>}
          {value !== null && value !== undefined && (
            <p><strong>{variable === 'temperature' ? 'Temperature' : 'Salinity'}:</strong> {value.toFixed(2)} {variable === 'temperature' ? '°C' : 'PSU'}</p>
          )}
          {float.depth && <p><strong>Depth:</strong> {float.depth.toFixed(1)} m</p>}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function FloatMap({ 
  floats = [], 
  variable = 'temperature', 
  onFloatSelect,
  center = [0, 70], // Indian Ocean center
  zoom = 4
}) {
  const [selectedFloat, setSelectedFloat] = useState(null);
  
  const handleFloatClick = (float) => {
    setSelectedFloat(float);
    if (onFloatSelect) {
      onFloatSelect(float);
    }
  };
  
  return (
    <div className="float-map-container">
      <div className="map-header">
        <h3>Spatial Distribution</h3>
        <div className="map-legend">
          <span className="legend-title">{variable === 'temperature' ? 'Temperature (°C)' : 'Salinity (PSU)'}</span>
          <div className="legend-scale">
            {variable === 'temperature' ? (
              <>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#0000FF'}}></span> &lt;0°C</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#00FFFF'}}></span> 0-10°C</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#00FF00'}}></span> 10-20°C</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#FFFF00'}}></span> 20-25°C</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#FF0000'}}></span> &gt;25°C</span>
              </>
            ) : (
              <>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#FFFF00'}}></span> &lt;33 PSU</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#00FF00'}}></span> 33-35 PSU</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#00FFFF'}}></span> 35-37 PSU</span>
                <span className="legend-item"><span className="legend-color" style={{backgroundColor: '#0000FF'}}></span> &gt;37 PSU</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '600px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />
        
        {/* OpenStreetMap - Natural terrain with faint blue oceans */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Float overlays - truth from backend */}
        {floats.map((float, idx) => (
          <FloatMarker
            key={float.floatId || float.float_id || idx}
            float={float}
            variable={variable}
            onFloatClick={handleFloatClick}
          />
        ))}
      </MapContainer>
      
      <div className="map-footer">
        <p className="map-info">
          Showing {floats.length} float{floats.length !== 1 ? 's' : ''} 
          {selectedFloat && ` | Selected: Float ${selectedFloat.floatId || selectedFloat.float_id}`}
        </p>
      </div>
    </div>
  );
}
