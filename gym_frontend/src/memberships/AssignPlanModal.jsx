import React, { useState, useEffect } from 'react';
import { getPlans } from '../api/plans';
import { assignPlan } from '../api/subscriptions';

export const AssignPlanModal = ({ isOpen, onClose, onSuccess, member }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setError('');
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

  const calculatedEndDate = selectedPlan ? calculateEndDate(startDate, selectedPlan.duration_days) : '';

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
      await assignPlan({
        member: member.id,
        plan: parseInt(selectedPlanId, 10),
        start_date: startDate,
      });
      if (onSuccess) onSuccess();
      onClose();
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
                <span>Plan Duration:</span>
                <strong>{selectedPlan.duration_days} Days</strong>
              </div>
              <div className="summary-row">
                <span>Validity Period:</span>
                <strong>{startDate} ➔ {calculatedEndDate}</strong>
              </div>
              <div className="summary-row summary-total">
                <span>Plan Price:</span>
                <strong className="price-highlight">{formatNaira(selectedPlan.price)}</strong>
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
