import React from 'react';
import './AIInsightCard.css';

/**
 * AIInsightCard Component
 * 
 * Small AI insight card that appears near each visual.
 * Used for micro-explanations that anchor the user's attention.
 */

export default function AIInsightCard({ title, insight, isLoading = false }) {
    if (!insight && !isLoading) return null;

    return (
        <div className="ai-insight-card">
            <div className="insight-header">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M8 5.5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="insight-title">{title || 'AI Insight'}</span>
            </div>
            <p className="insight-text">
                {isLoading ? (
                    <span className="insight-loading">Analyzing...</span>
                ) : (
                    insight
                )}
            </p>
        </div>
    );
}
