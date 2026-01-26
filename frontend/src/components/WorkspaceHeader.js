import React from 'react';
import './WorkspaceHeader.css';

/**
 * WorkspaceHeader Component
 * 
 * Purpose: Thin, calm header for the workspace
 * 
 * Design Philosophy:
 * - Always present, never loud
 * - No shadows, no separators — just spacing and contrast
 * - Minimal controls: New Query, Reset
 */

export default function WorkspaceHeader({
    querySummary = '',
    onNewQuery,
    onReset,
    onHistoryOpen
}) {
    // Shorten query if too long
    const displayQuery = querySummary.length > 60
        ? querySummary.substring(0, 60) + '...'
        : querySummary;

    return (
        <header className="workspace-header">
            {/* Left: Logo */}
            <div className="workspace-header-left">
                <span className="workspace-logo">FloatChat</span>
            </div>

            {/* Center: Query summary */}
            <div className="workspace-header-center">
                <span className="query-summary">{displayQuery}</span>
            </div>

            {/* Right: Controls */}
            <div className="workspace-header-right">
                <button className="header-btn header-btn--primary" onClick={onNewQuery}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    New Query
                </button>
                <button className="header-btn" onClick={onReset}>
                    Reset
                </button>
            </div>
        </header>
    );
}
