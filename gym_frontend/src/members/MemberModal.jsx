import React, { useState, useEffect } from 'react';

export const MemberModal = ({ isOpen, onClose, onSave, memberToEdit }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [dateJoined, setDateJoined] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (memberToEdit) {
      setFullName(memberToEdit.full_name || '');
      setPhoneNumber(memberToEdit.phone_number || '');
      setEmail(memberToEdit.email || '');
      setDateJoined(memberToEdit.date_joined || new Date().toISOString().split('T')[0]);
      setIsActive(memberToEdit.is_active ?? true);
      setPhotoFile(null);
    } else {
      setFullName('');
      setPhoneNumber('+234');
      setEmail('');
      setDateJoined(new Date().toISOString().split('T')[0]);
      setIsActive(true);
      setPhotoFile(null);
    }
    setError('');
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim() === '+234') {
      setError('Valid phone number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('full_name', fullName.trim());
      formData.append('phone_number', phoneNumber.trim());
      if (email.trim()) formData.append('email', email.trim());
      formData.append('date_joined', dateJoined);
      formData.append('is_active', isActive ? 'true' : 'false');
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await onSave(formData);
      onClose();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' ');
        setError(errorMsg || 'Failed to save member details.');
      } else {
        setError('Network error saving member.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{memberToEdit ? 'Edit Member Profile' : 'Register New Member'}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="member-fullname">Full Name *</label>
            <input
              id="member-fullname"
              type="text"
              placeholder="e.g. Chukwudi Eze"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="member-phone">Phone Number (International) *</label>
              <input
                id="member-phone"
                type="tel"
                placeholder="+2348012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="member-email">Email Address</label>
              <input
                id="member-email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="member-datejoined">Date Joined</label>
              <input
                id="member-datejoined"
                type="date"
                value={dateJoined}
                onChange={(e) => setDateJoined(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="member-photo">Profile Photo (Optional)</label>
              <input
                id="member-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0] || null)}
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
              <span>Member is active and in good standing</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : memberToEdit ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
