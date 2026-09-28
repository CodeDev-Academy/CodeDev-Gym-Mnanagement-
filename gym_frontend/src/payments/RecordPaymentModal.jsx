import React, { useState, useEffect } from 'react';
import { recordPayment } from '../api/payments';

export const RecordPaymentModal = ({ isOpen, onClose, onSuccess, member, subscription }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [isRenewal, setIsRenewal] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && subscription) {
      setAmount(subscription.plan_price ? Number(subscription.plan_price).toFixed(2) : '');
      setMethod('cash');
      setIsRenewal(true);
      setError('');
    }
  }, [isOpen, subscription]);

  if (!isOpen || !member || !subscription) return null;

  const formatNaira = (amt) => {
    return '₦' + Number(amt || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateNewEndDate = () => {
    if (!subscription.end_date || !subscription.plan_duration) return '';
    const currentEnd = new Date(subscription.end_date);
    const today = new Date();
    const baseDate = currentEnd >= today ? currentEnd : today;
    baseDate.setDate(baseDate.getDate() + Number(subscription.plan_duration));
    return baseDate.toISOString().split('T')[0];
  };

  const newEndDate = calculateNewEndDate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await recordPayment({
        subscription: subscription.id,
        amount: parsedAmount.toFixed(2),
        method,
        is_renewal: isRenewal,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' ');
        setError(errorMsg || 'Failed to record payment.');
      } else {
        setError('Network error recording payment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Subscription Payment</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <div className="payment-target-card">
          <div className="avatar-circle">
            {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="target-info">
            <div className="target-name">{member.full_name}</div>
            <div className="target-meta">
              <span>{subscription.plan_name}</span> - <span>Current Expiry: {subscription.end_date}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pay-amount">Amount Paid (₦) *</label>
              <input
                id="pay-amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000.00"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="pay-method">Payment Method *</label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card (POS)</option>
                <option value="flutterwave">Flutterwave</option>
              </select>
            </div>
          </div>

          <div className="form-checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isRenewal}
                onChange={(e) => setIsRenewal(e.target.checked)}
              />
              <span><strong>Extend & Renew Subscription</strong> (+{subscription.plan_duration || 30} days)</span>
            </label>
          </div>

          {isRenewal && (
            <div className="renewal-preview-box">
              <div className="preview-label">Renewal Impact:</div>
              <div className="preview-dates">
                <span>Current End Date: <strong>{subscription.end_date}</strong></span>
                <span className="arrow-sep">➔</span>
                <span className="new-date-highlight">New Expiry: <strong>{newEndDate}</strong></span>
              </div>
              <div className="preview-subtext">Resets expiry reminder status so future notifications trigger on schedule.</div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Recording...' : isRenewal ? 'Record Payment & Renew' : 'Record Payment Only'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
