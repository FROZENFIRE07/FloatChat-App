import React, { useState, useEffect } from 'react';
import './App.css';
import argoAPI from './services/api';
import intentParser from './services/intentParser';

// Design System Components
import LandingPage from './components/LandingPage';
import ThinkingIndicator from './components/ThinkingIndicator';
import WorkspaceLayout from './components/WorkspaceLayout';

const DEMO_QUERY = 'What are the temperature and salinity readings near latitude 18.5 and longitude 66.2 on January 15, 2024?';

/**
 * FloatChat - Scientific Exploration Interface
 * 
 * Design Philosophy:
 * - Question-first, not control-first
 * - One mental mode at a time
 * - Visuals appear because of intent, not by default
 * - Motion communicates state change, not decoration
 * 
 * Flow:
 * 1. Landing page → Invite curiosity
 * 2. Loading → AI processing with stateful messages
 * 3. Workspace → Data visualization with follow-up exploration
 */

function App() {
  // UI State
  // Modes: 'landing' | 'acknowledgement' | 'loading' | 'workspace'
  const [uiMode, setUiMode] = useState('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [thinkingStage, setThinkingStage] = useState('understanding');

  // Query State
  const [currentQuery, setCurrentQuery] = useState('');
  const [, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInvalidQuery, setIsInvalidQuery] = useState(false);

  // Intent & Data State
  const [currentIntent, setCurrentIntent] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [, setApiMapping] = useState(null);

  // System Health
  const [, setArgoHealth] = useState(null);

  // Initialize: Check system health
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const argoResponse = await argoAPI.healthCheck();
      setArgoHealth(argoResponse.data);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  // Handle first query submission - go directly to loading
  const handleFirstQuery = async (query) => {
    if (query.trim().toLowerCase() === DEMO_QUERY.toLowerCase()) {
      handleDemoMode();
      return;
    }

    // 1. Go directly to loading state
    setCurrentQuery(query);
    setErrorMessage(null);
    setIsInvalidQuery(false);
    setUiMode('loading');
    setIsTransitioning(false);

    // 2. Start processing immediately
    processQuery(query);
  };

  // Core query processing
  const processQuery = async (query) => {
    setIsProcessing(true);
    setThinkingStage('understanding');

    try {
      // Parse intent using AI
      console.log('🧠 Parsing intent for:', query);
      const parseResult = await intentParser.parseQueryWithMapping(query);

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse query');
      }

      const intent = parseResult.intent;
      const mapping = parseResult.apiMapping;

      console.log('✅ Intent parsed:', intent);
      console.log('🗺️ API mapping:', mapping);

      // Attach spatialMeta to intent for frontend visualization
      // This enables circle rendering for landmark queries
      if (mapping?.spatialMeta) {
        intent.spatialMeta = mapping.spatialMeta;
        console.log('🎯 Attached spatialMeta:', mapping.spatialMeta);
      }

      // 🎯 PATCH: Ensure region coordinates from mapping are attached to intent
      // This ensures the bounding box is drawn even if the LLM output was partial
      if (mapping?.params) {
        if (!intent.region) intent.region = {};

        // Map common coordinate keys
        if (mapping.params.latMin !== undefined) intent.region.latMin = mapping.params.latMin;
        if (mapping.params.latMax !== undefined) intent.region.latMax = mapping.params.latMax;
        if (mapping.params.lonMin !== undefined) intent.region.lonMin = mapping.params.lonMin;
        if (mapping.params.lonMax !== undefined) intent.region.lonMax = mapping.params.lonMax;

        // Also ensure centroid data is available if needed
        if (mapping.params.centroidLat !== undefined) {
          if (!intent.spatialMeta) intent.spatialMeta = {};
          if (!intent.spatialMeta.centroid) intent.spatialMeta.centroid = {};
          intent.spatialMeta.centroid.lat = mapping.params.centroidLat;
          intent.spatialMeta.centroid.lon = mapping.params.centroidLon;
        }

        console.log('🩹 Patched intent.region with mapping params:', intent.region);
      }

      setCurrentIntent(intent);
      setApiMapping(mapping);
      setThinkingStage('fetching');

      // Check for invalid/weak intent
      // Backend returns 'variables' (array) not 'variable'
      const hasValidType = intent?.intent_type && intent.intent_type !== 'UNKNOWN';

      // Variables are only required for specific query types
      const variableRequired = ['SPATIAL_TEMPORAL_QUERY', 'AGGREGATION_QUERY'].includes(intent.intent_type);
      const hasVariable = !variableRequired || (intent?.variable || (intent?.variables && intent.variables.length > 0));

      if (!intent || !hasValidType || !hasVariable) {
        console.log('❌ Invalid intent detected:', { hasVariable, hasValidType, intent });
        setIsInvalidQuery(true);
        setCurrentData([]);
        setThinkingStage('preparing');

        setTimeout(() => {
          setUiMode('workspace');
          setIsProcessing(false);
        }, 300);
        return;
      }

      // Fetch data based on intent - use mapping params directly if available
      console.log('📡 Fetching data with mapping params:', mapping?.params);
      const data = await fetchDataForIntent(intent, mapping?.params || {});
      setCurrentData(data);

      console.log('📊 Data fetched:', data?.length || 0, 'items');

      // Check if we got data
      if (!data || data.length === 0) {
        console.log('⚠️ No data returned from fetch');
        setIsInvalidQuery(true);
      }

      setThinkingStage('preparing');

      // Transition to workspace
      setTimeout(() => {
        setUiMode('workspace');
        setIsProcessing(false);
      }, 300);

    } catch (error) {
      console.error('❌ Query processing failed:', error);
      setErrorMessage(error.message || 'Failed to process your question');
      setIsProcessing(false);
      setUiMode('landing');
    }
  };

  // Fetch data based on intent type
  const fetchDataForIntent = async (intent, params) => {
    const intentType = intent.intent_type;

    try {
      switch (intentType) {
        case 'SPATIAL_TEMPORAL_QUERY':
          return await fetchSpatialTemporalData(intent, params);

        case 'NEAREST_FLOAT_QUERY':
          const nearestResponse = await argoAPI.getNearestFloats({
            latitude: params.latitude,
            longitude: params.longitude,
            radius: params.radius || 5,
            limit: params.limit || 10
          });
          return nearestResponse.data.data || [];

        case 'VERTICAL_PROFILE_QUERY':
          const profileResponse = await argoAPI.getVerticalProfile(params.floatId);
          return profileResponse.data.data || [];

        case 'DATA_AVAILABILITY_QUERY':
          const availResponse = await argoAPI.checkDataAvailability(params);
          return availResponse.data.data || {};

        default:
          console.warn('Unknown intent type:', intentType);
          return null;
      }
    } catch (error) {
      console.error('Data fetch error:', error);
      return null;
    }
  };

  // Fetch spatial-temporal data
  const fetchSpatialTemporalData = async (intent, mappingParams) => {
    const regionMap = {
      arabian_sea: { latMin: 8, latMax: 25, lonMin: 50, lonMax: 75 },
      bay_of_bengal: { latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 },
      indian_ocean: { latMin: -30, latMax: 30, lonMin: 40, lonMax: 100 },
      equatorial: { latMin: -10, latMax: 10, lonMin: 40, lonMax: 100 }
    };

    let region;
    if (mappingParams.latMin !== undefined) {
      region = {
        latMin: mappingParams.latMin,
        latMax: mappingParams.latMax,
        lonMin: mappingParams.lonMin,
        lonMax: mappingParams.lonMax
      };
    } else if (intent.region_semantic && regionMap[intent.region_semantic]) {
      region = regionMap[intent.region_semantic];
    } else if (intent.latitude_min !== undefined) {
      region = {
        latMin: intent.latitude_min,
        latMax: intent.latitude_max,
        lonMin: intent.longitude_min,
        lonMax: intent.longitude_max
      };
    } else {
      region = regionMap.indian_ocean;
    }

    const timeStart = mappingParams.timeStart || intent.start_date || intent.start_time || '2019-01-01T00:00:00Z';
    const timeEnd = mappingParams.timeEnd || intent.end_date || intent.end_time || '2019-01-31T23:59:59Z';

    const params = {
      ...region,
      timeStart,
      timeEnd,
      limit: intent.limit || 100000
    };

    // 🎯 Add centroid + radiusKm for circular (Haversine) filtering
    // This enables the backend to filter by true distance, not just bbox
    if (intent.spatialMeta?.centroid && intent.spatialMeta?.adaptiveRadiusKm) {
      // Flatten centroid for URL query string (can't pass nested objects)
      params.centroidLat = intent.spatialMeta.centroid.lat;
      params.centroidLon = intent.spatialMeta.centroid.lon;
      params.radiusKm = intent.spatialMeta.adaptiveRadiusKm;
      console.log('🎯 Including circular filter params:', {
        centroidLat: params.centroidLat,
        centroidLon: params.centroidLon,
        radiusKm: params.radiusKm
      });
    }

    console.log('📡 Fetching ARGO data with params:', JSON.stringify(params, null, 2));

    try {
      const regionResponse = await argoAPI.getRegionData(params);
      const normalizedData = (regionResponse.data.data || []).map(record => ({
        ...record,
        time: record.time || record.timestamp,
        floatId: record.floatId || record.float_id
      }));
      return normalizedData;
    } catch (error) {
      console.error('❌ Failed to fetch data:', error);
      return [];
    }
  };

  // Handle demo mode
  const handleDemoMode = async () => {
    const demoQuery = DEMO_QUERY;
    const demoIntent = {
      intent_type: "SPATIAL_TEMPORAL_QUERY",
      variable: "temperature",
      variables: ["temperature", "salinity"],
      region_semantic: "sample_location",
      region: { name: "Sample location", latMin: 18, latMax: 19, lonMin: 66, lonMax: 67 },
      time_semantic: "January 15, 2024",
      start_time: "2024-01-15T00:00:00Z",
      end_time: "2024-01-16T00:00:00Z",
      demo_mode: true,
      spatialMeta: {
        centroid: { lat: 18.5, lon: 66.2 },
        adaptiveRadiusKm: null,
        displayName: "Sample location",
        isOceanRegion: false,
        source: "demo_preset"
      }
    };

    setCurrentQuery(demoQuery);
    setCurrentIntent(demoIntent);
    setUiMode('loading');
    setIsProcessing(true);
    setThinkingStage('fetching');

    const data = await fetchSpatialTemporalData(demoIntent, {});
    setCurrentData(data);

    setTimeout(() => {
      setUiMode('workspace');
      setIsProcessing(false);
    }, 500);
  };

  // Handle back to landing
  const handleBackToLanding = () => {
    setCurrentQuery('');
    setCurrentIntent(null);
    setCurrentData(null);
    setIsInvalidQuery(false);
    setErrorMessage(null);
    setIsTransitioning(true);

    setTimeout(() => {
      setUiMode('landing');
      setIsTransitioning(false);
    }, 300);
  };

  // Handle cancel during loading
  const handleCancelLoading = () => {
    handleBackToLanding();
  };

  // Handle follow-up query from chips
  const handleFollowUp = (query) => {
    setCurrentQuery(query);
    setUiMode('loading');
    setIsProcessing(true);
    processQuery(query);
  };

  // Handle try suggestion from invalid query view
  const handleTrySuggestion = (query) => {
    handleFollowUp(query);
  };

  // === RENDERING ===

  // State 1: Landing page
  if (uiMode === 'landing') {
    return (
      <LandingPage
        onStartQuery={handleFirstQuery}
        onStartDemo={handleDemoMode}
        isTransitioning={isTransitioning}
        errorMessage={errorMessage}
      />
    );
  }

  // State 2: Loading with stateful messages
  if (uiMode === 'loading') {
    return (
      <div className="app app-loading-mode">
        <div className="loading-background" />
        <div className="loading-container">
          <div className="loading-query">
            <span className="query-label">YOUR QUESTION</span>
            <p className="query-text">"{currentQuery}"</p>
          </div>
          <ThinkingIndicator
            stage={thinkingStage}
            onCancel={handleCancelLoading}
          />
        </div>
      </div>
    );
  }

  // State 4: Workspace with visualization
  if (uiMode === 'workspace') {
    return (
      <WorkspaceLayout
        query={currentQuery}
        intent={currentIntent}
        data={currentData}
        isInvalid={isInvalidQuery}
        onNewQuery={handleBackToLanding}
        onReset={handleBackToLanding}
        onFollowUp={handleFollowUp}
        onTrySuggestion={handleTrySuggestion}
        onFloatClick={(float) => console.log('Float clicked:', float)}
      />
    );
  }

  // Fallback
  return null;
}

export default App;
