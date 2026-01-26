import React, { useState, useEffect, useCallback, useRef } from 'react';
import argoAPI from '../services/api';
import './ExplanationPanel.css';

/**
 * ExplanationPanel Component - HYBRID MODE
 * 
 * Parses LLM response into summary + insights.
 * Uses refs to prevent infinite API call loops.
 */

export default function ExplanationPanel({
    query,
    intent,
    data,
    displayContext = 'detailed',
    isVisible = true,
    isHero = false,
    onInsightsReady
}) {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [source, setSource] = useState(null);

    // Refs to prevent infinite loops
    const lastFetchedQuery = useRef(null);
    const onInsightsReadyRef = useRef(onInsightsReady);

    // Keep ref updated
    useEffect(() => {
        onInsightsReadyRef.current = onInsightsReady;
    }, [onInsightsReady]);

    const MIN_VALID_TEMP = 5.0;

    const summarizeData = useCallback((rawData) => {
        if (!rawData || !Array.isArray(rawData)) {
            return { summary: 'No data available' };
        }

        const result = { totalProfiles: rawData.length };

        if (rawData.length > 0) {
            const floatIds = new Set();
            let minLat = Infinity, maxLat = -Infinity;
            let minLon = Infinity, maxLon = -Infinity;
            let minTemp = Infinity, maxTemp = -Infinity;
            let tempSum = 0, tempCount = 0;
            let minSalinity = Infinity, maxSalinity = -Infinity;
            let salinitySum = 0, salinityCount = 0;
            let minDepth = Infinity, maxDepth = -Infinity;
            let depthSum = 0, depthCount = 0;
            let minDate = null, maxDate = null;

            rawData.forEach(record => {
                if (record.floatId || record.float_id) floatIds.add(record.floatId || record.float_id);
                if (record.latitude !== undefined) {
                    minLat = Math.min(minLat, record.latitude);
                    maxLat = Math.max(maxLat, record.latitude);
                }
                if (record.longitude !== undefined) {
                    minLon = Math.min(minLon, record.longitude);
                    maxLon = Math.max(maxLon, record.longitude);
                }
                // Temperature
                if (record.temperature !== undefined && record.temperature !== null) {
                    if (record.temperature >= MIN_VALID_TEMP) {
                        minTemp = Math.min(minTemp, record.temperature);
                        maxTemp = Math.max(maxTemp, record.temperature);
                        tempSum += record.temperature;
                        tempCount++;
                    }
                }
                // Salinity
                if (record.salinity !== undefined && record.salinity !== null && record.salinity > 0) {
                    minSalinity = Math.min(minSalinity, record.salinity);
                    maxSalinity = Math.max(maxSalinity, record.salinity);
                    salinitySum += record.salinity;
                    salinityCount++;
                }
                // Depth (pressure)
                const depth = record.depth || record.pressure;
                if (depth !== undefined && depth !== null) {
                    minDepth = Math.min(minDepth, depth);
                    maxDepth = Math.max(maxDepth, depth);
                    depthSum += depth;
                    depthCount++;
                }
                // Time
                const timeField = record.time || record.timestamp;
                if (timeField) {
                    const date = new Date(timeField);
                    if (!minDate || date < minDate) minDate = date;
                    if (!maxDate || date > maxDate) maxDate = date;
                }
            });

            result.uniqueFloats = floatIds.size;

            if (minLat !== Infinity) {
                result.spatialCoverage = {
                    latitudeRange: `${minLat.toFixed(2)}° to ${maxLat.toFixed(2)}°`,
                    longitudeRange: `${minLon.toFixed(2)}° to ${maxLon.toFixed(2)}°`
                };
            }
            if (tempCount > 0) {
                result.temperatureStats = {
                    min: minTemp.toFixed(2) + '°C',
                    max: maxTemp.toFixed(2) + '°C',
                    average: (tempSum / tempCount).toFixed(2) + '°C',
                    measurements: tempCount
                };
            }
            if (salinityCount > 0) {
                result.salinityStats = {
                    min: minSalinity.toFixed(2) + ' PSU',
                    max: maxSalinity.toFixed(2) + ' PSU',
                    average: (salinitySum / salinityCount).toFixed(2) + ' PSU',
                    measurements: salinityCount
                };
            }
            if (depthCount > 0) {
                result.depthStats = {
                    minDepth: minDepth.toFixed(0) + ' m',
                    maxDepth: maxDepth.toFixed(0) + ' m',
                    averageDepth: (depthSum / depthCount).toFixed(0) + ' m',
                    measurements: depthCount,
                    description: maxDepth > 1000 ? 'Deep ocean profiles' : 'Shallow to mid-depth profiles'
                };
            }
            if (minDate && maxDate) {
                result.temporalCoverage = {
                    from: minDate.toISOString().split('T')[0],
                    to: maxDate.toISOString().split('T')[0],
                    durationDays: Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
                };
            }
        }
        return result;
    }, []);

    const parseHybridResponse = (text) => {
        const result = { summary: '', spatial: '', temporal: '', depth: '' };
        if (!text) return result;

        const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)(?=\[SPATIAL_INSIGHT\]|$)/);
        const spatialMatch = text.match(/\[SPATIAL_INSIGHT\]\s*([\s\S]*?)(?=\[TEMPORAL_INSIGHT\]|$)/);
        const temporalMatch = text.match(/\[TEMPORAL_INSIGHT\]\s*([\s\S]*?)(?=\[DEPTH_INSIGHT\]|$)/);
        const depthMatch = text.match(/\[DEPTH_INSIGHT\]\s*([\s\S]*?)$/);

        if (summaryMatch) result.summary = summaryMatch[1].trim();
        if (spatialMatch) result.spatial = spatialMatch[1].trim();
        if (temporalMatch) result.temporal = temporalMatch[1].trim();
        if (depthMatch) result.depth = depthMatch[1].trim();

        if (!result.summary && text.trim()) {
            result.summary = text.trim();
        }

        return result;
    };

    useEffect(() => {
        if (!isVisible || !query || !intent) return;

        // Prevent duplicate fetches for the same query
        if (lastFetchedQuery.current === query) return;

        const fetchExplanation = async () => {
            lastFetchedQuery.current = query;
            setIsLoading(true);
            setError(null);

            try {
                const summarizedData = summarizeData(data);
                const response = await argoAPI.generateExplanation(
                    query,
                    intent.intent_type || 'SPATIAL_TEMPORAL_QUERY',
                    summarizedData,
                    displayContext
                );

                if (response.data.success) {
                    const parsed = parseHybridResponse(response.data.explanation);
                    setSummary(parsed.summary);
                    setSource(response.data.source);

                    // Notify parent using ref (won't cause re-render loop)
                    if (onInsightsReadyRef.current) {
                        onInsightsReadyRef.current({
                            spatial: parsed.spatial,
                            temporal: parsed.temporal,
                            depth: parsed.depth
                        });
                    }
                } else {
                    setError('Failed to generate explanation');
                }
            } catch (err) {
                console.error('Explanation error:', err);
                setError('Explanation service unavailable');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExplanation();
    }, [query, intent, data, displayContext, isVisible, summarizeData]);

    if (!isVisible) return null;

    // HERO MODE - Short summary only
    if (isHero) {
        return (
            <div className="explanation-panel hero-mode">
                {source === 'llm' && <span className="source-badge-hero">AI Summary</span>}

                <div className="explanation-content-hero">
                    {isLoading ? (
                        <div className="explanation-loading">
                            <div className="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span>Analyzing your question...</span>
                        </div>
                    ) : error ? (
                        <div className="explanation-error">
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div className="summary-text">
                            {summary.split('\n').filter(p => p.trim()).map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Standard mode
    return (
        <div className="explanation-panel">
            <div className="explanation-content">
                {isLoading ? (
                    <div className="explanation-loading">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <span>Generating explanation...</span>
                    </div>
                ) : error ? (
                    <div className="explanation-error">
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="explanation-text">
                        <p>{summary}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
