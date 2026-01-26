import React from 'react';
import './IntentLockStrip.css';

/**
 * IntentLockStrip Component
 * 
 * Purpose: Confirm intent detection before showing data
 * 
 * Design Philosophy:
 * - Build trust by showing what was understood
 * - Prevent silent misinterpretation
 * - Allow correction before data loads
 * - Non-dismissable until confirmed
 */

export default function IntentLockStrip({ intent, onConfirm, onEdit }) {
  if (!intent) return null;

  const { variable, region_semantic, time_semantic, start_time, end_time, demo_mode } = intent;

  // Format region name
  const regionDisplay = region_semantic 
    ? region_semantic.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Unspecified Region';

  // Format time range
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const timeDisplay = time_semantic || 
    (start_time && end_time 
      ? `${formatDate(start_time)} – ${formatDate(end_time)}`
      : 'Available time period');

  const variableDisplay = variable 
    ? variable.charAt(0).toUpperCase() + variable.slice(1)
    : 'Temperature';

  return (
    <div className="intent-lock-strip">
      <div className="intent-lock-content">
        <div className="intent-lock-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M6 10 l3 3 l5 -6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="intent-lock-label">
          <span className="intent-type">Spatial–Temporal Query{demo_mode ? ' (Demo Mode)' : ' Detected'}</span>
          {demo_mode && <span className="demo-badge">No AI Required</span>}
        </div>

        <div className="intent-lock-details">
          <div className="intent-param">
            <span className="param-label">Region:</span>
            <span className="param-value">{regionDisplay}</span>
          </div>
          <div className="intent-param">
            <span className="param-label">Time:</span>
            <span className="param-value">{timeDisplay}</span>
          </div>
          <div className="intent-param">
            <span className="param-label">Variable:</span>
            <span className="param-value">{variableDisplay}</span>
          </div>
        </div>

        <div className="intent-lock-actions">
          {!demo_mode && (
            <button 
              className="btn-intent-edit" 
              onClick={onEdit}
              aria-label="Edit parameters"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit
            </button>
          )}
          <button 
            className="btn-intent-confirm" 
            onClick={onConfirm}
            aria-label="Confirm and proceed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8 l3 3 l7 -7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {demo_mode ? 'Show Visualization' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
