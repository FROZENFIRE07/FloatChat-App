import React from 'react';
import Plot from 'react-plotly.js';
import './CoverageDensity.css';

/**
 * CoverageDensity Component
 * 
 * Purpose: Show how dense or sparse data is
 * 
 * Design Rules:
 * - Heatmaps show point density
 * - Coverage overlays show well-sampled vs sparse regions
 * - No interpretation of why regions are sparse/dense
 * - Helps answer: "Is this region well-sampled?"
 * 
 * Answers:
 * - "Where is data coverage best?"
 * - "Which areas are under-sampled?"
 * - "How is measurement density distributed?"
 */

export default function CoverageDensity({ 
  floats = [],
  gridSize = 20 // Number of bins for heatmap
}) {
  
  if (!floats || floats.length === 0) {
    return (
      <div className="coverage-density-container">
        <div className="coverage-header">
          <h3>Coverage & Density</h3>
        </div>
        <div className="no-data">
          <p>No coverage data available</p>
        </div>
      </div>
    );
  }
  
  // Calculate density heatmap
  const densityData = calculateDensityHeatmap(floats, gridSize);
  
  // Prepare heatmap trace
  const heatmapTrace = {
    z: densityData.z,
    x: densityData.x,
    y: densityData.y,
    type: 'heatmap',
    colorscale: [
      [0, '#f0f0f0'],      // No data: Very light gray
      [0.2, '#cceeff'],    // Low density: Light blue
      [0.4, '#99ddff'],    // Low-medium: Medium blue
      [0.6, '#0099cc'],    // Medium: Strong blue
      [0.8, '#0066cc'],    // High: Deep blue
      [1, '#003366']       // Very high: Very deep blue
    ],
    colorbar: {
      title: 'Measurement<br>Count',
      thickness: 20,
      len: 0.7
    },
    hovertemplate: 'Lat: %{y:.2f}°<br>Lon: %{x:.2f}°<br>Count: %{z}<extra></extra>'
  };
  
  const layout = {
    title: null,
    xaxis: {
      title: 'Longitude',
      showgrid: false,
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    yaxis: {
      title: 'Latitude',
      showgrid: false,
      color: '#94a3b8',
      titlefont: { color: '#e8f4f8' }
    },
    margin: {
      l: 60,
      r: 80,
      t: 20,
      b: 60
    },
    height: 500,
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
  
  // Calculate coverage statistics
  const coverageStats = calculateCoverageStats(densityData);
  
  return (
    <div className="coverage-density-container">
      <div className="coverage-header">
        <h3>Coverage & Density</h3>
        <div className="coverage-summary">
          <div className="coverage-stat">
            <span className="stat-label">Total Measurements:</span>
            <span className="stat-value">{floats.length}</span>
          </div>
          <div className="coverage-stat">
            <span className="stat-label">Coverage Area:</span>
            <span className="stat-value">
              {coverageStats.latRange.toFixed(1)}° × {coverageStats.lonRange.toFixed(1)}°
            </span>
          </div>
          <div className="coverage-stat">
            <span className="stat-label">Mean Density:</span>
            <span className="stat-value">{coverageStats.meanDensity.toFixed(1)} pts/cell</span>
          </div>
        </div>
      </div>
      
      <Plot
        data={[heatmapTrace]}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
      />
      
      <div className="density-interpretation">
        <h4>Density Breakdown</h4>
        <div className="density-levels">
          <div className="density-level">
            <div className="level-indicator" style={{backgroundColor: '#1e293b'}}></div>
            <div className="level-info">
              <div className="level-name">No Data</div>
              <div className="level-description">No measurements in this cell</div>
            </div>
          </div>
          <div className="density-level">
            <div className="level-indicator" style={{backgroundColor: '#64b5f6'}}></div>
            <div className="level-info">
              <div className="level-name">Low Coverage</div>
              <div className="level-description">Sparse measurements</div>
            </div>
          </div>
          <div className="density-level">
            <div className="level-indicator" style={{backgroundColor: '#00d9ff'}}></div>
            <div className="level-info">
              <div className="level-name">High Coverage</div>
              <div className="level-description">Dense measurements</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="coverage-footer">
        <p className="coverage-note">
          ℹ️ Darker areas indicate more measurements. This shows data density only, not data quality or scientific meaning.
        </p>
      </div>
    </div>
  );
}

// Helper: Calculate density heatmap from float positions
function calculateDensityHeatmap(floats, gridSize) {
  // Find bounds
  const lats = floats.map(f => f.latitude);
  const lons = floats.map(f => f.longitude);
  
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  
  // Create grid
  const latStep = (latMax - latMin) / gridSize;
  const lonStep = (lonMax - lonMin) / gridSize;
  
  const xBins = Array.from({ length: gridSize }, (_, i) => lonMin + i * lonStep + lonStep / 2);
  const yBins = Array.from({ length: gridSize }, (_, i) => latMin + i * latStep + latStep / 2);
  
  // Initialize count matrix
  const z = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  // Count points in each cell
  floats.forEach(float => {
    const latIdx = Math.min(Math.floor((float.latitude - latMin) / latStep), gridSize - 1);
    const lonIdx = Math.min(Math.floor((float.longitude - lonMin) / lonStep), gridSize - 1);
    
    if (latIdx >= 0 && latIdx < gridSize && lonIdx >= 0 && lonIdx < gridSize) {
      z[latIdx][lonIdx]++;
    }
  });
  
  return { x: xBins, y: yBins, z };
}

// Helper: Calculate coverage statistics
function calculateCoverageStats(densityData) {
  const { x, y, z } = densityData;
  
  const latRange = Math.max(...y) - Math.min(...y);
  const lonRange = Math.max(...x) - Math.min(...x);
  
  const allCounts = z.flat();
  const totalMeasurements = allCounts.reduce((a, b) => a + b, 0);
  const nonZeroCells = allCounts.filter(c => c > 0).length;
  const meanDensity = nonZeroCells > 0 ? totalMeasurements / nonZeroCells : 0;
  
  return {
    latRange,
    lonRange,
    meanDensity,
    nonZeroCells,
    totalCells: allCounts.length
  };
}
