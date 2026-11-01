import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { getPlans } from '../api/plans';
import { assignPlan } from '../api/subscriptions';
import { WhatsAppIcon } from '../components/Icons';

export const AssignPlanModal = ({ isOpen, onClose, onSuccess, member }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMultiplier, setDurationMultiplier] = useState(1);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [editableMessage, setEditableMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setError('');
      setReceiptData(null);
      setDurationMultiplier(1);
      setDispatchMessage('');
      loadActivePlans();
    }
  }, [isOpen]);

  const loadActivePlans = async () => {
    setLoadingPlans(true);
    try {
      const activePlans = await getPlans({ is_active: 'true' });
      setPlans(activePlans);
      if (activePlans.length > 0) {
        setSelectedPlanId(activePlans[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load active plans:', err);
      setError('Could not load membership plans.');
    } finally {
      setLoadingPlans(false);
    }
  };

  if (!isOpen || !member) return null;

  const selectedPlan = plans.find((p) => p.id.toString() === selectedPlanId.toString());

  const calculateEndDate = (start, durationDays) => {
    if (!start || !durationDays) return '';
    const d = new Date(start);
    d.setDate(d.getDate() + Number(durationDays));
    return d.toISOString().split('T')[0];
  };

  const totalDays = selectedPlan ? selectedPlan.duration_days * durationMultiplier : 0;
  const totalPrice = selectedPlan ? Number(selectedPlan.price) * durationMultiplier : 0;
  const calculatedEndDate = selectedPlan ? calculateEndDate(startDate, totalDays) : '';

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPlanId) {
      setError('Please select a membership plan.');
      return;
    }
    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignPlan({
        member: member.id,
        plan: parseInt(selectedPlanId, 10),
        start_date: startDate,
        duration_multiplier: durationMultiplier,
      });
      setReceiptData(res);
      setEditableMessage(res.welcome_message || '');
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' ');
        setError(errorMsg || 'Failed to assign plan.');
      } else {
        setError('Network error assigning plan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoDispatch = async () => {
    setDispatching(true);
    setDispatchMessage('');
    try {
      const res = await api.post('subscriptions/dispatch-receipt/', {
        phone_number: member.phone_number,
        message: editableMessage,
        member_name: member.full_name,
      });
      setDispatchMessage(res.data.detail || 'Dispatched via WhatsApp Bot!');
    } catch (err) {
      setDispatchMessage('Failed to reach automated WhatsApp bot. Please use manual WhatsApp Web below.');
    } finally {
      setDispatching(false);
    }
  };

  const handleDone = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  if (receiptData) {
    const cleanPhone = (member.phone_number || '').replace(/[^\d]/g, '');
    const dynamicUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(editableMessage)}`;

    return (
      <div className="modal-overlay" onClick={handleDone}>
        <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 style={{ margin: 0, color: '#ffffff' }}>Subscription Activated!</h3>
              <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                Instant Member Welcome & Digital Receipt
              </p>
            </div>
            <button className="modal-close-btn" onClick={handleDone}>✕</button>
          </div>

          <div className="receipt-success-card">
            <div className="receipt-summary-grid">
              <div className="receipt-stat">
                <span className="receipt-label">Member</span>
                <span className="receipt-value">{member.full_name}</span>
              </div>
              <div className="receipt-stat">
                <span className="receipt-label">Phone</span>
                <span className="receipt-value">{member.phone_number}</span>
              </div>
              <div className="receipt-stat">
                <span className="receipt-label">Plan</span>
                <span className="receipt-value">{receiptData.plan_name}</span>
              </div>
              <div className="receipt-stat">
                <span className="receipt-label">Valid Until</span>
                <span className="receipt-value">{receiptData.end_date}</span>
              </div>
            </div>

            <div className="receipt-message-preview">
              <label className="form-label" style={{ marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Prepared WhatsApp Welcome & Receipt Message:</span>
                <span style={{ color: '#10b981', fontSize: '0.78rem' }}>✏️ Editable before sending</span>
              </label>
              <textarea
                className="receipt-message-textarea"
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--surface-raised, #161a24)',
                  border: '1px solid var(--border, #222938)',
                  color: 'var(--ink, #ffffff)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: '1.4',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {dispatchMessage && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid #10b981',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}>
                {dispatchMessage}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={handleDone}>
                Done / Later
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={handleAutoDispatch}
                disabled={dispatching}
                title="Send directly in background via n8n WhatsApp bot"
              >
                {dispatching ? 'Sending via Bot...' : '🚀 Auto-Send via WhatsApp Bot'}
              </button>
              <a
                href={dynamicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp btn-whatsapp-lg"
                onClick={() => {
                  setTimeout(handleDone, 1200);
                }}
              >
                <WhatsAppIcon size={18} />
                Open in WhatsApp Web
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign Membership Plan</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <div className="member-target-card">
          <div className="avatar-circle">
            {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div>
            <div className="target-name">{member.full_name}</div>
            <div className="target-phone">{member.phone_number}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="plan-select">Select Membership Package *</label>
            {loadingPlans ? (
              <div className="input-loading">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="error-alert">No active membership plans found. Please create an active plan first.</div>
            ) : (
              <select
                id="plan-select"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.duration_days} Days ({formatNaira(p.price)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="duration-multiplier">Duration Multiplier (Flexible Terms)</label>
            <select
              id="duration-multiplier"
              value={durationMultiplier}
              onChange={(e) => setDurationMultiplier(Number(e.target.value))}
            >
              <option value={1}>1 Cycle (Standard — {selectedPlan?.duration_days || 30} Days)</option>
              <option value={2}>2 Cycles (2x — {(selectedPlan?.duration_days || 30) * 2} Days / e.g. 2 Months)</option>
              <option value={3}>3 Cycles (3x — {(selectedPlan?.duration_days || 30) * 3} Days / e.g. 3 Months)</option>
              <option value={6}>6 Cycles (6x — {(selectedPlan?.duration_days || 30) * 6} Days / Half-Year)</option>
              <option value={12}>12 Cycles (12x — {(selectedPlan?.duration_days || 30) * 12} Days / Full-Year)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sub-start-date">Subscription Start Date *</label>
              <input
                id="sub-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Calculated Expiry Date</label>
              <input
                type="text"
                value={calculatedEndDate || 'Select plan & date'}
                disabled
                className="input-readonly"
              />
            </div>
          </div>

          {selectedPlan && (
            <div className="subscription-summary-box">
              <div className="summary-row">
                <span>Plan Base:</span>
                <strong>{selectedPlan.name} ({selectedPlan.duration_days} Days)</strong>
              </div>
              <div className="summary-row">
                <span>Total Term:</span>
                <strong style={{ color: '#10b981' }}>{totalDays} Days ({durationMultiplier} Cycle{durationMultiplier > 1 ? 's' : ''})</strong>
              </div>
              <div className="summary-row">
                <span>Validity Period:</span>
                <strong>{startDate} ➔ {calculatedEndDate}</strong>
              </div>
              <div className="summary-row summary-total">
                <span>Total Amount Due:</span>
                <strong className="price-highlight" style={{ color: '#10b981', fontSize: '1.25rem' }}>
                  {formatNaira(totalPrice)}
                  {durationMultiplier > 1 && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      ({formatNaira(selectedPlan.price)} × {durationMultiplier})
                    </span>
                  )}
                </strong>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || plans.length === 0}
            >
              {submitting ? 'Assigning Plan...' : 'Confirm & Activate Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
