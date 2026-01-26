import React from 'react';
import Plot from 'react-plotly.js';
import './VerticalProfileView.css';

/**
 * VerticalProfileView Component
 * 
 * Purpose: Display vertical profile for a specific float
 * Intent: VERTICAL_PROFILE_QUERY
 * 
 * Primary visualization: Depth vs Variable plot
 * - Depth on Y-axis (increasing downward)
 * - Temperature/Salinity on X-axis
 * - NO maps, NO temporal charts
 */

export default function VerticalProfileView({ 
  intent, 
  data = [],
  onBack 
}) {
  const floatId = intent?.float_id || 'Unknown';
  const variables = intent?.variables || ['temperature'];
  
  if (!data || data.length === 0) {
    return (
      <div className="vertical-profile-view">
        <div className="view-header">
          <h2>Vertical Profile</h2>
          <p className="float-info">Float ID: <strong>{floatId}</strong></p>
        </div>
        <div className="no-results">
          <div className="no-results-icon">📊</div>
          <p>No profile data available for this float</p>
          <p className="hint">The float may not exist or have no measurements</p>
        </div>
      </div>
    );
  }
  
  // Organize data by cycle/profile
  const profiles = {};
  data.forEach(record => {
    const cycleKey = record.cycle_number || record.cycle || 'default';
    if (!profiles[cycleKey]) {
      profiles[cycleKey] = {
        cycle: cycleKey,
        time: record.time || record.timestamp,
        measurements: []
      };
    }
    profiles[cycleKey].measurements.push(record);
  });
  
  // Sort measurements by depth
  Object.values(profiles).forEach(profile => {
    profile.measurements.sort((a, b) => 
      (a.pressure || a.depth || 0) - (b.pressure || b.depth || 0)
    );
  });
  
  // Create traces for each variable
  const createTraces = (variable) => {
    return Object.values(profiles).map((profile, idx) => {
      const depths = profile.measurements.map(m => m.pressure || m.depth);
      const values = profile.measurements.map(m => m[variable]);
      
      return {
        x: values,
        y: depths,
        mode: 'lines+markers',
        name: `Cycle ${profile.cycle}`,
        type: 'scatter',
        marker: {
          size: 6,
          line: { width: 1 }
        },
        line: { width: 2 }
      };
    });
  };
  
  const getAxisTitle = (variable) => {
    switch (variable) {
      case 'temperature': return 'Temperature (°C)';
      case 'salinity': return 'Salinity (PSU)';
      default: return variable;
    }
  };
  
  const layoutBase = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(0, 0, 0, 0.2)',
    font: { color: '#ffffff', family: 'Inter, system-ui, sans-serif' },
    margin: { l: 60, r: 30, t: 40, b: 50 },
    yaxis: {
      title: 'Depth (dbar)',
      autorange: 'reversed', // Depth increases downward
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zerolinecolor: 'rgba(255, 255, 255, 0.2)'
    },
    showlegend: Object.keys(profiles).length > 1,
    legend: {
      x: 1,
      y: 1,
      bgcolor: 'rgba(0, 0, 0, 0.5)'
    }
  };
  
  return (
    <div className="vertical-profile-view">
      <div className="view-header">
        <h2>Vertical Profile</h2>
        <p className="float-info">
          Float ID: <strong>{floatId}</strong>
          <span className="separator">•</span>
          {Object.keys(profiles).length} cycle(s)
          <span className="separator">•</span>
          {data.length} measurements
        </p>
      </div>
      
      {/* Profile plots for each variable */}
      <div className="profile-plots">
        {variables.map(variable => (
          <div key={variable} className="profile-plot-container">
            <h3 className="variable-title">{getAxisTitle(variable)}</h3>
            <Plot
              data={createTraces(variable)}
              layout={{
                ...layoutBase,
                xaxis: {
                  title: getAxisTitle(variable),
                  gridcolor: 'rgba(255, 255, 255, 0.1)',
                  zerolinecolor: 'rgba(255, 255, 255, 0.2)'
                }
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
              }}
              className="profile-plot"
              useResizeHandler={true}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        ))}
      </div>
      
      {/* Profile summary */}
      <div className="profile-summary">
        <h3>Profile Summary</h3>
        <div className="summary-grid">
          {Object.values(profiles).slice(0, 5).map(profile => {
            const depths = profile.measurements.map(m => m.pressure || m.depth);
            const temps = profile.measurements.map(m => m.temperature).filter(t => t != null);
            
            return (
              <div key={profile.cycle} className="summary-card">
                <div className="summary-cycle">Cycle {profile.cycle}</div>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="stat-label">Depth Range</span>
                    <span className="stat-value">
                      {Math.min(...depths).toFixed(0)} - {Math.max(...depths).toFixed(0)} dbar
                    </span>
                  </div>
                  {temps.length > 0 && (
                    <div className="stat">
                      <span className="stat-label">Temp Range</span>
                      <span className="stat-value">
                        {Math.min(...temps).toFixed(1)} - {Math.max(...temps).toFixed(1)}°C
                      </span>
                    </div>
                  )}
                  <div className="stat">
                    <span className="stat-label">Points</span>
                    <span className="stat-value">{profile.measurements.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
