import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  SearchIcon,
  CalendarIcon,
  PlusIcon,
  CheckInIcon,
  CreditCardIcon,
  ShieldIcon,
  UserIcon,
} from './Icons';

export const TopHeader = ({ onSearch }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onSearch) {
      onSearch(searchQuery.trim());
    } else {
      navigate(`/members?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="cinematic-top-header">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="top-search-wrapper">
        <SearchIcon size={18} color="#64748b" className="top-search-icon" />
        <input
          type="text"
          placeholder="Search member by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="top-search-input"
        />
      </form>

      {/* Action / Context Area */}
      <div className="top-header-right">
        {/* Date Pill */}
        <div className="top-date-pill">
          <CalendarIcon size={16} color="#94a3b8" />
          <span>{todayFormatted}</span>
        </div>

        {/* Action Buttons */}
        <div className="top-quick-actions">
          <button
            className="top-btn-accent"
            onClick={() => navigate('/checkin')}
            title="Open Fast Check-in Desk"
          >
            <CheckInIcon size={16} />
            <span>Check In</span>
          </button>

          <button
            className="top-btn-ghost"
            onClick={() => navigate('/members')}
            title="Register New Member"
          >
            <PlusIcon size={16} />
            <span>Member</span>
          </button>
        </div>

        {/* User Profile Capsule */}
        <div
          className="top-user-capsule"
          onClick={() => navigate('/profile')}
          title="Manage Account & Profile"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="top-user-avatar">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                className="top-user-avatar-img"
              />
            ) : (
              user?.first_name
                ? user.first_name.charAt(0).toUpperCase()
                : user?.username?.charAt(0).toUpperCase() || <UserIcon size={16} />
            )}
          </div>
          <div className="top-user-meta">
            <span className="top-user-name">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`.trim()
                : user?.username}
            </span>
            <span className="top-user-role">
              <ShieldIcon size={11} color="#60a5fa" />
              {user?.role === 'OWNER' ? 'Owner' : 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
