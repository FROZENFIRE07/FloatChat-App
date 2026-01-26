/**
 * ExplanationService
 * 
 * Purpose: LLM-based explanation layer using Groq API
 * 
 * Design Principle:
 * "FLOATCHAT logic produces truth. The LLM only translates truth into language."
 * 
 * The LLM explains results but NEVER influences business logic.
 */

const Groq = require('groq-sdk');

// System prompt - HYBRID structure: Short summary + micro-insights for visuals
const SYSTEM_PROMPT = `You are an expert oceanographer explaining ocean data.

Generate a structured response with FOUR distinct sections. Each section must add NEW information, not repeat previous sections.

REQUIRED FORMAT — Use these exact markers:

[SUMMARY]
2-3 sentences directly answering the question with the key numbers (average, range).
This is the ONLY place for the main answer. Do not repeat these numbers elsewhere.

[SPATIAL_INSIGHT]
Focus ONLY on geography. What patterns appear across the map? Are some areas warmer/colder/saltier?
Do NOT mention the average or range again. Reference "the map" explicitly.

[TEMPORAL_INSIGHT]
Focus ONLY on time. Did values stay stable or change during the period?
Look at temporalCoverage.durationDays and describe the pattern over that timespan.
Do NOT repeat the main numbers. Reference "the time chart" explicitly.

[DEPTH_INSIGHT]
Focus ONLY on depth. Use depthStats to explain: Are measurements from surface or deep water?
How does depth affect the values shown? Why might deeper measurements show different patterns?
Reference "the depth distribution" explicitly.

CRITICAL RULES:
- Each section must be DIFFERENT information
- Use the specific data field for each section
- Never repeat the main answer in sub-sections
- Be confident and factual, not speculative

Tone: Expert walking a colleague through findings.`;

class ExplanationService {
    constructor() {
        this.client = null;
        this.isAvailable = false;
        this.initClient();
    }

    initClient() {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey || apiKey === 'your_groq_api_key_here') {
            console.log('[ExplanationService] GROQ_API_KEY not configured. Explanation feature disabled.');
            this.isAvailable = false;
            return;
        }

        try {
            this.client = new Groq({ apiKey });
            this.isAvailable = true;
            console.log('[ExplanationService] Initialized successfully with Groq API');
        } catch (error) {
            console.error('[ExplanationService] Failed to initialize:', error.message);
            this.isAvailable = false;
        }
    }

    /**
     * Summarize structured result for LLM input (avoid sending 100k+ records)
     * Only sends counts and key metrics, not individual profiles
     */
    summarizeResult(structuredResult, questionType) {
        if (!structuredResult) return { summary: 'No data available' };

        const summary = {};

        // For spatial-temporal queries, summarize the data
        if (questionType === 'SPATIAL_TEMPORAL_QUERY') {
            if (Array.isArray(structuredResult)) {
                summary.totalProfiles = structuredResult.length;

                if (structuredResult.length > 0) {
                    // Extract key statistics without sending all data
                    const floatIds = new Set();
                    let minLat = Infinity, maxLat = -Infinity;
                    let minLon = Infinity, maxLon = -Infinity;
                    let minTemp = Infinity, maxTemp = -Infinity;
                    let tempSum = 0, tempCount = 0;
                    let minDate = null, maxDate = null;

                    structuredResult.forEach(record => {
                        if (record.floatId || record.float_id) {
                            floatIds.add(record.floatId || record.float_id);
                        }
                        if (record.latitude !== undefined) {
                            minLat = Math.min(minLat, record.latitude);
                            maxLat = Math.max(maxLat, record.latitude);
                        }
                        if (record.longitude !== undefined) {
                            minLon = Math.min(minLon, record.longitude);
                            maxLon = Math.max(maxLon, record.longitude);
                        }
                        if (record.temperature !== undefined && record.temperature !== null) {
                            minTemp = Math.min(minTemp, record.temperature);
                            maxTemp = Math.max(maxTemp, record.temperature);
                            tempSum += record.temperature;
                            tempCount++;
                        }
                        const timeField = record.time || record.timestamp;
                        if (timeField) {
                            const date = new Date(timeField);
                            if (!minDate || date < minDate) minDate = date;
                            if (!maxDate || date > maxDate) maxDate = date;
                        }
                    });

                    summary.uniqueFloats = floatIds.size;
                    summary.spatialCoverage = {
                        latitudeRange: `${minLat.toFixed(2)}° to ${maxLat.toFixed(2)}°`,
                        longitudeRange: `${minLon.toFixed(2)}° to ${maxLon.toFixed(2)}°`
                    };

                    if (tempCount > 0) {
                        summary.temperatureStats = {
                            min: minTemp.toFixed(2) + '°C',
                            max: maxTemp.toFixed(2) + '°C',
                            average: (tempSum / tempCount).toFixed(2) + '°C'
                        };
                    }

                    if (minDate && maxDate) {
                        summary.temporalCoverage = {
                            from: minDate.toISOString().split('T')[0],
                            to: maxDate.toISOString().split('T')[0]
                        };
                    }
                }
            } else {
                summary.result = structuredResult;
            }
        } else {
            // For other query types, pass as-is if small enough
            summary.result = structuredResult;
        }

        return summary;
    }

    buildUserPrompt(originalQuery, questionType, structuredResult, displayContext = 'detailed') {
        // Use pre-summarized result directly (already summarized on frontend)
        const summarizedResult = structuredResult;

        // Build temporal certainty context to prevent LLM guessing
        let temporalContext = '';
        if (summarizedResult.temporalCoverage) {
            const { from, to } = summarizedResult.temporalCoverage;
            temporalContext = `
TEMPORAL CERTAINTY (CRITICAL):
- Data available: ${from} to ${to}
- Coverage: Complete for this range
- Do NOT describe behavior outside these exact dates
- Do NOT use phrases like "would show", "typically", "might have"
- Only describe what IS in the data, not what COULD BE`;
        }

        // Build spatial certainty if available
        let spatialContext = '';
        if (summarizedResult.spatialCoverage) {
            spatialContext = `
SPATIAL CERTAINTY:
- Latitude range: ${summarizedResult.spatialCoverage.latitudeRange}
- Longitude range: ${summarizedResult.spatialCoverage.longitudeRange}
- Coverage: Based on ${summarizedResult.totalProfiles || 'available'} profiles`;
        }

        // Build depth context
        let depthContext = '';
        if (summarizedResult.depthStats) {
            depthContext = `
DEPTH DATA (USE THIS FOR [DEPTH_INSIGHT]):
- Depth range: ${summarizedResult.depthStats.minDepth} to ${summarizedResult.depthStats.maxDepth}
- Average measurement depth: ${summarizedResult.depthStats.averageDepth}
- Profile type: ${summarizedResult.depthStats.description}
- Explain how depth affects the temperature/salinity patterns`;
        }

        const prompt = `The user asked:
"${originalQuery}"

VERIFIED DATA:
${JSON.stringify(summarizedResult, null, 2)}
${temporalContext}
${spatialContext}
${depthContext}

INSTRUCTION:
Answer using ONLY the verified data above.
State facts, not possibilities.
Use depthStats for [DEPTH_INSIGHT] section.`;

        return prompt;
    }

    /**
     * Generate explanation using Groq LLM
     */
    async generateExplanation(originalQuery, questionType, structuredResult, displayContext = 'detailed') {
        // Check availability
        if (!this.isAvailable) {
            return this.getFallbackExplanation(questionType, structuredResult);
        }

        try {
            const userPrompt = this.buildUserPrompt(originalQuery, questionType, structuredResult, displayContext);

            console.log('[ExplanationService] Generating explanation for:', questionType);

            const completion = await this.client.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1
            });

            const explanation = completion.choices[0]?.message?.content;

            if (!explanation) {
                console.warn('[ExplanationService] Empty response from LLM');
                return this.getFallbackExplanation(questionType, structuredResult);
            }

            console.log('[ExplanationService] Explanation generated successfully');
            return {
                success: true,
                explanation,
                source: 'llm'
            };

        } catch (error) {
            console.error('[ExplanationService] LLM error:', error.message);
            return this.getFallbackExplanation(questionType, structuredResult);
        }
    }

    /**
     * Generate explanation with streaming (for real-time display)
     */
    async *generateExplanationStream(originalQuery, questionType, structuredResult, displayContext = 'detailed') {
        if (!this.isAvailable) {
            const fallback = this.getFallbackExplanation(questionType, structuredResult);
            yield fallback.explanation;
            return;
        }

        try {
            const userPrompt = this.buildUserPrompt(originalQuery, questionType, structuredResult, displayContext);

            const stream = await this.client.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1,
                stream: true
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            }

        } catch (error) {
            console.error('[ExplanationService] Stream error:', error.message);
            const fallback = this.getFallbackExplanation(questionType, structuredResult);
            yield fallback.explanation;
        }
    }

    /**
     * Fallback template-based explanation when LLM is unavailable
     */
    getFallbackExplanation(questionType, structuredResult) {
        const summary = this.summarizeResult(structuredResult, questionType);
        let explanation = '';

        switch (questionType) {
            case 'SPATIAL_TEMPORAL_QUERY':
                if (summary.totalProfiles > 0) {
                    explanation = `This query returned ${summary.totalProfiles.toLocaleString()} ARGO float profiles`;
                    if (summary.uniqueFloats) {
                        explanation += ` from ${summary.uniqueFloats} unique floats`;
                    }
                    explanation += '.';

                    if (summary.spatialCoverage) {
                        explanation += ` The data covers latitudes from ${summary.spatialCoverage.latitudeRange} and longitudes from ${summary.spatialCoverage.longitudeRange}.`;
                    }

                    if (summary.temperatureStats) {
                        explanation += ` Temperature readings range from ${summary.temperatureStats.min} to ${summary.temperatureStats.max}, with an average of ${summary.temperatureStats.average}.`;
                    }

                    if (summary.temporalCoverage) {
                        explanation += ` The observations span from ${summary.temporalCoverage.from} to ${summary.temporalCoverage.to}.`;
                    }
                } else {
                    explanation = 'No ARGO float profiles were found matching your query criteria. Try expanding the time range or geographic area.';
                }
                break;

            case 'NEAREST_FLOAT_QUERY':
                explanation = `Found the nearest ARGO floats to your specified location. ${JSON.stringify(summary.result)}`;
                break;

            case 'VERTICAL_PROFILE_QUERY':
                explanation = `Retrieved vertical profile data showing measurements at different ocean depths. ${JSON.stringify(summary.result)}`;
                break;

            default:
                explanation = `Query processed successfully. ${JSON.stringify(summary)}`;
        }

        return {
            success: true,
            explanation,
            source: 'fallback'
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            available: this.isAvailable,
            provider: 'groq',
            model: 'llama-3.3-70b-versatile'
        };
    }
}

// Singleton instance
const explanationService = new ExplanationService();

module.exports = explanationService;
