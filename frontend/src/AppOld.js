import React, { useState, useEffect } from 'react';
import './App.css';
import argoAPI from './services/api';

// New Design System Components
import LandingPage from './components/LandingPage';
import QueryInput from './components/QueryInput';
import ContextPanel from './components/ContextPanel';
import SkeletonLoader, { SkeletonMap, SkeletonChart } from './components/SkeletonLoader';

// Visualization Components
import FloatMap from './components/FloatMap';
import VerticalProfile from './components/VerticalProfile';
import TemporalDistribution from './components/TemporalDistribution';
import ValueDistribution from './components/ValueDistribution';
import CoverageDensity from './components/CoverageDensity';

/**
 * FloatChat Main Application
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
  // System health
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data state
  const [floats, setFloats] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [activeFloats, setActiveFloats] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    latMin: -10,
    latMax: 0,
    lonMin: 60,
    lonMax: 80,
    timeStart: '2019-01-01T00:00:00Z',
    timeEnd: '2019-01-31T23:59:59Z',
    variable: 'temperature',
    floatId: ''
  });
  
  // Data loading state
  const [dataLoading, setDataLoading] = useState(false);
  
  // Initialize: Check system health
  useEffect(() => {
    fetchHealth();
  }, []);

  
  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const healthResponse = await argoAPI.healthCheck();
      setHealth(healthResponse.data);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to connect to backend');
      setLoading(false);
    }
  };
  
  // Handle filter application - queries all Module 3 APIs
  const handleApplyFilters = async (newFilters) => {
    try {
      setDataLoading(true);
      setError(null);
      
      // Build query parameters
      const params = {
        latMin: newFilters.latMin,
        latMax: newFilters.latMax,
        lonMin: newFilters.lonMin,
        lonMax: newFilters.lonMax,
        timeStart: newFilters.timeStart,
        timeEnd: newFilters.timeEnd
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
        argoAPI.getRegionalStatistics({ ...params, variable: newFilters.variable }),
        argoAPI.getActiveFloats({
          timeStart: newFilters.timeStart,
          timeEnd: newFilters.timeEnd
        })
      ]);
      
      // Update state with API responses
      setFloats(regionResponse.data.data || []);
      setAvailability(availabilityResponse.data.data);
      setStatistics(statisticsResponse.data.data);
      setActiveFloats(activeFloatsResponse.data.data || []);
      
      setDataLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch data');
      setDataLoading(false);
    }
  };
  
  // Handle float selection from map
  const handleFloatSelect = async (float) => {
    try {
      const floatId = float.floatId || float.float_id;
      if (!floatId) return;
      
      // Fetch vertical profile for selected float
      const profileResponse = await argoAPI.getVerticalProfile(floatId);
      
      if (profileResponse.data.data && profileResponse.data.data.length > 0) {
        setSelectedProfile(profileResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading FloatChat...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🌊 FloatChat</h1>
          <p className="header-subtitle">ARGO Ocean Data Visualization Platform</p>
          <div className="module-badges">
            <span className="badge">Module 3: API ✓</span>
            <span className="badge active">Module 4: Visualization</span>
          </div>
        </div>
        
        {health && (
          <div className="health-indicator">
            <span className={`health-dot ${health.status === 'healthy' ? 'healthy' : 'unhealthy'}`}></span>
            <span className="health-text">
              {health.status === 'healthy' ? 'System Online' : 'System Issues'}
            </span>
          </div>
        )}
      </header>
      
      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <strong>⚠️ Error:</strong> {error}
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
      
      {/* Main Content */}
      <main className="app-main">
        <div className="app-layout">
          {/* Sidebar: Filter Panel */}
          <aside className="app-sidebar">
            <FilterPanel
              onFilterChange={setFilters}
              onApplyFilters={handleApplyFilters}
            />
          </aside>
          
          {/* Content: Visualizations */}
          <div className="app-content">
            {dataLoading ? (
              <div className="data-loading">
                <div className="loading-spinner"></div>
                <p>Querying ARGO database...</p>
              </div>
            ) : (
              <>
                {/* Visualization 1: Spatial Map */}
                <FloatMap
                  floats={floats}
                  variable={filters.variable}
                  onFloatSelect={handleFloatSelect}
                />
                
                {/* Visualization 2: Vertical Profile */}
                {selectedProfile && (
                  <VerticalProfile
                    profiles={selectedProfile}
                    variable={filters.variable}
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
                    variable={filters.variable}
                  />
                )}
                
                {/* Visualization 5: Coverage Density */}
                {floats.length > 0 && (
                  <CoverageDensity
                    floats={floats}
                  />
                )}
                
                {/* Empty State */}
                {!dataLoading && floats.length === 0 && (
                  <div className="empty-state">
                    <h3>No Data Yet</h3>
                    <p>Configure your query parameters and click "Apply Filters & Query Data" to begin exploring ARGO ocean data.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="app-footer">
        <p>FloatChat • Module 4: Visualization Layer • Truth-based ocean data exploration</p>
        <p className="footer-note">All visualizations reflect data exactly as returned by Module 3 APIs. No interpolation or interpretation applied.</p>
      </footer>
    </div>
  );
}

export default App;
