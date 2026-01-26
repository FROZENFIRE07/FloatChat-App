import React from 'react';
import Plot from 'react-plotly.js';
import './ValueDistribution.css';

/**
 * ValueDistribution Component
 * 
 * Purpose: Show numerical spread without interpretation
 * 
 * Design Rules:
 * - Histograms show frequency distribution
 * - Scatter plots show depth vs value relationships
 * - No smoothing, no trend lines, no predictions
 * - Only mathematical structure, no conclusions
 * 
 * Answers:
 * - "What is the value distribution?"
 * - "How are values spread across depth?"
 * - "What are the most common ranges?"
 */

export default function ValueDistribution({ 
  statistics = null,
  measurements = [],
  variable = 'temperature'
}) {
  
  if (!statistics && measurements.length === 0) {
    return (
      <div className="value-distribution-container">
        <div className="distribution-header">
          <h3>Value Distribution</h3>
        </div>
        <div className="no-data">
          <p>No distribution data available</p>
        </div>
      </div>
    );
  }
  
  const variableName = variable === 'temperature' ? 'Temperature' : 'Salinity';
  const unit = variable === 'temperature' ? '°C' : 'PSU';
  
  // Prepare histogram data
  const histogramTrace = measurements.length > 0 ? {
    x: measurements.map(m => variable === 'temperature' ? m.temperature : m.salinity),
    type: 'histogram',
    name: 'Frequency',
    marker: {
      color: '#42a5f5',
      line: {
        color: '#00d9ff',
        width: 1
      }
    },
    nbinsx: 30
  } : null;
  
  // Prepare depth vs value scatter
  const scatterTrace = measurements.length > 0 ? {
    x: measurements.map(m => variable === 'temperature' ? m.temperature : m.salinity),
    y: measurements.map(m => m.depth),
    mode: 'markers',
    type: 'scatter',
    name: 'Measurements',
    marker: {
      size: 5,
      color: '#42a5f5',
      opacity: 0.7,
      line: {
        color: '#00d9ff',
        width: 0.5
      }
    }
  } : null;
  
  const histogramLayout = {
    title: null,
    xaxis: {
      title: `${variableName} (${unit})`,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    yaxis: {
      title: 'Frequency',
      zeroline: true,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    hovermode: 'closest',
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
  
  const scatterLayout = {
    title: null,
    xaxis: {
      title: `${variableName} (${unit})`,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    yaxis: {
      title: 'Depth (m)',
      autorange: 'reversed', // Depth increases downward
      zeroline: true,
      showgrid: true,
      gridcolor: 'rgba(33, 150, 243, 0.2)',
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    hovermode: 'closest',
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
    <div className="value-distribution-container">
      <div className="distribution-header">
        <h3>Value Distribution</h3>
        {statistics && (
          <div className="stats-summary">
            <div className="stat-box">
              <div className="stat-label">Min</div>
              <div className="stat-value">{statistics.min.toFixed(2)} {unit}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Mean</div>
              <div className="stat-value">{statistics.mean.toFixed(2)} {unit}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Max</div>
              <div className="stat-value">{statistics.max.toFixed(2)} {unit}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Range</div>
              <div className="stat-value">{statistics.range.toFixed(2)} {unit}</div>
            </div>
          </div>
        )}
      </div>
      
      {histogramTrace && (
        <div className="plot-section">
          <h4>Frequency Distribution</h4>
          <Plot
            data={[histogramTrace]}
            layout={histogramLayout}
            config={config}
            style={{ width: '100%' }}
          />
        </div>
      )}
      
      {scatterTrace && (
        <div className="plot-section">
          <h4>Depth vs {variableName}</h4>
          <Plot
            data={[scatterTrace]}
            layout={scatterLayout}
            config={config}
            style={{ width: '100%' }}
          />
        </div>
      )}
      
      {statistics && statistics.depthDistribution && (
        <div className="depth-distribution-section">
          <h4>Depth Distribution</h4>
          <div className="depth-bins">
            {Object.entries(statistics.depthDistribution).map(([range, count]) => (
              <div key={range} className="depth-bin">
                <div className="bin-label">{range}</div>
                <div className="bin-bar-container">
                  <div 
                    className="bin-bar" 
                    style={{ 
                      width: `${(count / Math.max(...Object.values(statistics.depthDistribution))) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="bin-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="distribution-footer">
        <p className="distribution-note">
          ℹ️ These are raw distributions showing data structure only. No interpretation applied.
        </p>
      </div>
    </div>
  );
}
