import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getProfile,
  updateProfile,
  changePassword,
  getStaffList,
  createStaff,
  resetStaffPassword,
  toggleStaffStatus,
} from '../api/auth';
import {
  UserIcon,
  UsersIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  PlusIcon,
  KeyIcon,
} from '../components/Icons';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    bio: '',
    avatar: null,
    role: '',
    date_joined: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Staff management state (Owner only)
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  // Modal states
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Add staff form state
  const [newStaffForm, setNewStaffForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
  });
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [modalStaffError, setModalStaffError] = useState('');

  // Reset staff password form state
  const [resetPasswordForm, setResetPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [submittingReset, setSubmittingReset] = useState(false);
  const [modalResetError, setModalResetError] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        username: data.username || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        bio: data.bio || '',
        avatar: data.avatar || null,
        role: data.role || 'OWNER',
        date_joined: data.date_joined || '',
      });
      if (data.avatar) {
        setAvatarPreview(data.avatar);
      }
    } catch (err) {
      setProfileError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const formData = new FormData();
      formData.append('first_name', profile.first_name);
      formData.append('last_name', profile.last_name);
      formData.append('username', profile.username);
      formData.append('email', profile.email);
      formData.append('phone_number', profile.phone_number);
      formData.append('bio', profile.bio);

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const updated = await updateProfile(formData);
      setProfile((prev) => ({
        ...prev,
        ...updated,
      }));
      if (updated.avatar) {
        setAvatarPreview(updated.avatar);
      }
      setAvatarFile(null);

      // Synchronize with global AuthContext
      updateUser({
        first_name: updated.first_name,
        last_name: updated.last_name,
        username: updated.username,
        email: updated.email,
        phone_number: updated.phone_number,
        bio: updated.bio,
        avatar: updated.avatar,
      });

      setProfileSuccess('Profile details updated successfully.');
    } catch (err) {
      const msg =
        err.response?.data?.username?.[0] ||
        err.response?.data?.detail ||
        'Failed to update profile. Please verify your inputs.';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.');
      setSavingPassword(false);
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      setSavingPassword(false);
      return;
    }

    try {
      const res = await changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      setPasswordSuccess(res.detail || 'Password changed successfully.');
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      const errorData = err.response?.data;
      let msg = 'Failed to update password.';
      if (errorData) {
        if (errorData.old_password) {
          msg = Array.isArray(errorData.old_password)
            ? errorData.old_password[0]
            : errorData.old_password;
        } else if (errorData.new_password) {
          msg = Array.isArray(errorData.new_password)
            ? errorData.new_password[0]
            : errorData.new_password;
        } else if (errorData.detail) {
          msg = errorData.detail;
        }
      }
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    setStaffError('');
    try {
      const data = await getStaffList();
      setStaffList(data);
    } catch (err) {
      setStaffError('Failed to load staff list.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (profile.role === 'OWNER') {
      fetchStaff();
    }
  }, [profile.role]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmittingStaff(true);
    setModalStaffError('');

    if (newStaffForm.password.length < 8) {
      setModalStaffError('Password must be at least 8 characters long.');
      setSubmittingStaff(false);
      return;
    }

    try {
      await createStaff(newStaffForm);
      setStaffSuccess(`Front-desk staff @${newStaffForm.username} registered successfully.`);
      setIsAddStaffOpen(false);
      setNewStaffForm({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
      });
      fetchStaff();
    } catch (err) {
      const errorData = err.response?.data;
      let msg = 'Failed to create staff member.';
      if (errorData) {
        if (errorData.username) {
          msg = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
        } else if (errorData.password) {
          msg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        } else if (errorData.detail) {
          msg = errorData.detail;
        }
      }
      setModalStaffError(msg);
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleResetStaffPassword = async (e) => {
    e.preventDefault();
    setSubmittingReset(true);
    setModalResetError('');

    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      setModalResetError('Passwords do not match.');
      setSubmittingReset(false);
      return;
    }

    if (resetPasswordForm.new_password.length < 8) {
      setModalResetError('New password must be at least 8 characters long.');
      setSubmittingReset(false);
      return;
    }

    try {
      await resetStaffPassword(selectedStaff.id, {
        new_password: resetPasswordForm.new_password,
      });
      setStaffSuccess(`Password for @${selectedStaff.username} updated successfully.`);
      setIsResetPasswordOpen(false);
      setSelectedStaff(null);
      setResetPasswordForm({ new_password: '', confirm_password: '' });
    } catch (err) {
      const errorData = err.response?.data;
      let msg = 'Failed to reset password.';
      if (errorData) {
        if (errorData.new_password) {
          msg = Array.isArray(errorData.new_password) ? errorData.new_password[0] : errorData.new_password;
        } else if (errorData.detail) {
          msg = errorData.detail;
        }
      }
      setModalResetError(msg);
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleStaffStatus = async (staffMember) => {
    setActionInProgressId(staffMember.id);
    setStaffError('');
    setStaffSuccess('');
    try {
      const updated = await toggleStaffStatus(staffMember.id);
      setStaffSuccess(
        `Account status for @${staffMember.username} updated to ${
          updated.is_active ? 'Active' : 'Inactive'
        }.`
      );
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === staffMember.id ? { ...s, is_active: updated.is_active } : s
        )
      );
    } catch (err) {
      setStaffError(err.response?.data?.detail || 'Failed to toggle account status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading profile details...</div>
      </div>
    );
  }

  const initials =
    (profile.first_name ? profile.first_name[0] : '') +
    (profile.last_name ? profile.last_name[0] : '') ||
    (profile.username ? profile.username[0].toUpperCase() : 'U');

  const joinedDate = profile.date_joined
    ? new Date(profile.date_joined).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  return (
    <div className="profile-container">
      {/* Identity Banner */}
      <div className="profile-banner-card">
        <div className="profile-avatar-wrapper">
          <div
            className="profile-avatar-circle"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile photo"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile Avatar"
                className="profile-avatar-image"
              />
            ) : (
              <span className="profile-avatar-initials">{initials}</span>
            )}
            <div className="profile-avatar-hover-overlay">
              <span className="profile-avatar-hover-text">Change Photo</span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>


        <div className="profile-banner-info">
          <div className="profile-banner-header">
            <h1 className="profile-banner-title">
              {profile.first_name || profile.last_name
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : profile.username}
            </h1>
            <span className="profile-role-badge">
              <ShieldIcon size={13} color="#60a5fa" />
              {profile.role === 'OWNER' ? 'Gym Owner' : 'Staff Member'}
            </span>
          </div>

          <p className="profile-banner-handle">@{profile.username}</p>
          {profile.bio && <p className="profile-banner-bio">{profile.bio}</p>}

          <div className="profile-banner-meta">
            <span className="profile-meta-item">
              <ClockIcon size={14} color="#94a3b8" />
              Member since {joinedDate}
            </span>
            {profile.email && (
              <span className="profile-meta-item">{profile.email}</span>
            )}
            {profile.phone_number && (
              <span className="profile-meta-item">{profile.phone_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Settings Cards */}
      <div className="profile-grid">
        {/* Card 1: Personal Details */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">Personal Information</h2>
            <p className="profile-card-subtitle">
              Update your account details and contact information.
            </p>
          </div>

          {profileSuccess && (
            <div className="profile-alert profile-alert-success">
              <CheckCircleIcon size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="profile-alert profile-alert-error">
              <AlertCircleIcon size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="profile-form-row">
              <div className="profile-form-group">
                <label className="profile-form-label">First Name</label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) =>
                    setProfile({ ...profile, first_name: e.target.value })
                  }
                  placeholder="First name"
                  className="profile-input"
                />
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">Last Name</label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) =>
                    setProfile({ ...profile, last_name: e.target.value })
                  }
                  placeholder="Last name"
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label className="profile-form-label">Username</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) =>
                    setProfile({ ...profile, username: e.target.value })
                  }
                  required
                  placeholder="Username"
                  className="profile-input"
                />
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="owner@example.com"
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label className="profile-form-label">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone_number}
                  onChange={(e) =>
                    setProfile({ ...profile, phone_number: e.target.value })
                  }
                  placeholder="+234 800 000 0000"
                  className="profile-input"
                />
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">Title / Bio</label>
                <input
                  type="text"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  placeholder="Founder & Managing Director"
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={savingProfile}
                className="profile-btn-primary"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">Security & Password</h2>
            <p className="profile-card-subtitle">
              Change your password to keep your account secure.
            </p>
          </div>

          {passwordSuccess && (
            <div className="profile-alert profile-alert-success">
              <CheckCircleIcon size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="profile-alert profile-alert-error">
              <AlertCircleIcon size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="profile-form-group">
              <label className="profile-form-label">Current Password</label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    old_password: e.target.value,
                  })
                }
                required
                placeholder="Enter current password"
                className="profile-input"
              />
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">New Password</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password: e.target.value,
                  })
                }
                required
                placeholder="At least 8 characters"
                className="profile-input"
              />
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirm_password: e.target.value,
                  })
                }
                required
                placeholder="Re-enter new password"
                className="profile-input"
              />
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={savingPassword}
                className="profile-btn-secondary"
              >
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Front-Desk Staff & Receptionists (Owner Role Only) */}
      {profile.role === 'OWNER' && (
        <div className="profile-full-card">
          <div className="profile-card-header-flex">
            <div>
              <h2 className="profile-card-title">Front-Desk Staff & Receptionists</h2>
              <p className="profile-card-subtitle">
                Manage receptionist accounts, grant or revoke access, and reset passwords.
              </p>
            </div>
            <button
              type="button"
              className="profile-btn-primary"
              onClick={() => {
                setModalStaffError('');
                setIsAddStaffOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PlusIcon size={16} />
              Add Receptionist
            </button>
          </div>

          {staffSuccess && (
            <div className="profile-alert profile-alert-success" style={{ marginBottom: '1rem' }}>
              <CheckCircleIcon size={16} />
              <span>{staffSuccess}</span>
            </div>
          )}

          {staffError && (
            <div className="profile-alert profile-alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircleIcon size={16} />
              <span>{staffError}</span>
            </div>
          )}

          {loadingStaff ? (
            <div className="profile-loading" style={{ padding: '2rem' }}>
              Loading staff accounts...
            </div>
          ) : staffList.length === 0 ? (
            <div className="staff-empty-state">
              <UsersIcon size={40} className="staff-empty-icon" color="#64748b" />
              <h3 style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>No Receptionists Registered</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Add front-desk staff accounts so receptionists can check in gym members and record walk-in payments.
              </p>
              <button
                type="button"
                className="profile-btn-primary"
                onClick={() => {
                  setModalStaffError('');
                  setIsAddStaffOpen(true);
                }}
              >
                Register First Receptionist
              </button>
            </div>
          ) : (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff) => {
                    const staffInitials =
                      (staff.first_name ? staff.first_name[0] : '') +
                      (staff.last_name ? staff.last_name[0] : '') ||
                      staff.username[0].toUpperCase();

                    return (
                      <tr key={staff.id}>
                        <td>
                          <div className="staff-user-cell">
                            <div className="staff-avatar-badge">{staffInitials}</div>
                            <div className="staff-user-meta">
                              <span className="staff-user-name">
                                {staff.first_name || staff.last_name
                                  ? `${staff.first_name} ${staff.last_name}`.trim()
                                  : staff.username}
                              </span>
                              <span className="staff-user-handle">@{staff.username}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{staff.email || '—'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {staff.phone_number || 'No phone'}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              staff.is_active ? 'status-active' : 'status-inactive'
                            }`}
                          >
                            {staff.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {staff.date_joined
                            ? new Date(staff.date_joined).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td>
                          <div className="staff-actions">
                            <button
                              type="button"
                              className="staff-action-btn staff-btn-reset"
                              onClick={() => {
                                setSelectedStaff(staff);
                                setModalResetError('');
                                setResetPasswordForm({ new_password: '', confirm_password: '' });
                                setIsResetPasswordOpen(true);
                              }}
                              title="Reset Staff Password"
                            >
                              <KeyIcon size={14} />
                              Reset Password
                            </button>
                            <button
                              type="button"
                              className={`staff-action-btn ${
                                staff.is_active ? 'staff-btn-deactivate' : 'staff-btn-activate'
                              }`}
                              onClick={() => handleToggleStaffStatus(staff)}
                              disabled={actionInProgressId === staff.id}
                              title={staff.is_active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {actionInProgressId === staff.id
                                ? 'Updating...'
                                : staff.is_active
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStaffOpen(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register Front-Desk Receptionist</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddStaffOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalStaffError && (
              <div className="profile-alert profile-alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircleIcon size={16} />
                <span>{modalStaffError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Joy"
                    value={newStaffForm.first_name}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Obi"
                    value={newStaffForm.last_name}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. joy_desk"
                    value={newStaffForm.username}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, username: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={newStaffForm.password}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. joy@gym.com"
                    value={newStaffForm.email}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 801 234 5678"
                    value={newStaffForm.phone_number}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, phone_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="profile-btn-secondary"
                  onClick={() => setIsAddStaffOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="profile-btn-primary"
                >
                  {submittingStaff ? 'Registering...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Staff Password Modal */}
      {isResetPasswordOpen && selectedStaff && (
        <div className="modal-overlay" onClick={() => setIsResetPasswordOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password: @{selectedStaff.username}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsResetPasswordOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalResetError && (
              <div className="profile-alert profile-alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircleIcon size={16} />
                <span>{modalResetError}</span>
              </div>
            )}

            <form onSubmit={handleResetStaffPassword} className="modal-form">
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={resetPasswordForm.new_password}
                  onChange={(e) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      new_password: e.target.value,
                    })
                  }
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={resetPasswordForm.confirm_password}
                  onChange={(e) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      confirm_password: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="profile-btn-secondary"
                  onClick={() => setIsResetPasswordOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="profile-btn-primary"
                >
                  {submittingReset ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
