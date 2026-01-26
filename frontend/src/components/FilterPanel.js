import React, { useState } from 'react';
import './FilterPanel.css';

/**
 * FilterPanel Component
 * 
 * Purpose: User controls for querying Module 3 APIs
 * 
 * All filters map directly to Module 3 API parameters:
 * - Geographic bounds (lat/lon)
 * - Time window
 * - Variable selection (temperature/salinity)
 * 
 * No intelligence here - just parameter collection
 */

export default function FilterPanel({ onFilterChange, onApplyFilters }) {
  // Default to Indian Ocean region from Module 1
  const [filters, setFilters] = useState({
    latMin: -10,
    latMax: 0,
    lonMin: 60,
    lonMax: 80,
    timeStart: '2019-01-01T00:00:00Z',
    timeEnd: '2019-01-31T23:59:59Z',
    variable: 'temperature',
    floatId: ''
  });
  
  const handleInputChange = (field, value) => {
    const updatedFilters = {
      ...filters,
      [field]: value
    };
    setFilters(updatedFilters);
    
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  };
  
  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  };
  
  const handlePreset = (preset) => {
    let newFilters = { ...filters };
    
    switch (preset) {
      case 'indian-ocean':
        newFilters = {
          ...newFilters,
          latMin: -10,
          latMax: 0,
          lonMin: 60,
          lonMax: 80
        };
        break;
      case 'january-2019':
        newFilters = {
          ...newFilters,
          timeStart: '2019-01-01T00:00:00Z',
          timeEnd: '2019-01-31T23:59:59Z'
        };
        break;
      case 'full-year-2019':
        newFilters = {
          ...newFilters,
          timeStart: '2019-01-01T00:00:00Z',
          timeEnd: '2019-12-31T23:59:59Z'
        };
        break;
      default:
        break;
    }
    
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };
  
  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Query Parameters</h3>
        <p className="filter-subtitle">Configure parameters for Module 3 API queries</p>
      </div>
      
      <div className="filter-sections">
        {/* Geographic Bounds */}
        <div className="filter-section">
          <h4>Geographic Bounds</h4>
          <div className="filter-grid">
            <div className="filter-input-group">
              <label>Latitude Min</label>
              <input
                type="number"
                step="0.1"
                value={filters.latMin}
                onChange={(e) => handleInputChange('latMin', parseFloat(e.target.value))}
              />
            </div>
            <div className="filter-input-group">
              <label>Latitude Max</label>
              <input
                type="number"
                step="0.1"
                value={filters.latMax}
                onChange={(e) => handleInputChange('latMax', parseFloat(e.target.value))}
              />
            </div>
            <div className="filter-input-group">
              <label>Longitude Min</label>
              <input
                type="number"
                step="0.1"
                value={filters.lonMin}
                onChange={(e) => handleInputChange('lonMin', parseFloat(e.target.value))}
              />
            </div>
            <div className="filter-input-group">
              <label>Longitude Max</label>
              <input
                type="number"
                step="0.1"
                value={filters.lonMax}
                onChange={(e) => handleInputChange('lonMax', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="preset-buttons">
            <button onClick={() => handlePreset('indian-ocean')} className="preset-btn">
              Indian Ocean (Module 1 Region)
            </button>
          </div>
        </div>
        
        {/* Time Window */}
        <div className="filter-section">
          <h4>Time Window</h4>
          <div className="filter-grid">
            <div className="filter-input-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={filters.timeStart.slice(0, 16)}
                onChange={(e) => handleInputChange('timeStart', e.target.value + ':00Z')}
              />
            </div>
            <div className="filter-input-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                value={filters.timeEnd.slice(0, 16)}
                onChange={(e) => handleInputChange('timeEnd', e.target.value + ':59Z')}
              />
            </div>
          </div>
          <div className="preset-buttons">
            <button onClick={() => handlePreset('january-2019')} className="preset-btn">
              January 2019
            </button>
            <button onClick={() => handlePreset('full-year-2019')} className="preset-btn">
              Full Year 2019
            </button>
          </div>
        </div>
        
        {/* Variable Selection */}
        <div className="filter-section">
          <h4>Variable</h4>
          <div className="variable-selector">
            <label className="variable-option">
              <input
                type="radio"
                name="variable"
                value="temperature"
                checked={filters.variable === 'temperature'}
                onChange={(e) => handleInputChange('variable', e.target.value)}
              />
              <span>Temperature (°C)</span>
            </label>
            <label className="variable-option">
              <input
                type="radio"
                name="variable"
                value="salinity"
                checked={filters.variable === 'salinity'}
                onChange={(e) => handleInputChange('variable', e.target.value)}
              />
              <span>Salinity (PSU)</span>
            </label>
          </div>
        </div>
        
        {/* Float ID (Optional) */}
        <div className="filter-section">
          <h4>Specific Float (Optional)</h4>
          <div className="filter-input-group">
            <label>Float ID</label>
            <input
              type="text"
              placeholder="e.g., 2902746"
              value={filters.floatId}
              onChange={(e) => handleInputChange('floatId', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="filter-actions">
        <button onClick={handleApply} className="apply-btn">
          Apply Filters & Query Data
        </button>
      </div>
      
      <div className="filter-footer">
        <p className="filter-note">
          ℹ️ All parameters map directly to Module 3 API endpoints. No interpretation applied.
        </p>
      </div>
    </div>
  );
}
