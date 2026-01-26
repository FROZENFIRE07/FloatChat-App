import React from 'react';
import Plot from 'react-plotly.js';
import './TemporalDistribution.css';

/**
 * TemporalDistribution Component
 * 
 * Purpose: Show when data exists and how it is distributed over time
 * 
 * Design Rules:
 * - Shows only actual observation times (no interpolation)
 * - Helps users avoid empty queries
 * - Displays profile counts per time period
 * - Shows active float timelines
 * 
 * Answers:
 * - "When is data available?"
 * - "How many profiles per day/week?"
 * - "Which floats were active during this time?"
 */

export default function TemporalDistribution({ 
  availability = null,
  activeFloats = [],
  profilesByDate = []
}) {
  
  if (!availability && activeFloats.length === 0 && profilesByDate.length === 0) {
    return (
      <div className="temporal-distribution-container">
        <div className="temporal-header">
          <h3>Temporal Distribution</h3>
        </div>
        <div className="no-data">
          <p>No temporal data available</p>
        </div>
      </div>
    );
  }
  
  // Prepare timeline data
  const traces = [];
  
  // Profile count over time
  if (profilesByDate && profilesByDate.length > 0) {
    const dates = profilesByDate.map(d => d.date);
    const counts = profilesByDate.map(d => d.count);
    
    traces.push({
      x: dates,
      y: counts,
      type: 'bar',
      name: 'Profile Count',
      marker: {
        color: '#42a5f5',
        line: {
          color: '#00d9ff',
          width: 1
        }
      }
    });
  }
  
  const layout = {
    title: null,
    xaxis: {
      title: 'Date',
      type: 'date',
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    yaxis: {
      title: 'Number of Profiles',
      zeroline: true,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    hovermode: 'x unified',
    showlegend: false,
    margin: {
      l: 60,
      r: 30,
      t: 20,
      b: 60
    },
    height: 300,
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
  
  return (
    <div className="temporal-distribution-container">
      <div className="temporal-header">
        <h3>Temporal Distribution</h3>
        {availability && availability.dateRange && (
          <div className="temporal-summary">
            <span className="summary-item">
              <strong>Date Range:</strong> {new Date(availability.dateRange.first).toLocaleDateString()} 
              {' → '} 
              {new Date(availability.dateRange.last).toLocaleDateString()}
            </span>
            <span className="summary-item">
              <strong>Active Days:</strong> {availability.dateRange.uniqueDays}
            </span>
            <span className="summary-item">
              <strong>Total Profiles:</strong> {availability.profileCount}
            </span>
          </div>
        )}
      </div>
      
      {traces.length > 0 && (
        <Plot
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%' }}
        />
      )}
      
      {activeFloats && activeFloats.length > 0 && (
        <div className="active-floats-section">
          <h4>Active Floats</h4>
          <div className="floats-grid">
            {activeFloats.map((float, idx) => (
              <div key={idx} className="float-card">
                <div className="float-id">Float {float.floatId}</div>
                <div className="float-activity">
                  <span className="activity-label">Active Days:</span>
                  <span className="activity-value">{float.activeDays}</span>
                </div>
                {float.profileCount && (
                  <div className="float-profiles">
                    <span className="activity-label">Profiles:</span>
                    <span className="activity-value">{float.profileCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="temporal-footer">
        <p className="temporal-note">
          ℹ️ This shows when data was actually collected. Use this to guide your time-based queries.
        </p>
      </div>
    </div>
  );
}
