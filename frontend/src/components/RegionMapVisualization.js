import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Rectangle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './RegionMapVisualization.css';

/**
 * RegionMapVisualization Component
 * 
 * Purpose: Hero visualization for Category 1 (Spatial–Temporal Queries)
 * 
 * Design Philosophy:
 * - Map is dominant visual
 * - Region boundary is subtly highlighted
 * - ARGO points encode selected variable
 * - No clustering (show raw observation points)
 * - Hover reveals details, click enables drill-down
 */

// Map controller for smooth transitions
function MapController({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);

  return null;
}

// Color encoding for variables (observational truth only)
function getColorForValue(value, variable) {
  if (value === null || value === undefined) return '#90a4ae';

  if (variable === 'temperature') {
    // Temperature: teal → coral gradient
    if (value < 5) return '#006064';    // Very cold: deep teal
    if (value < 10) return '#00838f';   // Cold: teal
    if (value < 15) return '#26a69a';   // Cool: teal
    if (value < 20) return '#4db6ac';   // Moderate: light teal
    if (value < 25) return '#ffb74d';   // Warm: orange
    if (value < 30) return '#ff8a65';   // Hot: coral
    return '#ff6f61';                   // Very hot: coral
  }

  if (variable === 'salinity') {
    // Salinity: blue → teal gradient
    if (value < 33) return '#0d47a1';   // Low: deep blue
    if (value < 34) return '#1976d2';   // Below normal: blue
    if (value < 35) return '#42a5f5';   // Normal: light blue
    if (value < 36) return '#26a69a';   // Above normal: teal
    if (value < 37) return '#00897b';   // High: dark teal
    return '#004d40';                   // Very high: deep teal
  }

  return '#90a4ae';
}

// Float marker with micro-interaction
function FloatMarker({ float, variable, onFloatClick }) {
  const position = [float.latitude, float.longitude];
  const value = variable === 'temperature' ? float.temperature : float.salinity;
  const color = getColorForValue(value, variable);

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return val.toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <CircleMarker
      center={position}
      radius={7}
      fillColor={color}
      color="rgba(255, 255, 255, 0.9)"
      weight={2}
      opacity={1}
      fillOpacity={0.85}
      eventHandlers={{
        click: () => onFloatClick && onFloatClick(float),
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div className="float-tooltip">
          <div className="tooltip-header">
            Float {float.floatId || float.float_id}
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Position:</span>
            <span className="tooltip-value">
              {float.latitude.toFixed(4)}°N, {float.longitude.toFixed(4)}°E
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">{variable === 'temperature' ? 'Temperature:' : 'Salinity:'}</span>
            <span className="tooltip-value">
              {formatValue(value)} {variable === 'temperature' ? '°C' : 'PSU'}
            </span>
          </div>
          {float.depth && (
            <div className="tooltip-row">
              <span className="tooltip-label">Depth:</span>
              <span className="tooltip-value">{float.depth.toFixed(1)} m</span>
            </div>
          )}
          <div className="tooltip-row">
            <span className="tooltip-label">Timestamp:</span>
            <span className="tooltip-value">{formatDate(float.time)}</span>
          </div>
          {onFloatClick && (
            <div className="tooltip-action">
              Click to view vertical profile
            </div>
          )}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}

export default function RegionMapVisualization({
  floats = [],
  variable = 'temperature',
  region = null,
  onFloatClick,
  filteredFloats = null // For time slider filtering
}) {
  const displayFloats = filteredFloats !== null ? filteredFloats : floats;

  console.log('🗺️ RegionMapVisualization render:', {
    totalFloats: floats.length,
    displayFloats: displayFloats.length,
    variable,
    hasRegion: !!region,
    regionDetails: region,
    uniquePositions: new Set(displayFloats.map(f => `${f.latitude},${f.longitude}`)).size
  });

  // Prevent infinite re-renders by using refs
  const renderCountRef = React.useRef(0);
  renderCountRef.current++;

  if (renderCountRef.current > 5) {
    console.warn('⚠️ Too many renders detected!', renderCountRef.current);
  }

  // Group profiles by float and position, taking only the shallowest depth for map display
  const uniqueFloatPositions = React.useMemo(() => {
    const positionMap = new Map();

    displayFloats.forEach(float => {
      const key = `${float.floatId}-${float.latitude}-${float.longitude}`;
      const existing = positionMap.get(key);

      // Keep the shallowest depth (or first if no depth)
      if (!existing || (float.depth && existing.depth && float.depth < existing.depth)) {
        positionMap.set(key, float);
      }
    });

    const uniqueFloats = Array.from(positionMap.values());
    console.log('📍 Unique positions:', uniqueFloats.length, 'from', displayFloats.length, 'total profiles');
    return uniqueFloats;
  }, [displayFloats]);

  // Calculate map bounds from region or floats
  const bounds = React.useMemo(() => {
    if (region && region.latMin && region.latMax && region.lonMin && region.lonMax) {
      return [
        [region.latMin, region.lonMin],
        [region.latMax, region.lonMax]
      ];
    }

    if (uniqueFloatPositions.length > 0) {
      const lats = uniqueFloatPositions.map(f => f.latitude);
      const lons = uniqueFloatPositions.map(f => f.longitude);
      return [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)]
      ];
    }

    return null;
  }, [region, uniqueFloatPositions]);

  // Region boundary
  const regionBounds = React.useMemo(() => {
    if (region && region.latMin && region.latMax && region.lonMin && region.lonMax) {
      return [
        [region.latMin, region.lonMin],
        [region.latMax, region.lonMax]
      ];
    }
    return null;
  }, [region]);

  return (
    <div className="region-map-container">
      <MapContainer
        center={[15, 65]}
        zoom={4}
        scrollWheelZoom={true}
        zoomControl={true}
        className="region-map"
      >
        <MapController bounds={bounds} />

        {/* Ocean-themed base map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Region boundary (subtle highlight) */}
        {regionBounds && (
          <Rectangle
            bounds={regionBounds}
            pathOptions={{
              color: '#1976d2',
              weight: 2,
              fillColor: '#1976d2',
              fillOpacity: 0.05,
              dashArray: '5, 10'
            }}
          />
        )}

        {/* ARGO float markers */}
        {uniqueFloatPositions.map((float, index) => {
          // 🧪 DIAGNOSTIC: Verify bbox compliance (backend guarantees this)
          if (index < 3 && renderCountRef.current <= 2 && region) {
            const insideBBox =
              float.latitude >= (region.latMin || -90) &&
              float.latitude <= (region.latMax || 90) &&
              float.longitude >= (region.lonMin || -180) &&
              float.longitude <= (region.lonMax || 180);

            console.log(`🔍 Float ${index} bbox check:`, {
              floatId: float.floatId,
              position: { lat: float.latitude, lon: float.longitude },
              bbox: region,
              insideBBox: insideBBox,
              leafletCoords: [float.latitude, float.longitude]
            });
          }

          return (
            <FloatMarker
              key={`${float.floatId}-${float.latitude}-${float.longitude}-${index}`}
              float={float}
              variable={variable}
              onFloatClick={onFloatClick}
            />
          );
        })}uniqueFloatPositions.length} float position{uniqueFloatPositions.length !== 1 ? 's' : ''} ({displayFloats.length} total profiles)
      </MapContainer>

      {/* Data count indicator */}
      <div className="map-overlay-info">
        <div className="data-count">
          {displayFloats.length} profile{displayFloats.length !== 1 ? 's' : ''} visible
        </div>
      </div>

      {/* Variable legend */}
      <div className="map-legend">
        <div className="legend-title">
          {variable === 'temperature' ? 'Temperature (°C)' : 'Salinity (PSU)'}
        </div>
        <div className="legend-gradient">
          {variable === 'temperature' ? (
            <>
              <div className="legend-gradient-bar temperature-gradient"></div>
              <div className="legend-labels">
                <span>0°C</span>
                <span>30°C</span>
              </div>
            </>
          ) : (
            <>
              <div className="legend-gradient-bar salinity-gradient"></div>
              <div className="legend-labels">
                <span>30 PSU</span>
                <span>38 PSU</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
