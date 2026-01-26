import React from 'react';
import './QueryInput.css';

/**
 * QueryInput - Natural Language Query Interface
 * 
 * Design: Conversation-style, not a form
 * Behavior: Animates upward when results appear
 * Interaction: Instant feedback, no spinners
 */

function QueryInput({ onSubmit, hasResults = false, placeholder }) {
  const [query, setQuery] = React.useState('');
  const textareaRef = React.useRef(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query);
      setQuery('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [query]);
  
  return (
    <div className={`query-input-container ${hasResults ? 'query-input-container--with-results' : ''}`}>
      <form onSubmit={handleSubmit} className="query-input-wrapper">
        <textarea
          ref={textareaRef}
          className="query-input"
          placeholder={placeholder || "Ask about ocean data..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
          aria-label="Enter your ocean data query"
        />
        {query.trim() && (
          <button 
            type="submit" 
            className="query-submit-button"
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
      </form>
    </div>
  );
}

export default QueryInput;
