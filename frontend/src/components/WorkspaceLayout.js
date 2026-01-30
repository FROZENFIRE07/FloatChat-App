import React, { useState } from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import InvalidQueryView from './InvalidQueryView';
import FollowUpChips from './FollowUpChips';
import RegionMapVisualization from './RegionMapVisualization';
import TimeSlider from './TimeSlider';
import SecondaryVisualization from './SecondaryVisualization';
import ExplanationPanel from './ExplanationPanel';
import AIInsightCard from './AIInsightCard';
import './WorkspaceLayout.css';

/**
 * WorkspaceLayout Component - HYBRID AI EXPLANATION
 * 
 * Structure:
 * 1. Hero: Short AI summary (2-3 sentences)
 * 2. Map + AI Insight Card (spatial)
 * 3. Time Chart + AI Insight Card (temporal)
 * 4. Depth Chart + AI Insight Card (depth)
 * 5. Follow-up actions
 * 
 * The ExplanationPanel passes parsed insights via onInsightsReady,
 * which are then displayed near each respective visual.
 */

export default function WorkspaceLayout({
    query,
    intent,
    data,
    isInvalid = false,
    onNewQuery,
    onReset,
    onFollowUp,
    onTrySuggestion,
    onFloatClick
}) {
    const [insights, setInsights] = useState({
        spatial: '',
        temporal: '',
        depth: ''
    });
    const [insightsLoading, setInsightsLoading] = useState(true);

    const hasVisualizationData = data && data.length > 0;

    // Region boundary for map - prioritize spatialMeta from backend
    // This enables circle visualization for landmark queries (cities, ports)
    const regionBounds = React.useMemo(() => {
        // For landmark queries (cities, ports), use spatialMeta with centroid and radius
        if (intent?.spatialMeta) {
            const meta = intent.spatialMeta;
            console.log('🎯 WorkspaceLayout: Using spatialMeta for region', meta);
            return {
                // Include bbox coords for map bounds calculation
                latMin: intent.region?.latMin || null,
                latMax: intent.region?.latMax || null,
                lonMin: intent.region?.lonMin || null,
                lonMax: intent.region?.lonMax || null,
                // Include spatialMeta for circle rendering
                centroid: meta.centroid,
                adaptiveRadiusKm: meta.adaptiveRadiusKm,
                displayName: meta.displayName,
                isOceanRegion: meta.isOceanRegion,
                source: meta.source
            };
        }

        // For ocean queries, use semantic region names
        const regionMap = {
            arabian_sea: { latMin: 8, latMax: 25, lonMin: 50, lonMax: 75 },
            bay_of_bengal: { latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 },
            indian_ocean: { latMin: -30, latMax: 30, lonMin: 40, lonMax: 100 }
        };

        if (intent?.region_semantic && regionMap[intent.region_semantic]) {
            return regionMap[intent.region_semantic];
        }

        return intent?.region || null;
    }, [intent?.spatialMeta, intent?.region_semantic, intent?.region]);

    const variable = intent?.variable || (intent?.variables && intent.variables[0]) || 'temperature';

    const regionName = intent?.region?.name ||
        (intent?.region_semantic ? intent.region_semantic.replace(/_/g, ' ') : 'Selected Region');

    const timePeriod = intent?.time_semantic ||
        (intent?.start_date ? new Date(intent.start_date).getFullYear().toString() : '');

    const handleInsightsReady = (newInsights) => {
        setInsights(newInsights);
        setInsightsLoading(false);
    };

    return (
        <div className="workspace-layout">
            <div className="workspace-background" />

            <WorkspaceHeader
                querySummary={query}
                onNewQuery={onNewQuery}
                onReset={onReset}
            />

            <div className="workspace-content">
                {isInvalid ? (
                    <InvalidQueryView
                        query={query}
                        onTrySuggestion={onTrySuggestion}
                    />
                ) : hasVisualizationData ? (
                    <div className="explanation-first-layout">

                        {/* ========== HERO: SHORT AI SUMMARY ========== */}
                        <section className="hero-section">
                            <div className="hero-title">
                                <h1 className="query-title">
                                    {variable.charAt(0).toUpperCase() + variable.slice(1)} in {regionName}
                                    {timePeriod && <span className="time-badge">{timePeriod}</span>}
                                </h1>
                            </div>

                            <ExplanationPanel
                                query={query}
                                intent={intent}
                                data={data}
                                isVisible={true}
                                displayContext="detailed"
                                isHero={true}
                                onInsightsReady={handleInsightsReady}
                            />
                        </section>

                        {/* ========== SPATIAL: MAP + INSIGHT ========== */}
                        <section className="evidence-section">
                            <h2 className="section-header">Spatial Distribution</h2>
                            <div className="evidence-grid">
                                <div className="evidence-map">
                                    <RegionMapVisualization
                                        floats={data}
                                        variable={variable}
                                        region={regionBounds}
                                        onFloatClick={onFloatClick}
                                    />
                                    <AIInsightCard
                                        title="Spatial Pattern"
                                        insight={insights.spatial}
                                        isLoading={insightsLoading}
                                    />
                                </div>

                                <div className="evidence-context">
                                    <div className="context-stat">
                                        <span className="stat-label">Profiles</span>
                                        <span className="stat-value">{data.length.toLocaleString()}</span>
                                    </div>
                                    <div className="context-stat">
                                        <span className="stat-label">Coverage</span>
                                        <span className="stat-value">0–2000 m</span>
                                    </div>
                                    <div className="context-stat">
                                        <span className="stat-label">Source</span>
                                        <span className="stat-value">ARGO Floats</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ========== BEHAVIORAL: TIME + DEPTH ========== */}
                        <section className="behavior-section">
                            {/* Temporal */}
                            <div className="behavior-block">
                                <h2 className="section-header">Temporal Pattern</h2>
                                <div className="behavior-chart">
                                    <TimeSlider
                                        floats={data}
                                        minTime={intent?.start_time || intent?.start_date}
                                        maxTime={intent?.end_time || intent?.end_date}
                                    />
                                </div>
                                <AIInsightCard
                                    title="Over Time"
                                    insight={insights.temporal}
                                    isLoading={insightsLoading}
                                />
                            </div>

                            {/* Depth */}
                            <div className="behavior-block">
                                <h2 className="section-header">Depth Distribution</h2>
                                <div className="behavior-chart">
                                    <SecondaryVisualization
                                        floats={data}
                                        variable={variable}
                                    />
                                </div>
                                <AIInsightCard
                                    title="Depth Effects"
                                    insight={insights.depth}
                                    isLoading={insightsLoading}
                                />
                            </div>
                        </section>

                        {/* ========== EXPLORE FURTHER ========== */}
                        <section className="explore-section">
                            <FollowUpChips
                                intent={intent}
                                data={data}
                                onChipClick={onFollowUp}
                            />
                        </section>
                    </div>
                ) : (
                    <div className="visualization-empty">
                        <p>No data to display</p>
                    </div>
                )}
            </div>
        </div>
    );
}
