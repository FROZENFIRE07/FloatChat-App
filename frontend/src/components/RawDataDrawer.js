import React, { useState } from 'react';
import './RawDataDrawer.css';

/**
 * RawDataDrawer Component
 * 
 * Purpose: Raw data table (hidden by default, verification only)
 * 
 * Design Philosophy:
 * - Hidden by default
 * - Side drawer or bottom drawer
 * - Sortable columns
 * - Designed for verification, not exploration
 * - No pagination-first UX
 */

export default function RawDataDrawer({ 
  floats = [],
  variable = 'temperature',
  onClose
}) {
  const [sortColumn, setSortColumn] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const RAW_DATA_LIMIT = 100; // Only show first 100 rows for performance

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort floats and limit to first 100 for display
  const sortedFloats = React.useMemo(() => {
    const sorted = [...floats];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortColumn) {
        case 'time':
          aVal = new Date(a.time).getTime();
          bVal = new Date(b.time).getTime();
          break;
        case 'depth':
          aVal = a.depth || 0;
          bVal = b.depth || 0;
          break;
        case 'value':
          aVal = (variable === 'temperature' ? a.temperature : a.salinity) || 0;
          bVal = (variable === 'temperature' ? b.temperature : b.salinity) || 0;
          break;
        case 'floatId':
          aVal = a.floatId || a.float_id || '';
          bVal = b.floatId || b.float_id || '';
          break;
        case 'latitude':
          aVal = a.latitude || 0;
          bVal = b.latitude || 0;
          break;
        case 'longitude':
          aVal = a.longitude || 0;
          bVal = b.longitude || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Limit to first 100 rows for display performance
    return sorted.slice(0, RAW_DATA_LIMIT);
  }, [floats, sortColumn, sortDirection, variable]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(decimals);
  };

  const variableLabel = variable === 'temperature' ? 'Temperature (°C)' : 'Salinity (PSU)';

  return (
    <div className="raw-data-drawer">
      <div className="drawer-overlay" onClick={onClose}></div>
      
      <div className="drawer-content">
        <div className="drawer-header">
          <div className="drawer-title">
            Raw Observations (showing {Math.min(floats.length, RAW_DATA_LIMIT)} of {floats.length} profiles)
          </div>
          <button 
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5 l10 10 M15 5 l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="table-container">
            <table className="raw-data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('time')} className={sortColumn === 'time' ? 'sorted' : ''}>
                    <div className="th-content">
                      Timestamp
                      <span className="sort-icon">
                        {sortColumn === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('floatId')} className={sortColumn === 'floatId' ? 'sorted' : ''}>
                    <div className="th-content">
                      Float ID
                      <span className="sort-icon">
                        {sortColumn === 'floatId' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('latitude')} className={sortColumn === 'latitude' ? 'sorted' : ''}>
                    <div className="th-content">
                      Latitude
                      <span className="sort-icon">
                        {sortColumn === 'latitude' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('longitude')} className={sortColumn === 'longitude' ? 'sorted' : ''}>
                    <div className="th-content">
                      Longitude
                      <span className="sort-icon">
                        {sortColumn === 'longitude' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('depth')} className={sortColumn === 'depth' ? 'sorted' : ''}>
                    <div className="th-content">
                      Depth (m)
                      <span className="sort-icon">
                        {sortColumn === 'depth' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('value')} className={sortColumn === 'value' ? 'sorted' : ''}>
                    <div className="th-content">
                      {variableLabel}
                      <span className="sort-icon">
                        {sortColumn === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFloats.map((float, index) => {
                  const floatId = float.floatId || float.float_id;
                  const value = variable === 'temperature' ? float.temperature : float.salinity;
                  
                  return (
                    <tr key={`${floatId}-${index}`}>
                      <td>{formatDate(float.time)}</td>
                      <td className="float-id">{floatId || 'N/A'}</td>
                      <td>{formatNumber(float.latitude, 4)}</td>
                      <td>{formatNumber(float.longitude, 4)}</td>
                      <td>{formatNumber(float.depth, 1)}</td>
                      <td className="value-cell">{formatNumber(value, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
