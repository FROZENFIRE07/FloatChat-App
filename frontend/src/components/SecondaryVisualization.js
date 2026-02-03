import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SecondaryVisualization.css';

/**
 * SecondaryVisualization Component
 * 
 * Purpose: Secondary panel after map (only ONE active at a time)
 * 
 * Design Philosophy:
 * - Default: Temporal line chart (value vs time, averaged)
 * - Optional: Depth distribution histogram
 * - Never show multiple charts simultaneously
 * - Collapsible by default, revealed on demand
 */

export default function SecondaryVisualization({
  floats = [],
  variable = 'temperature',
  timeRange = null,
  className = ''
}) {
  const [activeView, setActiveView] = useState('temporal'); // 'temporal' | 'depth' | null
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prepare temporal data (average by date)
  const temporalData = React.useMemo(() => {
    if (floats.length === 0) return [];

    // Group by date and calculate averages
    const dateGroups = {};
    floats.forEach(float => {
      if (!float.time) return;

      const date = new Date(float.time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const value = variable === 'temperature' ? float.temperature : float.salinity;

      if (value !== null && value !== undefined) {
        if (!dateGroups[date]) {
          dateGroups[date] = { values: [], timestamp: new Date(float.time).getTime() };
        }
        dateGroups[date].values.push(value);
      }
    });

    // Calculate averages and sort by time
    return Object.entries(dateGroups)
      .map(([date, group]) => ({
        date,
        timestamp: group.timestamp,
        value: group.values.reduce((a, b) => a + b, 0) / group.values.length,
        count: group.values.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [floats, variable]);

  // Prepare depth distribution data
  const depthData = React.useMemo(() => {
    if (floats.length === 0) return [];

    // Create depth bins (0-500m, 500-1000m, etc.)
    const bins = [
      { range: '0-100m', min: 0, max: 100, count: 0 },
      { range: '100-250m', min: 100, max: 250, count: 0 },
      { range: '250-500m', min: 250, max: 500, count: 0 },
      { range: '500-1000m', min: 500, max: 1000, count: 0 },
      { range: '1000-2000m', min: 1000, max: 2000, count: 0 },
      { range: '>2000m', min: 2000, max: Infinity, count: 0 }
    ];

    floats.forEach(float => {
      if (float.depth !== null && float.depth !== undefined) {
        const bin = bins.find(b => float.depth >= b.min && float.depth < b.max);
        if (bin) bin.count++;
      }
    });

    return bins.filter(b => b.count > 0);
  }, [floats]);

  if (floats.length === 0) return null;

  const variableLabel = variable === 'temperature' ? 'Temperature (°C)' : 'Salinity (PSU)';
  const variableColor = variable === 'temperature' ? '#ff6f61' : '#1976d2';

  return (
    <div className={`secondary-visualization ${className}`}>
      <div className="secondary-viz-header">
        <div className="secondary-viz-title">
          {activeView === 'temporal' ? 'Temporal Distribution' : 'Depth Distribution'}
        </div>

        <div className="secondary-viz-controls">
          <button
            className={`viz-toggle toggle-temporal ${activeView === 'temporal' ? 'active' : ''}`}
            onClick={() => setActiveView('temporal')}
          >
            Time Series
          </button>
          <button
            className={`viz-toggle toggle-depth ${activeView === 'depth' ? 'active' : ''}`}
            onClick={() => setActiveView('depth')}
          >
            Depth
          </button>
          <button
            className="viz-collapse"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M4 6 l4 4 l4 -4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="secondary-viz-content">
          {activeView === 'temporal' && temporalData.length > 0 && (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart data={temporalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isMobile ? "rgba(255, 255, 255, 0.08)" : "#e0e0e0"}
                  vertical={!isMobile}
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[
                    timeRange?.min || 'auto',
                    timeRange?.max || 'auto'
                  ]}
                  scale="time"
                  tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: isMobile ? "rgba(255, 255, 255, 0.55)" : '#607d8b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickCount={isMobile ? 5 : 8}
                  axisLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  tickLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 9 : 11, fill: isMobile ? "rgba(255, 255, 255, 0.55)" : '#607d8b' }}
                  width={isMobile ? 35 : 60}
                  axisLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  tickLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  label={{
                    value: isMobile ? '' : variableLabel, // Hide label on mobile to save space
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#263238' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [value.toFixed(2), variableLabel]}
                  labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                  })}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isMobile ? "#4DA3FF" : variableColor}
                  strokeWidth={2}
                  dot={{ r: 4, fill: isMobile ? "#4DA3FF" : variableColor }}
                  activeDot={{ r: 6, fill: isMobile ? "#7AB8FF" : variableColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeView === 'depth' && depthData.length > 0 && (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart data={depthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isMobile ? "rgba(255, 255, 255, 0.08)" : "#e0e0e0"}
                  vertical={!isMobile}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: isMobile ? 9 : 11, fill: isMobile ? "rgba(255, 255, 255, 0.55)" : '#607d8b' }}
                  interval={isMobile ? 0 : 'preserveStartEnd'}
                  angle={isMobile ? -30 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 50 : 30}
                  axisLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  tickLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  label={{
                    value: isMobile ? '' : 'Depth Range',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fontSize: 12, fill: '#263238' }
                  }}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 9 : 11, fill: isMobile ? "rgba(255, 255, 255, 0.55)" : '#607d8b' }}
                  width={isMobile ? 30 : 60}
                  axisLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  tickLine={{ stroke: isMobile ? "rgba(255, 255, 255, 0.15)" : "#666" }}
                  label={{
                    value: isMobile ? '' : 'Profile Count',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#263238' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [value, 'Profiles']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={isMobile ? "#2EC4B6" : "#26a69a"}
                  strokeWidth={2}
                  dot={{ r: 5, fill: isMobile ? "#3ED6C6" : "#26a69a" }}
                  activeDot={{ r: 7, fill: isMobile ? "#6FE3D8" : "#26a69a" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {((activeView === 'temporal' && temporalData.length === 0) ||
            (activeView === 'depth' && depthData.length === 0)) && (
              <div className="no-data-message">
                No {activeView === 'temporal' ? 'temporal' : 'depth'} data available for visualization
              </div>
            )}
        </div>
      )}
    </div>
  );
}
