import React from 'react';
import NearestFloatsView from './NearestFloatsView';
import VerticalProfileView from './VerticalProfileView';
import AggregationView from './AggregationView';
import DataAvailabilityView from './DataAvailabilityView';
import Category1ExplorationMode from './Category1ExplorationMode';
import './IntentResponseView.css';

/**
 * IntentResponseView Component
 * 
 * Purpose: Route to correct visualization based on intent_type
 * 
 * Design Philosophy:
 * - One intent → one visualization strategy
 * - Frontend reacts, does NOT interpret
 * - Render ONLY what is required for that intent
 * - NO unused components rendered
 */

export default function IntentResponseView({ 
  intent, 
  data,
  query,
  onBack,
  onFloatClick,
  onEditIntent,
  isEmbedded = false  // If true, render in compact mode
}) {
  if (!intent || !intent.intent_type) {
    return (
      <div className="intent-response-view">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to process query</h3>
          <p>The system could not understand your question. Please try rephrasing.</p>
          {onBack && (
            <button className="btn-retry" onClick={onBack}>
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  const intentType = intent.intent_type;

  // Route to appropriate visualization
  switch (intentType) {
    case 'SPATIAL_TEMPORAL_QUERY':
      // For spatial-temporal, use the existing Category1 component
      // or render in embedded mode
      if (isEmbedded) {
        return (
          <div className="intent-response-view spatial-temporal">
            <Category1ExplorationMode
              query={query}
              intent={intent}
              floats={data}
              onBack={onBack}
              onEditIntent={onEditIntent}
            />
          </div>
        );
      }
      // Full-page mode - let parent handle
      return null;

    case 'NEAREST_FLOAT_QUERY':
      return (
        <div className="intent-response-view nearest-float">
          <NearestFloatsView
            intent={intent}
            data={data}
            onFloatClick={onFloatClick}
          />
        </div>
      );

    case 'VERTICAL_PROFILE_QUERY':
      return (
        <div className="intent-response-view vertical-profile">
          <VerticalProfileView
            intent={intent}
            data={data}
            onBack={onBack}
          />
        </div>
      );

    case 'AGGREGATION_QUERY':
      return (
        <div className="intent-response-view aggregation">
          <AggregationView
            intent={intent}
            data={data}
          />
        </div>
      );

    case 'DATA_AVAILABILITY_QUERY':
      return (
        <div className="intent-response-view availability">
          <DataAvailabilityView
            intent={intent}
            data={data}
          />
        </div>
      );

    default:
      return (
        <div className="intent-response-view">
          <div className="unsupported-intent">
            <div className="unsupported-icon">🤔</div>
            <h3>Unsupported Query Type</h3>
            <p>
              Intent type <code>{intentType}</code> is not yet supported.
            </p>
            <p className="supported-list">
              Supported types: Spatial-Temporal, Nearest Float, Vertical Profile, 
              Aggregation, Data Availability
            </p>
            {onBack && (
              <button className="btn-retry" onClick={onBack}>
                Try a Different Question
              </button>
            )}
          </div>
        </div>
      );
  }
}
