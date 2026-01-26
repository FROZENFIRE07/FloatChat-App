import React, { useState, useEffect, useRef } from 'react';
import './TimeSlider.css';

/**
 * TimeSlider Component
 * 
 * Purpose: Physical control for time (not a filter)
 * 
 * Design Philosophy:
 * - Time is a continuous dimension, not discrete steps
 * - Slider animates data appearing/disappearing on map
 * - Smooth easing like ocean tides
 * - No page reloads, no jarring transitions
 * - Time changes map state directly
 */

export default function TimeSlider({ 
  floats = [],
  minTime,
  maxTime,
  onTimeRangeChange,
  className = ''
}) {
  // Calculate time bounds from floats if not provided
  const timeBounds = React.useMemo(() => {
    if (minTime && maxTime) {
      return {
        min: new Date(minTime).getTime(),
        max: new Date(maxTime).getTime()
      };
    }

    if (floats.length === 0) {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        min: oneMonthAgo.getTime(),
        max: now.getTime()
      };
    }

    const timestamps = floats
      .map(f => {
        const timeField = f.time || f.timestamp;
        return timeField ? new Date(timeField).getTime() : null;
      })
      .filter(t => t !== null && !isNaN(t));

    if (timestamps.length === 0) {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        min: oneMonthAgo.getTime(),
        max: now.getTime()
      };
    }

    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    };
  }, [floats, minTime, maxTime]);

  // State for slider values (range)
  const [startValue, setStartValue] = useState(timeBounds.min);
  const [endValue, setEndValue] = useState(timeBounds.max);
  const [isDragging, setIsDragging] = useState(false);

  // Update when time bounds change
  useEffect(() => {
    setStartValue(timeBounds.min);
    setEndValue(timeBounds.max);
  }, [timeBounds.min, timeBounds.max]);

  // Notify parent on change (debounced for smooth animation)
  const timeoutRef = useRef(null);
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Skip the first initialization to prevent immediate filtering
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (onTimeRangeChange) {
        onTimeRangeChange({
          start: new Date(startValue),
          end: new Date(endValue)
        });
      }
    }, 100); // Short debounce for smooth updates

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startValue, endValue, onTimeRangeChange]);

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate percentage positions
  const startPercent = ((startValue - timeBounds.min) / (timeBounds.max - timeBounds.min)) * 100;
  const endPercent = ((endValue - timeBounds.min) / (timeBounds.max - timeBounds.min)) * 100;

  const handleStartChange = (e) => {
    const value = parseInt(e.target.value);
    setStartValue(Math.min(value, endValue));
    setIsDragging(true);
  };

  const handleEndChange = (e) => {
    const value = parseInt(e.target.value);
    setEndValue(Math.max(value, startValue));
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`time-slider-container ${className}`}>
      <div className="time-slider-header">
        <div className="time-slider-label">Time Range</div>
        <div className="time-slider-dates">
          <span className="time-date">{formatDate(startValue)}</span>
          <span className="time-separator">→</span>
          <span className="time-date">{formatDate(endValue)}</span>
        </div>
      </div>

      <div className="time-slider-track-container">
        <div className="time-slider-track">
          {/* Selected range highlight */}
          <div 
            className="time-slider-range"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`
            }}
          />

          {/* Start handle */}
          <input
            type="range"
            min={timeBounds.min}
            max={timeBounds.max}
            value={startValue}
            onChange={handleStartChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="time-slider-input time-slider-start"
            aria-label="Start time"
          />

          {/* End handle */}
          <input
            type="range"
            min={timeBounds.min}
            max={timeBounds.max}
            value={endValue}
            onChange={handleEndChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="time-slider-input time-slider-end"
            aria-label="End time"
          />
        </div>

        {/* Time axis labels */}
        <div className="time-slider-axis">
          <span className="axis-label">{formatDate(timeBounds.min)}</span>
          <span className="axis-label">{formatDate(timeBounds.max)}</span>
        </div>
      </div>
    </div>
  );
}
