import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from '../api/dashboard';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import {
  CheckInIcon,
  UsersIcon,
  CreditCardIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  RefreshIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  PhoneIcon,
  ShieldIcon,
  ChevronRightIcon,
  LayersIcon,
} from '../components/Icons';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeFeedTab, setActiveFeedTab] = useState('checkins');

  // Modal state for direct renewal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Could not retrieve dashboard statistics. Ensure the server is online.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatNaira = (amt) => {
    return '₦' + Number(amt || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleOpenRenewModal = (sub) => {
    setSelectedMember({
      id: sub.member_id,
      full_name: sub.member_name,
      phone_number: sub.phone_number,
    });
    setSelectedSubscription({
      id: sub.id,
      plan_name: sub.plan_name,
      plan_price: sub.plan_price,
      plan_duration: sub.plan_duration,
      end_date: sub.end_date,
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSuccessMessage('Payment and renewal recorded successfully.');
    fetchStats(true);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const metrics = stats?.metrics || {
    total_members: 0,
    active_members: 0,
    today_checkins: 0,
    today_unique_checkins: 0,
    month_revenue: 0,
    today_revenue: 0,
    expiring_this_week_count: 0,
  };

  // Calculate capacity percentage for the speedometer
  const capacityPct = Math.min(
    100,
    Math.max(15, Math.round(((metrics.today_unique_checkins || 1) / Math.max(metrics.active_members || 1, 5)) * 100))
  );

  return (
    <div className="cinematic-dashboard">
      {/* Hero Ambient Header */}
      <div className="cinematic-hero-section">
        <div className="hero-content-group">
          <div className="hero-subhead">
            <span className="hero-pill-badge">
              <ShieldIcon size={12} color="#f59e0b" />
              {user?.role === 'OWNER' ? 'Gym Owner Workspace' : 'Front Desk Workspace'}
            </span>
            <span className="hero-date-inline">
              <CalendarIcon size={13} color="#94a3b8" />
              {new Date().toLocaleDateString('en-NG', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <h1 className="hero-headline">
            Welcome back, <span className="highlight-username">{user?.username || 'Admin'}</span>
          </h1>
          <p className="hero-caption">
            Abuja Gym floor performance, live attendance stream, and active membership operations.
          </p>
        </div>

        <div className="hero-action-group">
          <button
            className={`btn-hero-refresh ${refreshing ? 'rotating' : ''}`}
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
            title="Refresh live metrics"
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="c-alert c-alert-success">
          <CheckCircleIcon size={18} color="#10b981" />
          <span>{successMessage}</span>
          <button className="c-alert-dismiss" onClick={() => setSuccessMessage('')}>
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="c-alert c-alert-danger">
          <AlertCircleIcon size={18} color="#f87171" />
          <span>{error}</span>
          <button className="c-alert-dismiss" onClick={() => setError('')}>
            &times;
          </button>
        </div>
      )}

      {/* Expiring Alert Banner */}
      {metrics.expiring_this_week_count > 0 && (
        <div className="c-warning-strip">
          <div className="c-warning-info">
            <AlertCircleIcon size={18} color="#fbbf24" />
            <div>
              <strong>Action Recommended: </strong>
              {metrics.expiring_this_week_count}{' '}
              {metrics.expiring_this_week_count === 1 ? 'membership is' : 'memberships are'}{' '}
              due for expiration within the next 7 days.
            </div>
          </div>
          <a href="#expiring-table" className="c-warning-link">
            Review Expiring Members <ChevronRightIcon size={14} />
          </a>
        </div>
      )}

      {/* Grid: 3 Frosted Top Metric Cards + Speedometer Widget */}
      <div className="cinematic-metrics-layout">
        {/* Top 3 Cards Row */}
        <div className="top-three-metrics-row">
          {/* Card 1: Activity / Attendance (Dot Rhythm Grid) */}
          <div className="c-card c-card-activity" onClick={() => navigate('/checkin')}>
            <div className="c-card-header">
              <div className="c-card-badge badge-orange">
                <CheckInIcon size={18} color="#ff7849" />
              </div>
              <span className="c-card-title">Activity</span>
              <span className="c-card-timeframe">Today</span>
            </div>

            {/* Visual Dot Rhythm Matrix */}
            <div className="activity-rhythm-matrix">
              <div className="rhythm-row">
                <span className="rhythm-label">Morning</span>
                <div className="rhythm-dots">
                  <span className="r-dot r-active" />
                  <span className="r-dot r-active" />
                  <span className="r-dot r-active" />
                  <span className="r-dot r-dim" />
                  <span className="r-dot r-dim" />
                </div>
              </div>
              <div className="rhythm-row">
                <span className="rhythm-label">Afternoon</span>
                <div className="rhythm-dots">
                  <span className="r-dot r-active-gold" />
                  <span className="r-dot r-active-gold" />
                  <span className="r-dot r-active-gold" />
                  <span className="r-dot r-active-gold" />
                  <span className="r-dot r-dim" />
                </div>
              </div>
              <div className="rhythm-row">
                <span className="rhythm-label">Evening</span>
                <div className="rhythm-dots">
                  <span className="r-dot r-active" />
                  <span className="r-dot r-active" />
                  <span className="r-dot r-dim" />
                  <span className="r-dot r-dim" />
                  <span className="r-dot r-dim" />
                </div>
              </div>
            </div>

            <div className="c-card-metric-footer">
              <div className="c-card-big-number">
                {metrics.today_checkins}
                <span className="c-number-unit">Check-ins</span>
              </div>
              <div className="c-card-sub-info">
                <CheckInIcon size={12} color="#ff7849" />
                <span>{metrics.today_unique_checkins} unique visitors</span>
              </div>
            </div>
          </div>

          {/* Card 2: Membership (Smooth Wave Sparkline) */}
          <div className="c-card c-card-membership" onClick={() => navigate('/members')}>
            <div className="c-card-header">
              <div className="c-card-badge badge-emerald">
                <UsersIcon size={18} color="#34d399" />
              </div>
              <span className="c-card-title">Membership</span>
              <span className="c-card-timeframe">Active Base</span>
            </div>

            {/* Smooth SVG Trend Sparkline */}
            <div className="sparkline-wrapper">
              <svg viewBox="0 0 200 65" className="sparkline-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,52 Q40,48 70,30 T140,24 T200,8 L200,65 L0,65 Z"
                  fill="url(#cyanGrad)"
                />
                <path
                  d="M0,52 Q40,48 70,30 T140,24 T200,8"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0,58 Q50,54 90,44 T150,38 T200,28"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="c-card-metric-footer">
              <div className="c-card-big-number">
                {metrics.active_members}
                <span className="c-number-unit">Active</span>
              </div>
              <div className="c-card-sub-info">
                <TrendingUpIcon size={12} color="#34d399" />
                <span>of {metrics.total_members} total registered</span>
              </div>
            </div>
          </div>

          {/* Card 3: Revenue for Owner / Desk Status for Receptionist */}
          {user?.role === 'OWNER' ? (
            <div className="c-card c-card-revenue" onClick={() => navigate('/payments')}>
              <div className="c-card-header">
                <div className="c-card-badge badge-purple">
                  <CreditCardIcon size={18} color="#a78bfa" />
                </div>
                <span className="c-card-title">Revenue</span>
                <span className="c-card-timeframe">This Month</span>
              </div>

              {/* Bar Rhythm Tally */}
              <div className="equalizer-bar-group">
                <div className="eq-bar eq-h40" />
                <div className="eq-bar eq-h65" />
                <div className="eq-bar eq-h50" />
                <div className="eq-bar eq-h85 eq-glow" />
                <div className="eq-bar eq-h70" />
                <div className="eq-bar eq-h95 eq-highlight" />
                <div className="eq-bar eq-h60" />
              </div>

              <div className="c-card-metric-footer">
                <div className="c-card-big-number c-currency-val">
                  {formatNaira(metrics.month_revenue)}
                </div>
                <div className="c-card-sub-info">
                  <ClockIcon size={12} color="#a78bfa" />
                  <span>{formatNaira(metrics.today_revenue)} today</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="c-card c-card-revenue" onClick={() => navigate('/checkin')}>
              <div className="c-card-header">
                <div className="c-card-badge badge-purple">
                  <ShieldIcon size={18} color="#a78bfa" />
                </div>
                <span className="c-card-title">Front Desk</span>
                <span className="c-card-timeframe">Desk Shift</span>
              </div>

              <div className="equalizer-bar-group">
                <div className="eq-bar eq-h60" />
                <div className="eq-bar eq-h80 eq-glow" />
                <div className="eq-bar eq-h60" />
                <div className="eq-bar eq-h95 eq-highlight" />
                <div className="eq-bar eq-h70" />
                <div className="eq-bar eq-h85 eq-glow" />
                <div className="eq-bar eq-h60" />
              </div>

              <div className="c-card-metric-footer">
                <div className="c-card-big-number" style={{ fontSize: '1.35rem' }}>
                  Check-in Active
                </div>
                <div className="c-card-sub-info">
                  <CheckCircleIcon size={12} color="#34d399" />
                  <span>Ready for arrivals & walk-ins</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Speedometer Radial Gauge Widget (Matching Reference) */}
        <div className="speedometer-widget-card">
          <div className="gauge-icon-pill-nav">
            <span className="gauge-tab active" title="Floor Load">
              <CheckInIcon size={14} />
            </span>
            <span className="gauge-tab" title="Members Pace">
              <UsersIcon size={14} />
            </span>
            <span className="gauge-tab" title="Target Revenue">
              <CreditCardIcon size={14} />
            </span>
            <span className="gauge-tab" title="Plans Breakdown">
              <LayersIcon size={14} />
            </span>
          </div>

          <div className="gauge-visual-container">
            <div className="gauge-arc-wrapper">
              <svg viewBox="0 0 200 120" className="gauge-svg">
                {/* Background Track Arc */}
                <path
                  d="M 25 105 A 75 75 0 0 1 175 105"
                  fill="none"
                  stroke="#1e2638"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Calibrated Tick Marks */}
                <path
                  d="M 25 105 A 75 75 0 0 1 175 105"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="14"
                  strokeDasharray="2, 6"
                  strokeLinecap="butt"
                />
                {/* Active Colored Arc */}
                <path
                  d="M 25 105 A 75 75 0 0 1 175 105"
                  fill="none"
                  stroke="url(#speedoGradient)"
                  strokeWidth="14"
                  strokeDasharray={`${(capacityPct / 100) * 235}, 250`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="speedoGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="60%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Gauge Center Metric */}
              <div className="gauge-center-content">
                <span className="gauge-speed-label">Flow Pace</span>
                <span className="gauge-percent-text">{capacityPct}%</span>
              </div>
            </div>

            {/* Glowing Sine Wave Beneath Dial */}
            <div className="gauge-wave-footer">
              <svg viewBox="0 0 240 32" className="wave-svg">
                <path
                  d="M 0 16 Q 30 2 60 16 T 120 16 T 180 16 T 240 16"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M 0 16 Q 30 26 60 16 T 120 16 T 180 16 T 240 16"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.8"
                  opacity="0.6"
                />
              </svg>
            </div>

            <div className="gauge-status-desc">
              <span className="gauge-status-title">Balanced Energy & Floor State</span>
              <span className="gauge-status-sub">Overall Gym Floor Stability Index</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="cinematic-quick-bar">
        <span className="quick-bar-heading">Quick Actions</span>
        <div className="quick-bar-actions">
          <button
            className="c-quick-btn btn-primary-accent"
            onClick={() => navigate('/checkin')}
          >
            <CheckInIcon size={16} />
            <span>Fast Check-in Desk</span>
          </button>
          <button
            className="c-quick-btn btn-secondary-glass"
            onClick={() => navigate('/members')}
          >
            <PlusIcon size={16} />
            <span>Register Member</span>
          </button>
          <button
            className="c-quick-btn btn-secondary-glass"
            onClick={() => navigate('/payments')}
          >
            <CreditCardIcon size={16} />
            <span>Payment Ledger</span>
          </button>
          <button
            className="c-quick-btn btn-secondary-glass"
            onClick={() => navigate('/plans')}
          >
            <LayersIcon size={16} />
            <span>Membership Plans</span>
          </button>
        </div>
      </div>

      {/* Main Split Panels: Expiring Subscriptions & Live Stream Feed */}
      <div className="cinematic-split-section">
        {/* Left Column: Subscriptions Expiring Soon */}
        <div className="c-panel-box expiring-panel-box" id="expiring-table">
          <div className="c-panel-header">
            <div className="c-panel-title-group">
              <div className="c-panel-icon-wrap icon-amber">
                <AlertCircleIcon size={18} color="#fbbf24" />
              </div>
              <div>
                <h2 className="c-panel-heading">Subscriptions Expiring Soon</h2>
                <span className="c-panel-subheading">Due within the next 7 days</span>
              </div>
            </div>
            <span className="c-counter-badge">
              {stats?.expiring_this_week?.length || 0}
            </span>
          </div>

          {loading ? (
            <div className="c-panel-loading">Loading subscription records...</div>
          ) : stats?.expiring_this_week?.length > 0 ? (
            <div className="table-wrapper-glass">
              <table className="c-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.expiring_this_week.map((item) => (
                    <tr key={item.subscription_id} className="c-table-row">
                      <td>
                        <div className="table-member-cell">
                          <span className="t-member-name">{item.member_name}</span>
                          <span className="t-member-phone">
                            <PhoneIcon size={11} color="#64748b" />
                            {item.phone_number}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="table-plan-cell">
                          <span className="t-plan-name">{item.plan_name}</span>
                          <span className="t-plan-price">{formatNaira(item.plan_price)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="t-date">{formatDate(item.end_date)}</span>
                      </td>
                      <td>
                        <span
                          className={`c-days-pill ${
                            item.days_left === 0
                              ? 'pill-urgent'
                              : item.days_left <= 2
                              ? 'pill-warning'
                              : 'pill-amber'
                          }`}
                        >
                          {item.days_left === 0
                            ? 'Expires Today'
                            : item.days_left === 1
                            ? '1 day remaining'
                            : `${item.days_left} days remaining`}
                        </span>
                      </td>
                      <td>
                        <button
                          className="c-btn-renew-action"
                          onClick={() => handleOpenRenewModal(item)}
                          title="Record payment and renew plan"
                        >
                          <CreditCardIcon size={13} />
                          <span>Renew</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="c-panel-empty-state">
              <div className="empty-check-icon-circle">
                <CheckCircleIcon size={32} color="#10b981" />
              </div>
              <h3>All memberships in good standing</h3>
              <p>No active subscriptions are expiring within the next 7 days.</p>
            </div>
          )}
        </div>

        {/* Right Column: Live Feed Stream */}
        <div className="c-panel-box stream-panel-box">
          <div className="c-panel-header">
            <div className="c-panel-title-group">
              <div className="c-panel-icon-wrap icon-cyan">
                <ClockIcon size={18} color="#06b6d4" />
              </div>
              <div>
                <h2 className="c-panel-heading">Live Activity Stream</h2>
                <span className="c-panel-subheading">Recent gym floor events</span>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="feed-toggle-pills">
              <button
                className={`feed-toggle-btn ${activeFeedTab === 'checkins' ? 'active' : ''}`}
                onClick={() => setActiveFeedTab('checkins')}
              >
                Check-ins
              </button>
              <button
                className={`feed-toggle-btn ${activeFeedTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveFeedTab('payments')}
              >
                Payments
              </button>
            </div>
          </div>

          {/* Check-ins Stream */}
          {activeFeedTab === 'checkins' && (
            <div className="feed-stream-wrapper">
              {loading ? (
                <div className="c-panel-loading">Loading check-ins...</div>
              ) : stats?.recent_checkins?.length > 0 ? (
                <div className="feed-stream-list">
                  {stats.recent_checkins.map((ci) => (
                    <div key={ci.id} className="feed-stream-row">
                      <div className="feed-avatar-badge avatar-cyan">
                        {ci.member_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="feed-meta-info">
                        <span className="feed-name">{ci.member_name}</span>
                        <span className="feed-subtext">{ci.phone_number}</span>
                      </div>
                      <div className="feed-time-badge">
                        <ClockIcon size={11} color="#34d399" />
                        <span>{formatTime(ci.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    className="feed-view-all-btn"
                    onClick={() => navigate('/checkin')}
                  >
                    Open Full Check-in Desk <ChevronRightIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className="feed-empty-state">
                  <span>No check-ins logged yet today.</span>
                </div>
              )}
            </div>
          )}

          {/* Payments Stream */}
          {activeFeedTab === 'payments' && (
            <div className="feed-stream-wrapper">
              {loading ? (
                <div className="c-panel-loading">Loading payments...</div>
              ) : stats?.recent_payments?.length > 0 ? (
                <div className="feed-stream-list">
                  {stats.recent_payments.map((p) => (
                    <div key={p.id} className="feed-stream-row">
                      <div className="feed-avatar-badge avatar-gold">
                        ₦
                      </div>
                      <div className="feed-meta-info">
                        <span className="feed-name">{p.member_name}</span>
                        <span className="feed-subtext">
                          {p.plan_name} - <span className="method-pill">{p.method_display || p.method}</span>
                        </span>
                      </div>
                      <div className="feed-amount-badge">
                        {formatNaira(p.amount)}
                      </div>
                    </div>
                  ))}
                  <button
                    className="feed-view-all-btn"
                    onClick={() => navigate('/payments')}
                  >
                    Open Payment Ledger <ChevronRightIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className="feed-empty-state">
                  <span>No payments recorded yet.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal for 1-Click Renewal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        member={selectedMember}
        subscription={selectedSubscription}
      />
    </div>
  );
};