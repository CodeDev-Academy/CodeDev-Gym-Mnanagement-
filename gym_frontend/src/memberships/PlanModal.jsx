import React, { useState, useEffect } from 'react';

export const PlanModal = ({ isOpen, onClose, onSave, planToEdit }) => {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name || '');
      setDurationDays(planToEdit.duration_days || '');
      setPrice(planToEdit.price || '');
      setIsActive(planToEdit.is_active ?? true);
    } else {
      setName('');
      setDurationDays('30');
      setPrice('');
      setIsActive(true);
    }
    setError('');
  }, [planToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedDays = parseInt(durationDays, 10);
    const parsedPrice = parseFloat(price);

    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }
    if (isNaN(parsedDays) || parsedDays <= 0) {
      setError('Duration must be a positive number of days.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        duration_days: parsedDays,
        price: parsedPrice.toFixed(2),
        is_active: isActive,
      });
      onClose();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' ');
        setError(errorMsg || 'Failed to save plan.');
      } else {
        setError('Network error saving plan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{planToEdit ? 'Edit Membership Plan' : 'New Membership Plan'}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="plan-name">Plan Name</label>
            <input
              id="plan-name"
              type="text"
              placeholder="e.g. Monthly Standard, Annual VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="plan-duration">Duration (Days)</label>
              <input
                id="plan-duration"
                type="number"
                min="1"
                placeholder="30"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="plan-price">Price (₦)</label>
              <input
                id="plan-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="15000.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Plan is active and available for new subscriptions</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : planToEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
