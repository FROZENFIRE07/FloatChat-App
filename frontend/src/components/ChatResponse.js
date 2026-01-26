import React from 'react';
import './ChatResponse.css';
import FloatMap from './FloatMap';
import VerticalProfile from './VerticalProfile';
import TemporalDistribution from './TemporalDistribution';
import ValueDistribution from './ValueDistribution';
import CoverageDensity from './CoverageDensity';

/**
 * ChatResponse - A single response block in the conversation
 * 
 * Structure:
 * 1. Natural language explanation (always)
 * 2. Contextual visualization (conditional based on intent)
 * 
 * Design Philosophy:
 * - Text is primary, visuals are secondary
 * - Only show what's needed for this specific query
 * - Calm, factual tone - no AI personality
 */

function ChatResponse({ 
  query,
  intent, 
  explanation,
  data,
  onFloatSelect
}) {
  const [expanded, setExpanded] = React.useState(true);

  // Determine which visualizations to show based on intent type
  const shouldShowMap = intent && (
    intent.intent_type === 'SPATIAL_TEMPORAL_QUERY' ||
    intent.intent_type === 'NEAREST_FLOAT' ||
    intent.region || intent.region_semantic
  );

  const shouldShowProfile = data?.selectedProfile && data.selectedProfile.length > 0;
  
  const shouldShowTemporal = data?.availability || data?.activeFloats;
  
  const shouldShowDistribution = data?.statistics && data?.floats?.length > 0;
  
  const shouldShowCoverage = data?.floats?.length > 0;

  return (
    <div className="chat-response">
      {/* User Query (Echo) */}
      <div className="chat-response-query">
        <div className="query-marker">Q</div>
        <div className="query-text">{query}</div>
      </div>

      {/* System Response */}
      <div className="chat-response-content">
        {/* Natural Language Explanation (Always) */}
        <div className="response-explanation">
          <div className="explanation-marker">A</div>
          <div className="explanation-text">
            <p>{explanation}</p>
            
            {/* Intent Summary (Subtle) */}
            {intent && (
              <div className="intent-summary">
                {intent.variable && (
                  <span className="intent-tag">
                    <span className="intent-label">Variable:</span>
                    <span className="intent-value">{intent.variable}</span>
                  </span>
                )}
                {intent.time_semantic && (
                  <span className="intent-tag">
                    <span className="intent-label">Time:</span>
                    <span className="intent-value">{intent.time_semantic}</span>
                  </span>
                )}
                {(intent.region || intent.region_semantic) && (
                  <span className="intent-tag">
                    <span className="intent-label">Region:</span>
                    <span className="intent-value">{intent.region || intent.region_semantic}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contextual Visualizations (Conditional) */}
        {expanded && (
          <div className="response-visualizations">
            {/* Map - Only if spatial intent exists */}
            {shouldShowMap && data?.floats && data.floats.length > 0 && (
              <div className="viz-section">
                <FloatMap
                  floats={data.floats}
                  variable={intent?.variable || 'temperature'}
                  onFloatSelect={onFloatSelect}
                />
              </div>
            )}

            {/* Vertical Profile - Only if float selected */}
            {shouldShowProfile && (
              <div className="viz-section">
                <VerticalProfile
                  profiles={data.selectedProfile}
                  variable={intent?.variable || 'temperature'}
                />
              </div>
            )}

            {/* Temporal Distribution */}
            {shouldShowTemporal && (
              <div className="viz-section">
                <TemporalDistribution
                  availability={data.availability}
                  activeFloats={data.activeFloats}
                />
              </div>
            )}

            {/* Value Distribution */}
            {shouldShowDistribution && (
              <div className="viz-section">
                <ValueDistribution
                  statistics={data.statistics.statistics}
                  measurements={data.floats}
                  variable={intent?.variable || 'temperature'}
                />
              </div>
            )}

            {/* Coverage Density */}
            {shouldShowCoverage && (
              <div className="viz-section">
                <CoverageDensity floats={data.floats} />
              </div>
            )}

            {/* No Data State */}
            {!shouldShowMap && !shouldShowProfile && !shouldShowTemporal && 
             !shouldShowDistribution && !shouldShowCoverage && (
              <div className="viz-section viz-empty">
                <p>No visualizations available for this query.</p>
              </div>
            )}
          </div>
        )}

        {/* Collapse/Expand Toggle */}
        <button 
          className="response-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse response' : 'Expand response'}
        >
          {expanded ? 'Collapse' : 'Expand'} visualizations
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path 
              d="M4 6l4 4 4-4" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatResponse;
