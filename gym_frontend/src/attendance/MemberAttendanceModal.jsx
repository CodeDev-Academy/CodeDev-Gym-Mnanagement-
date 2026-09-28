import React, { useState, useEffect } from 'react';
import { getCheckIns } from '../api/attendance';

export const MemberAttendanceModal = ({ isOpen, onClose, member }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && member) {
      loadHistory();
    }
  }, [isOpen, member]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getCheckIns({ member: member.id });
      setHistory(data);
    } catch (err) {
      console.error('Failed to load member attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Attendance Log</h3>
            <p className="modal-subtitle">{member.full_name} ({member.phone_number})</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="history-summary-strip">
          <div className="strip-item">
            <span>Total Gym Check-ins:</span>
            <strong className="price-highlight">{history.length} Visits</strong>
          </div>
          {history.length > 0 && (
            <div className="strip-item">
              <span>Last Check-in:</span>
              <strong>{formatDateTime(history[0].timestamp)}</strong>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state">Loading attendance history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏃</div>
            <h3>No check-ins recorded</h3>
            <p>This member has not checked in to the gym yet.</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Check-In Timestamp</th>
                  <th>Plan at Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.timestamp)}</td>
                    <td>{h.active_plan_name || 'Floor Access'}</td>
                    <td>
                      <span className={`status-badge ${h.subscription_status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {h.subscription_status === 'active' ? 'Active' : 'Unsubscribed / Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
