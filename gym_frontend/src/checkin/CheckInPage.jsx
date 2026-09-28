import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { getMembers } from '../api/members';
import { getCheckIns, createCheckIn, getTodayStats } from '../api/attendance';

export const CheckInPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [todayFeed, setTodayFeed] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const [checkingInId, setCheckingInId] = useState(null);
  const [recentCheckIn, setRecentCheckIn] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const searchInputRef = useRef(null);

  const loadTodayData = async () => {
    try {
      const [feedData, statsData] = await Promise.all([
        getCheckIns({ today: 'true' }),
        getTodayStats(),
      ]);
      setTodayFeed(feedData);
      setTodayStats(statsData);
    } catch (err) {
      console.error('Failed to load today\'s attendance data:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadTodayData();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await getMembers({ search: searchQuery.trim(), is_active: 'true' });
        setSearchResults(results.slice(0, 5));
      } catch (err) {
        console.error('Error searching members for check-in:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCheckIn = async (member) => {
    setCheckingInId(member.id);
    setErrorMsg('');
    try {
      const result = await createCheckIn(member.id);
      setRecentCheckIn(result);
      setSearchQuery('');
      setSearchResults([]);
      loadTodayData();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const msg = Object.values(err.response.data).flat().join(' ');
        setErrorMsg(msg || 'Failed to check in.');
      } else {
        setErrorMsg('Network error during check-in.');
      }
    } finally {
      setCheckingInId(null);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getInitials = (name) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-main checkin-layout">
        <div className="page-header">
          <div>
            <h1>Front-Desk Attendance & Check-In</h1>
            <p className="page-subtitle">Rapid 1-click member check-in and live attendance monitoring.</p>
          </div>
          {todayStats && (
            <div className="today-badge-card">
              <span className="badge-pulse"></span>
              <span className="badge-count">{todayStats.today_count}</span>
              <span className="badge-label">Checked In Today</span>
            </div>
          )}
        </div>

        {recentCheckIn && (
          <div className="checkin-success-banner">
            <span className="banner-icon"></span>
            <div className="banner-content">
              <strong>{recentCheckIn.member_name}</strong> was marked present at {formatTime(recentCheckIn.timestamp)}!
            </div>
            <button className="banner-close" onClick={() => setRecentCheckIn(null)}>✕</button>
          </div>
        )}

        {errorMsg && (
          <div className="error-alert">
            {errorMsg}
          </div>
        )}

        <div className="checkin-panels-grid">
          {/* Quick Check-in Panel */}
          <div className="panel-card checkin-action-panel">
            <div className="panel-header">
              <h2>Quick Member Search</h2>
              <span className="panel-hint">Type name or phone number</span>
            </div>

            <div className="checkin-search-box">
              <span className="search-symbol">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="checkin-search-field"
                placeholder="Start typing member name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            {searching && <div className="searching-indicator">Searching directory...</div>}

            {searchQuery && searchResults.length === 0 && !searching && (
              <div className="no-match-box">
                No active members found matching "{searchQuery}".
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="search-results-list">
                {searchResults.map((m) => {
                  return (
                    <div key={m.id} className="search-result-card">
                      <div className="result-left">
                        <div className="avatar-circle">
                          {getInitials(m.full_name)}
                        </div>
                        <div>
                          <div className="result-name">{m.full_name}</div>
                          <div className="result-phone">{m.phone_number}</div>
                        </div>
                      </div>

                      <div className="result-action">
                        <button
                          className="btn-checkin-instant"
                          onClick={() => handleCheckIn(m)}
                          disabled={checkingInId === m.id}
                        >
                          {checkingInId === m.id ? 'Checking In...' : 'Mark Present'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Feed Panel */}
          <div className="panel-card today-feed-panel">
            <div className="panel-header">
              <h2>Today's Live Attendance Feed</h2>
              <span className="panel-badge">{todayFeed.length} Present</span>
            </div>

            {loadingFeed ? (
              <div className="loading-state">Loading attendance feed...</div>
            ) : todayFeed.length === 0 ? (
              <div className="empty-state-mini">
                <div className="empty-icon-sm">🏃</div>
                <p>No members have checked in yet today.</p>
              </div>
            ) : (
              <div className="attendance-feed-list">
                {todayFeed.map((ci) => (
                  <div key={ci.id} className="feed-item">
                    <div className="feed-item-left">
                      <div className="avatar-circle avatar-sm">
                        {getInitials(ci.member_name)}
                      </div>
                      <div>
                        <div className="feed-member-name">{ci.member_name}</div>
                        <div className="feed-member-phone">{ci.member_phone}</div>
                      </div>
                    </div>

                    <div className="feed-item-right">
                      {ci.active_plan_name ? (
                        <span className="plan-tag-mini">{ci.active_plan_name}</span>
                      ) : (
                        <span className="no-plan-tag-mini">No Plan</span>
                      )}
                      <span className="feed-time-pill">{formatTime(ci.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
