import React from 'react';
import './SkeletonLoader.css';

/**
 * SkeletonLoader - Loading states without spinners
 * 
 * Design: Shimmer animation, calm and smooth
 * Purpose: Maintain spatial relationships during load
 */

export function SkeletonMap() {
  return (
    <div className="skeleton-loader skeleton-map" aria-label="Loading map">
      <span className="sr-only">Loading map...</span>
    </div>
  );
}

export function SkeletonChart({ height = 300 }) {
  return (
    <div className="skeleton-loader skeleton-chart" style={{ height: `${height}px` }} aria-label="Loading chart">
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}

export function SkeletonText({ lines = 3, short = false }) {
  return (
    <div className="skeleton-text-container" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={`skeleton-loader skeleton-text ${short && i === lines - 1 ? 'skeleton-text--short' : ''}`}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-label="Loading card">
      <div className="skeleton-loader skeleton-card-header" />
      <SkeletonText lines={3} short />
      <span className="sr-only">Loading card...</span>
    </div>
  );
}

function SkeletonLoader({ type = 'map', ...props }) {
  switch (type) {
    case 'map':
      return <SkeletonMap {...props} />;
    case 'chart':
      return <SkeletonChart {...props} />;
    case 'text':
      return <SkeletonText {...props} />;
    case 'card':
      return <SkeletonCard {...props} />;
    default:
      return <SkeletonMap {...props} />;
  }
}

export default SkeletonLoader;
