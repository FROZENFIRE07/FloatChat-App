import React from 'react';
import Plot from 'react-plotly.js';
import './DataAvailabilityView.css';

/**
 * DataAvailabilityView Component
 * 
 * Purpose: Show data coverage/availability
 * Intent: DATA_AVAILABILITY_QUERY
 * 
 * Primary visualization: Density map or summary
 * - Coverage indicators
 * - Counts per region/time
 * - NO scientific plots
 * - NO depth charts
 */

export default function DataAvailabilityView({ 
  intent, 
  data = {} 
}) {
  // Handle empty data
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="availability-view">
        <div className="view-header">
          <h2>Data Availability</h2>
        </div>
        <div className="no-results">
          <div className="no-results-icon">🗺️</div>
          <p>No availability data found</p>
          <p className="hint">Try adjusting the region or time range</p>
        </div>
      </div>
    );
  }
  
  // Extract availability metrics
  const {
    total_profiles = data.totalProfiles || data.count || 0,
    total_floats = data.totalFloats || data.floatCount || 0,
    date_range = data.dateRange || {},
    coverage = data.coverage || {},
    by_month = data.byMonth || data.monthly || [],
    by_region = data.byRegion || []
  } = data;
  
  // Build context string
  const getContextString = () => {
    const parts = [];
    if (intent?.latitude_min !== undefined && intent?.latitude_max !== undefined) {
      parts.push(`Lat: ${intent.latitude_min}° to ${intent.latitude_max}°`);
    }
    if (intent?.longitude_min !== undefined && intent?.longitude_max !== undefined) {
      parts.push(`Lon: ${intent.longitude_min}° to ${intent.longitude_max}°`);
    }
    if (intent?.start_date) {
      parts.push(`From: ${intent.start_date.split('T')[0]}`);
    }
    if (intent?.end_date) {
      parts.push(`To: ${intent.end_date.split('T')[0]}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'All available data';
  };
  
  // Create temporal distribution chart if monthly data exists
  const hasMonthlyData = by_month && by_month.length > 0;
  
  const monthlyTrace = hasMonthlyData ? [{
    x: by_month.map(m => m.month || m.date || m.period),
    y: by_month.map(m => m.count || m.profiles || m.value),
    type: 'bar',
    marker: {
      color: '#00d9ff',
      line: {
        color: 'rgba(255, 255, 255, 0.3)',
        width: 1
      }
    }
  }] : [];
  
  const chartLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(0, 0, 0, 0.2)',
    font: { color: '#ffffff', family: 'Inter, system-ui, sans-serif' },
    margin: { l: 50, r: 30, t: 20, b: 50 },
    xaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.1)'
    },
    yaxis: {
      title: 'Profile Count',
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zerolinecolor: 'rgba(255, 255, 255, 0.2)'
    },
    showlegend: false
  };
  
  return (
    <div className="availability-view">
      <div className="view-header">
        <h2>Data Availability</h2>
        <p className="context-info">{getContextString()}</p>
      </div>
      
      {/* Summary Cards */}
      <div className="availability-summary">
        <div className="summary-card primary">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <span className="card-value">{total_profiles.toLocaleString()}</span>
            <span className="card-label">Total Profiles</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">🎈</div>
          <div className="card-content">
            <span className="card-value">{total_floats.toLocaleString()}</span>
            <span className="card-label">Unique Floats</span>
          </div>
        </div>
        
        {date_range.start && (
          <div className="summary-card">
            <div className="card-icon">📅</div>
            <div className="card-content">
              <span className="card-value date-range">
                {date_range.start?.split('T')[0] || 'N/A'}
                <span className="range-separator">→</span>
                {date_range.end?.split('T')[0] || 'N/A'}
              </span>
              <span className="card-label">Date Range</span>
            </div>
          </div>
        )}
        
        {coverage.temperature !== undefined && (
          <div className="summary-card">
            <div className="card-icon">🌡️</div>
            <div className="card-content">
              <span className="card-value">{(coverage.temperature * 100).toFixed(1)}%</span>
              <span className="card-label">Temperature Coverage</span>
            </div>
          </div>
        )}
        
        {coverage.salinity !== undefined && (
          <div className="summary-card">
            <div className="card-icon">🧂</div>
            <div className="card-content">
              <span className="card-value">{(coverage.salinity * 100).toFixed(1)}%</span>
              <span className="card-label">Salinity Coverage</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Temporal Distribution */}
      {hasMonthlyData && (
        <div className="temporal-section">
          <h3>Temporal Distribution</h3>
          <div className="chart-container">
            <Plot
              data={monthlyTrace}
              layout={chartLayout}
              config={{
                displayModeBar: false,
                displaylogo: false
              }}
              className="availability-chart"
              useResizeHandler={true}
              style={{ width: '100%', height: '250px' }}
            />
          </div>
        </div>
      )}
      
      {/* Availability Explanation */}
      <div className="availability-note">
        <p>
          This summary shows the data coverage for the requested region and time period. 
          Coverage indicates the percentage of measurements that have valid values for each variable.
        </p>
      </div>
    </div>
  );
}
