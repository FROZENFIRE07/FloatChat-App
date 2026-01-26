import React from 'react';
import './FollowUpChips.css';

/**
 * FollowUpChips Component
 * 
 * Purpose: Context-aware action chips for continuation
 * 
 * Design Philosophy:
 * - Not a chat feed — exploration continuation
 * - Chips are context-aware based on current query/data
 * - Clicking triggers re-query flow
 */

/**
 * Generate follow-up suggestions based on current context
 */
function generateSuggestions(intent, currentData) {
    const suggestions = [];

    if (!intent) return suggestions;

    const variable = intent.variable || 'temperature';
    const region = intent.region_semantic || intent.region?.name || 'this region';

    // Variable-based suggestions
    if (variable === 'temperature') {
        suggestions.push({
            label: 'Switch to salinity',
            query: `Show salinity data in ${region}`
        });
    } else if (variable === 'salinity') {
        suggestions.push({
            label: 'Switch to temperature',
            query: `Show temperature data in ${region}`
        });
    }

    // Region-based suggestions
    if (region.includes('arabian') || region === 'arabian_sea') {
        suggestions.push({
            label: 'Compare with Bay of Bengal',
            query: `Show ${variable} data in Bay of Bengal`
        });
    } else if (region.includes('bengal') || region === 'bay_of_bengal') {
        suggestions.push({
            label: 'Compare with Arabian Sea',
            query: `Show ${variable} data in Arabian Sea`
        });
    }

    // Time-based suggestions
    suggestions.push({
        label: 'Show seasonal variation',
        query: `Show ${variable} seasonal patterns in ${region}`
    });

    // Depth suggestion
    suggestions.push({
        label: 'View depth profiles',
        query: `Show ${variable} depth profiles in ${region}`
    });

    // Limit to 4 suggestions max
    return suggestions.slice(0, 4);
}

export default function FollowUpChips({ intent, data, onChipClick }) {
    const suggestions = generateSuggestions(intent, data);

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="follow-up-chips">
            <span className="chips-label">Continue exploring:</span>
            <div className="chips-container">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        className="follow-up-chip"
                        onClick={() => onChipClick?.(suggestion.query)}
                    >
                        {suggestion.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
