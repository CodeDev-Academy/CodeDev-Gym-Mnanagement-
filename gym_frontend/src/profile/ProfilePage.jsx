import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getProfile, updateProfile, changePassword } from '../api/auth';
import {
  UserIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
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
    </div>
  );
};
