import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  DumbbellIcon,
  HomeIcon,
  CheckInIcon,
  UsersIcon,
  LayersIcon,
  CreditCardIcon,
  UserIcon,
  LogOutIcon,
} from './Icons';


export const Sidebar = () => {
  const { logout, user } = useAuth();

  return (
    <aside className="app-sidebar-dock">
      {/* Brand Icon Top */}
      <div className="sidebar-brand-wrapper">
        <NavLink to="/" className="sidebar-brand-badge" title="Gym OS">
          <div className="brand-circle-coral">
            <DumbbellIcon size={22} color="#ffffff" />
          </div>
          <span className="brand-dot-online" />
        </NavLink>
      </div>

      {/* Navigation Icon Stack */}
      <nav className="sidebar-nav-stack">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Dashboard"
        >
          <HomeIcon size={22} />
          <span className="sidebar-tooltip">Dashboard</span>
        </NavLink>

        <NavLink
          to="/checkin"
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Check-in Desk"
        >
          <CheckInIcon size={22} />
          <span className="sidebar-tooltip">Check-in</span>
        </NavLink>

        <NavLink
          to="/members"
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Members"
        >
          <UsersIcon size={22} />
          <span className="sidebar-tooltip">Members</span>
        </NavLink>

        <NavLink
          to="/plans"
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Membership Plans"
        >
          <LayersIcon size={22} />
          <span className="sidebar-tooltip">Plans</span>
        </NavLink>

        <NavLink
          to="/payments"
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Payment Ledger"
        >
          <CreditCardIcon size={22} />
          <span className="sidebar-tooltip">Payments</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `sidebar-nav-btn ${isActive ? 'active' : ''}`
          }
          title="Owner Profile"
        >
          <UserIcon size={22} />
          <span className="sidebar-tooltip">Profile</span>
        </NavLink>
      </nav>


      {/* Footer Bottom / Logout */}
      <div className="sidebar-bottom">
        <button
          onClick={logout}
          className="sidebar-logout-btn"
          title={`Sign out (${user?.username})`}
        >
          <LogOutIcon size={20} />
          <span className="sidebar-tooltip">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
