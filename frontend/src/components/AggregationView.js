import React from 'react';
import Plot from 'react-plotly.js';
import './AggregationView.css';

/**
 * AggregationView Component
 * 
 * Purpose: Display statistical aggregations
 * Intent: AGGREGATION_QUERY
 * 
 * Primary visualization: Bar charts / Summary cards
 * - Clear indication of aggregation type
 * - NO raw data tables
 * - NO maps unless explicitly requested
 */

export default function AggregationView({ 
  intent, 
  data = {} 
}) {
  const variables = intent?.variables || ['temperature'];
  const aggregations = intent?.aggregations || ['mean', 'min', 'max'];
  
  // Handle empty data
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="aggregation-view">
        <div className="view-header">
          <h2>Statistical Summary</h2>
          <p className="agg-info">
            {aggregations.join(', ')} of {variables.join(', ')}
          </p>
        </div>
        <div className="no-results">
          <div className="no-results-icon">📈</div>
          <p>No data available for aggregation</p>
          <p className="hint">Try adjusting the region or time range</p>
        </div>
      </div>
    );
  }
  
  // Prepare data for visualization
  const stats = data.statistics || data;
  
  // Create bar chart data
  const createBarData = () => {
    const traces = [];
    
    variables.forEach((variable, varIdx) => {
      const varStats = stats[variable] || stats;
      const values = [];
      const labels = [];
      
      aggregations.forEach(agg => {
        let value = varStats[agg];
        if (value === undefined && agg === 'avg') value = varStats['mean'];
        if (value !== undefined && value !== null) {
          labels.push(agg.charAt(0).toUpperCase() + agg.slice(1));
          values.push(value);
        }
      });
      
      if (values.length > 0) {
        traces.push({
          x: labels,
          y: values,
          type: 'bar',
          name: variable.charAt(0).toUpperCase() + variable.slice(1),
          marker: {
            color: varIdx === 0 ? '#00d9ff' : '#42a5f5',
            line: {
              color: 'rgba(255, 255, 255, 0.3)',
              width: 1
            }
          }
        });
      }
    });
    
    return traces;
  };
  
  const barData = createBarData();
  
  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(0, 0, 0, 0.2)',
    font: { color: '#ffffff', family: 'Inter, system-ui, sans-serif' },
    margin: { l: 60, r: 30, t: 40, b: 50 },
    xaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.1)'
    },
    yaxis: {
      title: 'Value',
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zerolinecolor: 'rgba(255, 255, 255, 0.2)'
    },
    showlegend: variables.length > 1,
    legend: {
      x: 1,
      y: 1,
      bgcolor: 'rgba(0, 0, 0, 0.5)'
    },
    barmode: 'group'
  };
  
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
  
  return (
    <div className="aggregation-view">
      <div className="view-header">
        <h2>Statistical Summary</h2>
        <p className="agg-info">
          {aggregations.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')} of{' '}
          <strong>{variables.join(', ')}</strong>
        </p>
        <p className="context-info">{getContextString()}</p>
      </div>
      
      {/* Summary Cards */}
      <div className="stats-cards">
        {variables.map(variable => {
          const varStats = stats[variable] || stats;
          return (
            <div key={variable} className="variable-stats">
              <h3 className="variable-name">
                {variable.charAt(0).toUpperCase() + variable.slice(1)}
              </h3>
              <div className="stats-grid">
                {aggregations.map(agg => {
                  let value = varStats[agg];
                  if (value === undefined && agg === 'avg') value = varStats['mean'];
                  
                  return (
                    <div key={agg} className="stat-card">
                      <span className="stat-label">{agg.toUpperCase()}</span>
                      <span className="stat-value">
                        {value !== undefined && value !== null 
                          ? typeof value === 'number' ? value.toFixed(2) : value
                          : 'N/A'}
                      </span>
                    </div>
                  );
                })}
                {varStats.count !== undefined && (
                  <div className="stat-card stat-count">
                    <span className="stat-label">SAMPLES</span>
                    <span className="stat-value">{varStats.count.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Bar Chart */}
      {barData.length > 0 && (
        <div className="chart-container">
          <Plot
            data={barData}
            layout={layout}
            config={{
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ['lasso2d', 'select2d']
            }}
            className="agg-chart"
            useResizeHandler={true}
            style={{ width: '100%', height: '300px' }}
          />
        </div>
      )}
    </div>
  );
}
