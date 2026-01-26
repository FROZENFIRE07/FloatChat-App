import React from 'react';
import './InvalidQueryView.css';

/**
 * InvalidQueryView Component
 * 
 * Purpose: Graceful handling for meaningless or unmapped queries
 * 
 * Design Philosophy:
 * - No error tone, no red warnings
 * - System stays calm
 * - Soft suggestions, not corrections
 */

const EXAMPLE_QUERIES = [
    "Show temperature in Arabian Sea in 2019",
    "What ARGO profiles were recorded in the Bay of Bengal?",
    "Display salinity measurements during monsoon season"
];

export default function InvalidQueryView({ query, onTrySuggestion }) {
    return (
        <div className="invalid-query-view">
            <div className="invalid-content">
                {/* Main message - calm, not alarming */}
                <h2 className="invalid-message">
                    This question doesn't map to available data.
                </h2>

                {/* Soft suggestions */}
                <div className="suggestions-container">
                    <p className="suggestions-intro">Try asking about:</p>
                    <ul className="suggestions-list">
                        <li>Temperature, salinity, or depth data</li>
                        <li>Specific ocean regions (Arabian Sea, Bay of Bengal, etc.)</li>
                        <li>Time periods (months, years, seasons)</li>
                    </ul>
                </div>

                {/* Example queries */}
                <div className="examples-container">
                    <p className="examples-intro">Example questions:</p>
                    <div className="examples-list">
                        {EXAMPLE_QUERIES.map((example, index) => (
                            <button
                                key={index}
                                className="example-btn"
                                onClick={() => onTrySuggestion?.(example)}
                            >
                                "{example}"
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
