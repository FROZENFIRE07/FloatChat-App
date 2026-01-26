import React from 'react';
import Plot from 'react-plotly.js';
import './VerticalProfile.css';

/**
 * VerticalProfile Component
 * 
 * Purpose: Show how values change with depth (THE core ARGO visualization)
 * 
 * Design Rules:
 * - Depth on Y-axis (increasing downward, matching ocean reality)
 * - Temperature or salinity on X-axis
 * - No interpolation between measurements
 * - Can overlay multiple profiles for comparison
 * - Shows data exactly as returned by backend
 * 
 * Answers:
 * - "How does temperature change with depth?"
 * - "What's the thermocline structure?"
 * - "How do profiles compare?"
 */

export default function VerticalProfile({ 
  profiles = [], 
  variable = 'temperature',
  showMultiple = false 
}) {
  
  if (!profiles || profiles.length === 0) {
    return (
      <div className="vertical-profile-container">
        <div className="profile-header">
          <h3>Vertical Profile</h3>
        </div>
        <div className="no-data">
          <p>No profile data available</p>
          <p className="hint">Select a float from the map to view its vertical profile</p>
        </div>
      </div>
    );
  }
  
  // Prepare traces for plotting
  const traces = profiles.map((profile, idx) => {
    const xValues = profile.measurements.map(m => 
      variable === 'temperature' ? m.temperature : m.salinity
    );
    const yValues = profile.measurements.map(m => m.depth); // Using depth field directly
    
    return {
      x: xValues,
      y: yValues,
      mode: 'lines+markers',
      name: showMultiple ? `Float ${profile.floatId} (${new Date(profile.time).toLocaleDateString()})` : `${new Date(profile.time).toLocaleDateString()}`,
      type: 'scatter',
      marker: {
        size: 6,
        color: showMultiple ? undefined : '#42a5f5',
        line: {
          color: '#00d9ff',
          width: 1
        }
      },
      line: {
        width: 3,
        color: showMultiple ? undefined : '#42a5f5'
      }
    };
  });
  
  const xAxisTitle = variable === 'temperature' 
    ? 'Temperature (°C)' 
    : 'Salinity (PSU)';
  
  const layout = {
    title: null,
    xaxis: {
      title: xAxisTitle,
      zeroline: true,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    yaxis: {
      title: 'Depth (m)',
      autorange: 'reversed', // CRITICAL: depth increases downward
      zeroline: true,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    hovermode: 'closest',
    showlegend: showMultiple && profiles.length > 1,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(10, 14, 39, 0.8)',
      bordercolor: 'rgba(33, 150, 243, 0.5)',
      borderwidth: 1,
      font: { color: '#e8f4f8' }
    },
    margin: {
      l: 60,
      r: 30,
      t: 20,
      b: 60
    },
    height: 600,
    plot_bgcolor: 'rgba(10, 14, 39, 0.4)',
    paper_bgcolor: 'transparent',
    font: { color: '#94a3b8' }
  };
  
  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    responsive: true
  };
  
  const firstProfile = profiles[0];
  const stats = firstProfile ? calculateProfileStats(firstProfile, variable) : null;
  
  return (
    <div className="vertical-profile-container">
      <div className="profile-header">
        <h3>Vertical Profile</h3>
        {firstProfile && (
          <div className="profile-info">
            <span>Float {firstProfile.floatId}</span>
            <span>Position: {firstProfile.latitude.toFixed(4)}°N, {firstProfile.longitude.toFixed(4)}°E</span>
            <span>{new Date(firstProfile.time).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
      />
      
      {stats && (
        <div className="profile-stats">
          <h4>Profile Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Depth Range:</span>
              <span className="stat-value">{stats.minDepth.toFixed(1)} - {stats.maxDepth.toFixed(1)} m</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Measurements:</span>
              <span className="stat-value">{stats.count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Value Range:</span>
              <span className="stat-value">
                {stats.minValue.toFixed(2)} - {stats.maxValue.toFixed(2)} {variable === 'temperature' ? '°C' : 'PSU'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mean Value:</span>
              <span className="stat-value">
                {stats.meanValue.toFixed(2)} {variable === 'temperature' ? '°C' : 'PSU'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Calculate profile statistics (no interpretation, just math)
function calculateProfileStats(profile, variable) {
  const measurements = profile.measurements;
  const values = measurements.map(m => variable === 'temperature' ? m.temperature : m.salinity).filter(v => v !== null);
  const depths = measurements.map(m => m.depth).filter(d => d !== null);
  
  if (values.length === 0) return null;
  
  return {
    count: values.length,
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
    meanValue: values.reduce((a, b) => a + b, 0) / values.length,
    minDepth: Math.min(...depths),
    maxDepth: Math.max(...depths)
  };
}
