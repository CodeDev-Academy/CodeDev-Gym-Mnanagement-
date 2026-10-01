import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from '../components/Navbar';
import { getPayments, getPaymentSummary } from '../api/payments';

export const PaymentsPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (methodFilter !== 'all') params.method = methodFilter;

      if (isOwner) {
        const [paymentsData, summaryData] = await Promise.all([
          getPayments(params),
          getPaymentSummary(),
        ]);
        setPayments(paymentsData);
        setSummary(summaryData);
      } else {
        const paymentsData = await getPayments(params);
        setPayments(paymentsData);
        setSummary(null);
      }
    } catch (err) {
      console.error('Failed to load payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [methodFilter]);

  const formatNaira = (amt) => {
    return '₦' + Number(amt || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getMethodBadge = (m) => {
    const map = {
      cash: { label: 'Cash', class: 'method-cash' },
      bank_transfer: { label: 'Bank Transfer', class: 'method-transfer' },
      card: { label: 'Card (POS)', class: 'method-card' },
      flutterwave: { label: 'Flutterwave', class: 'method-fw' },
    };
    const info = map[m] || { label: m, class: 'method-cash' };
    return <span className={`method-badge ${info.class}`}>{info.label}</span>;
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Financial Ledger & Payments</h1>
            <p className="page-subtitle">
              {isOwner
                ? 'Track incoming membership subscription fees, receipts, and staff entries.'
                : "Shift desk receipts and membership payments recorded today."}
            </p>
          </div>
        </div>

        {isOwner && summary && (
          <div className="metric-cards-grid">
            <div className="metric-card">
              <span className="metric-label">Total Revenue Collected</span>
              <div className="metric-value-huge">{formatNaira(summary.total_revenue)}</div>
              <span className="metric-subtext">Across {summary.total_transactions} transactions</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Breakdown by Payment Method</span>
              <div className="method-pills-list">
                {summary.by_method.map((item) => (
                  <div key={item.method} className="method-pill-item">
                    <span>{item.method.replace('_', ' ').toUpperCase()} ({item.count}):</span>
                    <strong>{formatNaira(item.total_amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="table-controls">
          <div className="filter-chips">
            <button
              className={`chip ${methodFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMethodFilter('all')}
            >
              All Methods ({payments.length})
            </button>
            <button
              className={`chip ${methodFilter === 'cash' ? 'active' : ''}`}
              onClick={() => setMethodFilter('cash')}
            >
              Cash
            </button>
            <button
              className={`chip ${methodFilter === 'bank_transfer' ? 'active' : ''}`}
              onClick={() => setMethodFilter('bank_transfer')}
            >
              Bank Transfer
            </button>
            <button
              className={`chip ${methodFilter === 'card' ? 'active' : ''}`}
              onClick={() => setMethodFilter('card')}
            >
              Card (POS)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading transactions ledger...</div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No payments recorded</h3>
            <p>Payments recorded for subscriptions will appear here automatically.</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Member</th>
                  <th>Plan Covered</th>
                  <th>Method</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.payment_date)}</td>
                    <td>
                      <div className="member-name">{p.member_name}</div>
                      <div className="member-subtext">{p.member_phone}</div>
                    </td>
                    <td>{p.plan_name || 'Membership'}</td>
                    <td>{getMethodBadge(p.method)}</td>
                    <td><span className="staff-tag">{p.recorded_by_name || 'Staff'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#34d399', fontSize: '1rem' }}>
                      {formatNaira(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
