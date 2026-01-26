import React from 'react';
import './LandingPage.css';
import BubbleBackground from './BubbleBackground';
import MorphingCursor from './MorphingCursor';

/**
 * LandingPage - First impression for FloatChat
 * 
 * Design Philosophy:
 * - Minimal, not empty
 * - Calm, not dull
 * - Confident, not loud
 * - One purpose: invite the user to ask a question
 */

function LandingPage({ onStartQuery, onStartDemo, isTransitioning, errorMessage }) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onStartQuery(query);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`landing-page ${isTransitioning ? 'transitioning' : ''}`}>
      <MorphingCursor isTransitioning={isTransitioning} />
      <BubbleBackground isSlowed={isTransitioning} />
      <div className={`hero-section ${isTransitioning ? 'fade-out' : ''}`}>
        <div className="hero-logo">
          FloatChat
        </div>

        <h1 className="hero-headline">
          Explore the ocean by asking questions.
        </h1>

        <p className="hero-subheadline">
          Natural language access to global ARGO float data.
        </p>

        {/* Error message from previous failed query */}
        {errorMessage && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`hero-input-container ${isTransitioning ? 'slide-to-bottom' : ''}`}>
          <div className="hero-input-wrapper">
            <textarea
              className="hero-input"
              placeholder="Ask something like: Show temperature profiles in the Arabian Sea during January 2019"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
              aria-label="Enter your ocean data query"
              aria-describedby="hero-helper-text"
            />
            {query.trim() && (
              <button
                type="submit"
                className="hero-submit-button"
                aria-label="Submit query"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2 10L18 10M18 10L11 3M18 10L11 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </form>

        <p className="hero-helper-text" id="hero-helper-text">
          No coordinates. No filters. Just ask.
        </p>

        {/* Demo Mode Button */}
        <div className="demo-mode-container">
          <button
            className="btn-demo-mode"
            onClick={onStartDemo}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2 l8 8 l-8 8 l-8 -8 z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
            <span>View Demo: Arabian Sea Temperature</span>
          </button>
          <span className="demo-label">AI Intent Parser Not Required</span>
        </div>

        <div className="hero-scroll-indicator" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="scroll-icon"
          >
            <path
              d="M12 5v14m0 0l-7-7m7 7l7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
