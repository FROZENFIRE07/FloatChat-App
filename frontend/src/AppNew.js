import React, { useState, useEffect } from 'react';
import './App.css';
import argoAPI from './services/api';

// New Design System Components
import LandingPage from './components/LandingPage';
import QueryInput from './components/QueryInput';
import ContextPanel from './components/ContextPanel';
import { SkeletonMap, SkeletonChart } from './components/SkeletonLoader';

// Visualization Components
import FloatMap from './components/FloatMap';
import VerticalProfile from './components/VerticalProfile';
import TemporalDistribution from './components/TemporalDistribution';
import ValueDistribution from './components/ValueDistribution';
import CoverageDensity from './components/CoverageDensity';

/**
 * FloatChat Main Application - Redesigned
 * 
 * New Design Philosophy:
 * - Minimal, not empty
 * - Calm, not dull
 * - Scientific, not academic
 * - Confident, not loud
 * - Smooth, not gimmicky
 * 
 * Flow:
 * 1. Landing page → User asks question
 * 2. Main app → Shows parsed intent + visualizations
 * 3. Progressive disclosure → Complexity only when needed
 */

function App() {
  // Application state
  const [showLanding, setShowLanding] = useState(true);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  
  // Query and intent state
  const [currentQuery, setCurrentQuery] = useState('');
  const [parsedIntent, setParsedIntent] = useState(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  
  // Data state
  const [floats, setFloats] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [activeFloats, setActiveFloats] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Initialize: Check system health
  useEffect(() => {
    fetchHealth();
  }, []);
  
  const fetchHealth = async () => {
    try {
      const healthResponse = await argoAPI.healthCheck();
      setHealth(healthResponse.data);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };
  
  // Handle query submission (Module 5 will parse this later)
  const handleQuerySubmit = async (query) => {
    setCurrentQuery(query);
    setShowLanding(false);
    
    // For now, show mock parsed intent
    // In Module 5, this will be real AI-parsed intent
    const mockIntent = {
      intent_type: 'SPATIAL_TEMPORAL_QUERY',
      variable: 'temperature',
      region_semantic: 'arabian_sea',
      time_semantic: 'January 2019',
      start_time: '2019-01-01T00:00:00Z',
      end_time: '2019-01-31T23:59:59Z'
    };
    
    setParsedIntent(mockIntent);
    
    // Fetch data using mock intent
    await fetchDataFromIntent(mockIntent);
  };
  
  // Fetch data based on parsed intent
  const fetchDataFromIntent = async (intent) => {
    try {
      setLoading(true);
      setError(null);
      
      // Map semantic region to coordinates (deterministic backend logic)
      const regionMap = {
        arabian_sea: { latMin: 8, latMax: 25, lonMin: 50, lonMax: 75 },
        bay_of_bengal: { latMin: 5, latMax: 22, lonMin: 80, lonMax: 95 },
        // Add more regions as needed
      };
      
      const region = regionMap[intent.region_semantic] || 
                    { latMin: -10, latMax: 10, lonMin: 60, lonMax: 80 };
      
      const params = {
        ...region,
        timeStart: intent.start_time,
        timeEnd: intent.end_time
      };
      
      // Query Module 3 APIs in parallel
      const [
        regionResponse,
        availabilityResponse,
        statisticsResponse,
        activeFloatsResponse
      ] = await Promise.all([
        argoAPI.getRegionData(params),
        argoAPI.checkDataAvailability(params),
        argoAPI.getRegionalStatistics({ ...params, variable: intent.variable }),
        argoAPI.getActiveFloats({
          timeStart: intent.start_time,
          timeEnd: intent.end_time
        })
      ]);
      
      // Update state with API responses
      setFloats(regionResponse.data.data || []);
      setAvailability(availabilityResponse.data.data);
      setStatistics(statisticsResponse.data.data);
      setActiveFloats(activeFloatsResponse.data.data || []);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch data');
      setLoading(false);
    }
  };
  
  // Handle float selection from map
  const handleFloatSelect = async (float) => {
    try {
      const floatId = float.floatId || float.float_id;
      if (!floatId) return;
      
      const profileResponse = await argoAPI.getVerticalProfile(floatId);
      
      if (profileResponse.data.data && profileResponse.data.data.length > 0) {
        setSelectedProfile(profileResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };
  
  // Show landing page if no query yet
  if (showLanding) {
    return <LandingPage onStartQuery={handleQuerySubmit} />;
  }
  
  // Main application layout
  return (
    <div className="app">
      {/* Header Bar (Minimal) */}
      <header className="app-header">
        <div className="app-logo">FloatChat</div>
        
        {health && (
          <div className="app-status">
            <span className={`app-status-indicator ${health.status === 'healthy' ? 'healthy' : 'unhealthy'}`}></span>
            <span>Connected to ARGO data</span>
          </div>
        )}
      </header>
      
      {/* Main Content Area */}
      <div className="app-content">
        <main className="content-main">
          {/* Persistent Query Input */}
          <QueryInput 
            onSubmit={handleQuerySubmit}
            hasResults={floats.length > 0}
            placeholder="Ask about ocean data..."
          />
          
          {/* Error Display (Inline, not modal) */}
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/>
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss error">×</button>
            </div>
          )}
          
          {/* Results Container */}
          {loading ? (
            <div className="results-container">
              <SkeletonMap />
              <div className="charts-grid">
                <SkeletonChart height={300} />
                <SkeletonChart height={300} />
              </div>
            </div>
          ) : (
            <div className="results-container">
              {/* Visualization 1: Spatial Map */}
              {floats.length > 0 && (
                <FloatMap
                  floats={floats}
                  variable={parsedIntent?.variable || 'temperature'}
                  onFloatSelect={handleFloatSelect}
                />
              )}
              
              {/* Charts Grid */}
              <div className="charts-grid">
                {/* Visualization 2: Vertical Profile */}
                {selectedProfile && (
                  <VerticalProfile
                    profiles={selectedProfile}
                    variable={parsedIntent?.variable || 'temperature'}
                  />
                )}
                
                {/* Visualization 3: Temporal Distribution */}
                {availability && (
                  <TemporalDistribution
                    availability={availability}
                    activeFloats={activeFloats}
                  />
                )}
                
                {/* Visualization 4: Value Distribution */}
                {statistics && floats.length > 0 && (
                  <ValueDistribution
                    statistics={statistics.statistics}
                    measurements={floats}
                    variable={parsedIntent?.variable || 'temperature'}
                  />
                )}
                
                {/* Visualization 5: Coverage Density */}
                {floats.length > 0 && (
                  <CoverageDensity floats={floats} />
                )}
              </div>
              
              {/* Empty State */}
              {!loading && floats.length === 0 && !error && (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.3"/>
                    <path d="M32 20v24M20 32h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <h3>No data found</h3>
                  <p>Try adjusting your query or selecting a different region and time range.</p>
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Context Panel (Right Side, Collapsible) */}
        <ContextPanel
          intent={parsedIntent}
          onRefine={() => setShowLanding(true)}
          isOpen={contextPanelOpen}
          onToggle={() => setContextPanelOpen(!contextPanelOpen)}
        />
      </div>
    </div>
  );
}

export default App;
