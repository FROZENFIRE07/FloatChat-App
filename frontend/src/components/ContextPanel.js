import React from 'react';
import './ContextPanel.css';

/**
 * ContextPanel - Right-side panel showing parsed intent and controls
 * 
 * Purpose: Build trust by showing what the system understood
 * Behavior: Collapsible, never mandatory
 * Design: Calm, informative, not overwhelming
 */

function ContextPanel({ intent, onRefine, isOpen = true, onToggle }) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  
  if (!isOpen) {
    return (
      <button 
        className="context-panel-toggle context-panel-toggle--closed"
        onClick={onToggle}
        aria-label="Open context panel"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }
  
  return (
    <div className="context-panel">
      <button 
        className="context-panel-toggle"
        onClick={onToggle}
        aria-label="Close context panel"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {intent && (
        <>
          <div className="context-section">
            <h3 className="context-section-title">Parsed Intent</h3>
            <div className="intent-summary">
              {intent.variable && (
                <div className="intent-item">
                  <span className="intent-label">Variable</span>
                  <span className="intent-value">{intent.variable}</span>
                </div>
              )}
              {intent.region_semantic && (
                <div className="intent-item">
                  <span className="intent-label">Region</span>
                  <span className="intent-value">{intent.region_semantic}</span>
                </div>
              )}
              {intent.time_semantic && (
                <div className="intent-item">
                  <span className="intent-label">Time</span>
                  <span className="intent-value">{intent.time_semantic}</span>
                </div>
              )}
              {intent.intent_type && (
                <div className="intent-item">
                  <span className="intent-label">Query Type</span>
                  <span className="intent-value">
                    {intent.intent_type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {onRefine && (
            <button className="refine-button" onClick={onRefine}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 3L8 8L13 13M3 3L8 8L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refine Query
            </button>
          )}
          
          <div className="advanced-options">
            <button 
              className="advanced-options-toggle"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              aria-expanded={advancedOpen}
            >
              <span>Advanced Options</span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none"
                style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease-out' }}
              >
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className={`advanced-options-content ${advancedOpen ? 'advanced-options-content--expanded' : ''}`}>
              <div className="advanced-option-item">
                <label className="advanced-option-label" htmlFor="depth-range">
                  Depth Range (m)
                </label>
                <input 
                  id="depth-range"
                  type="text" 
                  className="advanced-option-input" 
                  placeholder="0-2000"
                  defaultValue="0-2000"
                />
              </div>
              
              <div className="advanced-option-item">
                <label className="advanced-option-label" htmlFor="result-limit">
                  Result Limit
                </label>
                <input 
                  id="result-limit"
                  type="number" 
                  className="advanced-option-input" 
                  placeholder="1000"
                  defaultValue="1000"
                />
              </div>
            </div>
          </div>
        </>
      )}
      
      {!intent && (
        <div className="context-empty">
          <p className="context-empty-text">
            Submit a query to see parsed intent
          </p>
        </div>
      )}
    </div>
  );
}

export default ContextPanel;
