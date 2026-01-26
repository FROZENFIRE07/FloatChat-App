import React from 'react';
import './ContextSidebar.css';

/**
 * ContextSidebar Component
 * 
 * Purpose: Floating glass panel showing query context
 * 
 * Design Philosophy:
 * - "Sidebar that is not a sidebar"
 * - Floating rectangular container with rounded corners
 * - Semi-transparent glass effect
 * - Ocean theme visible through it
 * - Read-only — does not control anything
 * 
 * Sections:
 * 1. User Query
 * 2. System Understanding (parsed intent)
 * 3. Data Scope (if valid data exists)
 */

export default function ContextSidebar({ query, intent, dataStats }) {
    // Parse intent for display
    const detectedItems = [];

    if (intent) {
        // Handle both 'variable' (singular) and 'variables' (array)
        const variable = intent.variable || (intent.variables && intent.variables[0]);
        if (variable) {
            detectedItems.push({ label: 'Variable', value: variable });
        }
        if (intent.region_semantic || intent.region?.name) {
            detectedItems.push({
                label: 'Region',
                value: intent.region?.name || intent.region_semantic?.replace(/_/g, ' ')
            });
        }
        // Handle both time_semantic and actual time range
        if (intent.time_semantic) {
            detectedItems.push({ label: 'Time range', value: intent.time_semantic });
        } else if (intent.start_date || intent.start_time) {
            const start = intent.start_date || intent.start_time;
            const end = intent.end_date || intent.end_time;
            if (start && end) {
                const startYear = new Date(start).getFullYear();
                const endYear = new Date(end).getFullYear();
                const timeDesc = startYear === endYear ? startYear.toString() : `${startYear}-${endYear}`;
                detectedItems.push({ label: 'Time range', value: timeDesc });
            }
        }
        if (intent.intent_type) {
            detectedItems.push({
                label: 'Query type',
                value: intent.intent_type.replace(/_/g, ' ').toLowerCase()
            });
        }
    }

    const hasValidData = dataStats && dataStats.count > 0;
    const hasNoScientificIntent = detectedItems.length === 0 && intent;

    return (
        <aside className="context-sidebar">
            {/* Section 1: User Query */}
            <section className="sidebar-section">
                <h3 className="section-title">Your question</h3>
                <p className="section-query">"{query}"</p>
            </section>

            {/* Section 2: System Understanding */}
            <section className="sidebar-section">
                <h3 className="section-title">Detected</h3>
                {hasNoScientificIntent ? (
                    <p className="section-empty">No scientific intent</p>
                ) : detectedItems.length > 0 ? (
                    <ul className="detected-list">
                        {detectedItems.map((item, index) => (
                            <li key={index} className="detected-item">
                                <span className="detected-label">{item.label}:</span>
                                <span className="detected-value">{item.value}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="section-loading">Analyzing...</p>
                )}
            </section>

            {/* Section 3: Data Scope (only if valid data) */}
            {hasValidData && (
                <section className="sidebar-section">
                    <h3 className="section-title">Data scope</h3>
                    <div className="data-scope">
                        {dataStats.source && (
                            <div className="scope-item">
                                <span className="scope-label">Source:</span>
                                <span className="scope-value">{dataStats.source}</span>
                            </div>
                        )}
                        <div className="scope-item">
                            <span className="scope-label">Records:</span>
                            <span className="scope-value">{dataStats.count.toLocaleString()} profiles</span>
                        </div>
                        {dataStats.depthRange && (
                            <div className="scope-item">
                                <span className="scope-label">Coverage:</span>
                                <span className="scope-value">{dataStats.depthRange}</span>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </aside>
    );
}
