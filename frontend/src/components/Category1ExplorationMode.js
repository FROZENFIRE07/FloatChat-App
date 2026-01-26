import React, { useState, useEffect } from 'react';
import IntentLockStrip from './IntentLockStrip';
import RegionMapVisualization from './RegionMapVisualization';
import TimeSlider from './TimeSlider';
import SecondaryVisualization from './SecondaryVisualization';
import RawDataDrawer from './RawDataDrawer';
import './Category1ExplorationMode.css';

/**
 * Category1ExplorationMode Component
 * 
 * Purpose: Complete orchestration of Spatial–Temporal Query experience
 * 
 * Design Philosophy:
 * - Intent confirmation before data display
 * - Map as hero visualization
 * - Time as physical control
 * - Secondary visualizations revealed progressively
 * - Raw data hidden by default
 * - Empty states handled gracefully
 */

export default function Category1ExplorationMode({ 
  query,
  intent,
  floats = [],
  onBack,
  onEditIntent
}) {
  // UI State
  const [isIntentConfirmed, setIsIntentConfirmed] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [filteredFloats, setFilteredFloats] = useState(null);
  const [selectedFloat, setSelectedFloat] = useState(null);
  
  // Memoize floats to prevent infinite renders
  const memoizedFloats = React.useMemo(() => floats, [JSON.stringify(floats)]);
  
  console.log('📍 Category1 render:', { 
    floatsCount: floats.length,
    isConfirmed: isIntentConfirmed,
    hasFiltered: filteredFloats !== null,
    filteredCount: filteredFloats?.length
  });
  
  // Extract intent parameters
  const variable = intent?.variable || 'temperature';
  const region = React.useMemo(() => {
    return intent?.region || null;
  }, [intent?.region]);
  const regionSemantic = intent?.region_semantic || null;

  // Region boundary for map
  const regionMap = {
    arabian_sea: { latMin: 8, latMax: 25, lonMin: 50, lonMax: 75 },
    bay_of_bengal: { latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 },
    indian_ocean: { latMin: -30, latMax: 30, lonMin: 40, lonMax: 100 }
  };
  
  const regionBounds = regionSemantic && regionMap[regionSemantic]
    ? regionMap[regionSemantic]
    : region;

  // Check if query is unsupported (causal, predictive, interpretive)
  const unsupportedPatterns = [
    /why/i,
    /because/i,
    /cause/i,
    /reason/i,
    /predict/i,
    /forecast/i,
    /will be/i,
    /future/i,
    /explain/i,
    /interpretation/i
  ];
  
  const isUnsupported = unsupportedPatterns.some(pattern => pattern.test(query));

  // Handle intent confirmation
  const handleConfirmIntent = () => {
    setIsIntentConfirmed(true);
  };

  // Handle time range change from slider
  const handleTimeRangeChange = React.useCallback(({ start, end }) => {
    if (!memoizedFloats || memoizedFloats.length === 0) return;
    
    const filtered = memoizedFloats.filter(float => {
      const timeField = float.time || float.timestamp;
      if (!timeField) return false;
      
      // Parse timestamp (handle both ISO and SQLite datetime formats)
      const floatTime = new Date(timeField).getTime();
      if (isNaN(floatTime)) return false;
      
      return floatTime >= start.getTime() && floatTime <= end.getTime();
    });
    
    console.log('⏰ Time filter:', { 
      total: memoizedFloats.length, 
      filtered: filtered.length,
      range: { start: start.toISOString(), end: end.toISOString() }
    });
    
    setFilteredFloats(filtered);
  }, [memoizedFloats]);

  // Handle float click for drill-down
  const handleFloatClick = (float) => {
    setSelectedFloat(float);
    // This could trigger Category 2 (Vertical Profile) view
    // For now, just log it
    console.log('Float selected:', float);
  };

  // Empty data state
  const hasData = floats && floats.length > 0;

  return (
    <div className="category1-exploration-mode">
      {/* Background transition effect */}
      <div className="exploration-background"></div>

      {/* Context indicator */}
      <div className="context-indicator">
        Exploration Mode: Ocean Data
      </div>

      {/* Main content */}
      <div className="exploration-content">
        {/* Header with query */}
        <div className="exploration-header">
          <button 
            className="btn-back"
            onClick={onBack}
            aria-label="Back to landing"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4 l-8 6 l8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="exploration-query">
            <div className="query-label">Your Question</div>
            <div className="query-text">"{query}"</div>
          </div>
        </div>

        {/* Unsupported question handling */}
        {isUnsupported && (
          <div className="unsupported-card">
            <div className="unsupported-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#ff6f61" strokeWidth="2" fill="none" />
                <path d="M24 14 v12 M24 30 v2" stroke="#ff6f61" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="unsupported-message">
              <h3>This system shows what data exists, not why it behaves that way.</h3>
              <p>FloatChat displays observational data from ARGO floats. It does not interpret causes, make predictions, or explain phenomena.</p>
            </div>
            <div className="unsupported-suggestions">
              <div className="suggestion-label">Try rephrasing your question:</div>
              <ul>
                <li>"Show me temperature data in the Arabian Sea during January 2019"</li>
                <li>"What ARGO profiles were recorded in this region?"</li>
                <li>"Display salinity measurements near these coordinates"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Normal flow: Intent confirmation + data visualization */}
        {!isUnsupported && (
          <>
            {/* Step 1: Intent Lock Strip (before confirmation) */}
            {!isIntentConfirmed && (
              <IntentLockStrip
                intent={intent}
                onConfirm={handleConfirmIntent}
                onEdit={onEditIntent}
              />
            )}

            {/* Step 2: Data visualization (after confirmation) */}
            {isIntentConfirmed && (
              <>
                {hasData ? (
                  <div className="data-visualization-container">
                    {/* Primary: Region Map */}
                    <div className="visualization-section">
                      <RegionMapVisualization
                        floats={memoizedFloats}
                        variable={variable}
                        region={regionBounds}
                        onFloatClick={handleFloatClick}
                        filteredFloats={filteredFloats}
                      />
                    </div>

                    {/* Time Slider */}
                    <div className="visualization-section">
                      <TimeSlider
                        floats={memoizedFloats}
                        minTime={intent?.start_time}
                        maxTime={intent?.end_time}
                        onTimeRangeChange={handleTimeRangeChange}
                      />
                    </div>

                    {/* Secondary Visualization */}
                    <div className="visualization-section">
                      <SecondaryVisualization
                        floats={filteredFloats || memoizedFloats}
                        variable={variable}
                      />
                    </div>

                    {/* Raw Data Access */}
                    <div className="raw-data-access">
                      <button 
                        className="btn-view-raw-data"
                        onClick={() => setShowRawData(true)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3" width="12" height="2" fill="currentColor" />
                          <rect x="2" y="7" width="12" height="2" fill="currentColor" />
                          <rect x="2" y="11" width="12" height="2" fill="currentColor" />
                        </svg>
                        View raw observations ({memoizedFloats.length} points)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty data state */
                  <div className="empty-data-state">
                    <div className="empty-icon">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <circle cx="40" cy="40" r="35" stroke="#b0bec5" strokeWidth="2" fill="none" />
                        <path d="M28 40 h24 M40 28 v24" stroke="#b0bec5" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="empty-message">
                      <h3>No ARGO profiles were recorded in this region during the selected time window.</h3>
                      <p>This does not mean the ocean was empty—it means no ARGO floats collected data here at this time.</p>
                    </div>
                    <div className="empty-actions">
                      <button className="btn-expand" onClick={onEditIntent}>
                        Expand time range
                      </button>
                      <button className="btn-expand" onClick={onEditIntent}>
                        Expand region
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Raw Data Drawer (overlay) */}
      {showRawData && (
        <RawDataDrawer
          floats={memoizedFloats}
          variable={variable}
          onClose={() => setShowRawData(false)}
        />
      )}
    </div>
  );
}
