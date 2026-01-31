import React, { useState, useEffect, useMemo } from 'react';
import './ThinkingIndicator.css';

/**
 * ThinkingIndicator Component - Redesigned
 * 
 * Purpose: Show the system is processing with intelligent, rotating status messages
 * 
 * Design Philosophy:
 * - Not a spinner-only screen
 * - Single rotating status message (not all at once)
 * - Calm, professional circular animation
 * - Clear messaging about what's happening
 * - System feels like it is thinking, not lagging
 */

const STATUS_MESSAGES = [
  'Query received',
  'Language structure analyzed',
  'Intent extracted',
  'Routing to FloatChat core',
  'Fetching ARGO float data',
  'Preparing response'
];

export default function ThinkingIndicator({ stage = 'understanding', onCancel }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Map stages to message indices for backend-driven progression
  const stageToIndex = useMemo(() => ({
    understanding: 0,
    validating: 2,
    fetching: 4,
    preparing: 5
  }), []);

  // Rotate through messages every 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setMessageIndex(prev => {
          // If we have a stage from backend, jump to at least that index
          const minIndex = stageToIndex[stage] || 0;
          const next = prev + 1;

          // Don't go past the last message, and respect backend stage
          if (next >= STATUS_MESSAGES.length) {
            return STATUS_MESSAGES.length - 1;
          }
          return Math.max(next, minIndex);
        });
        setIsTransitioning(false);
      }, 150);
    }, 3000); // Fixed 3-second interval

    return () => clearTimeout(timer);
  }, [messageIndex, stage, stageToIndex]);

  // Reset to backend stage when it changes
  useEffect(() => {
    const targetIndex = stageToIndex[stage] || 0;
    if (messageIndex < targetIndex) {
      setMessageIndex(targetIndex);
    }
  }, [stage, messageIndex, stageToIndex]);

  return (
    <div className="thinking-indicator-v2">
      {/* Circular animated indicator */}
      <div className="thinking-circle">
        <svg viewBox="0 0 100 100" className="thinking-circle-svg">
          <circle
            className="thinking-circle-track"
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="3"
          />
          <circle
            className="thinking-circle-progress"
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="thinking-circle-core">
          <svg viewBox="0 0 24 24" fill="none" className="thinking-icon-inner">
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Single rotating status message */}
      <div className={`thinking-status ${isTransitioning ? 'transitioning' : ''}`}>
        {STATUS_MESSAGES[messageIndex]}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button className="thinking-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
