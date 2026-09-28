import React, { useState, useEffect } from 'react';
import { getPayments } from '../api/payments';

export const MemberHistoryModal = ({ isOpen, onClose, member }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && member) {
      loadMemberPayments();
    }
  }, [isOpen, member]);

  const loadMemberPayments = async () => {
    setLoading(true);
    try {
      const data = await getPayments({ member: member.id });
      setPayments(data);
    } catch (err) {
      console.error('Failed to load member payments:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  const formatNaira = (amt) => {
    return '₦' + Number(amt || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getMethodBadge = (m) => {
    const map = {
      cash: { label: 'Cash', class: 'method-cash' },
      bank_transfer: { label: 'Transfer', class: 'method-transfer' },
      card: { label: 'Card POS', class: 'method-card' },
      flutterwave: { label: 'Flutterwave', class: 'method-fw' },
    };
    const info = map[m] || { label: m, class: 'method-cash' };
    return <span className={`method-badge ${info.class}`}>{info.label}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Payment Ledger</h3>
            <p className="modal-subtitle">{member.full_name} ({member.phone_number})</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="history-summary-strip">
          <div className="strip-item">
            <span>Total Transactions:</span>
            <strong>{payments.length}</strong>
          </div>
          <div className="strip-item">
            <span>Lifetime Paid:</span>
            <strong className="price-highlight">{formatNaira(totalPaid)}</strong>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading payment ledger...</div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>No payments recorded</h3>
            <p>No transaction history exists for this member yet.</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Plan Covered</th>
                  <th>Method</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.payment_date)}</td>
                    <td>{p.plan_name || 'Membership'}</td>
                    <td>{getMethodBadge(p.method)}</td>
                    <td><span className="staff-tag">{p.recorded_by_name || 'Staff'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#34d399' }}>
                      {formatNaira(p.amount)}
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
