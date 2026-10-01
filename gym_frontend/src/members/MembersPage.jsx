import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from '../components/Navbar';
import { MemberModal } from './MemberModal';
import { AssignPlanModal } from '../memberships/AssignPlanModal';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import { MemberHistoryModal } from '../payments/MemberHistoryModal';
import { MemberAttendanceModal } from '../attendance/MemberAttendanceModal';
import { getMembers, createMember, updateMember, getMember, deleteMember } from '../api/members';

export const MembersPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [memberForPlan, setMemberForPlan] = useState(null);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [memberForPay, setMemberForPay] = useState(null);
  const [subForPay, setSubForPay] = useState(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [memberForHistory, setMemberForHistory] = useState(null);

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [memberForAttendance, setMemberForAttendance] = useState(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter === 'active') params.is_active = 'true';
      if (statusFilter === 'inactive') params.is_active = 'false';

      const data = await getMembers(params);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleOpenRegister = () => {
    setMemberToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setMemberToEdit(member);
    setModalOpen(true);
  };

  const handleOpenAssignPlan = (member) => {
    setMemberForPlan(member);
    setAssignModalOpen(true);
  };

  const handleOpenRecordPayment = async (member) => {
    try {
      const detailed = await getMember(member.id);
      if (detailed.active_subscription) {
        setMemberForPay(detailed);
        setSubForPay(detailed.active_subscription);
        setPayModalOpen(true);
      } else {
        setMemberForPlan(detailed);
        setAssignModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to prepare payment modal:', err);
    }
  };

  const handleOpenHistory = (member) => {
    setMemberForHistory(member);
    setHistoryModalOpen(true);
  };

  const handleOpenAttendance = (member) => {
    setMemberForAttendance(member);
    setAttendanceModalOpen(true);
  };

  const handleSaveMember = async (formData) => {
    if (memberToEdit) {
      await updateMember(memberToEdit.id, formData);
    } else {
      await createMember(formData);
    }
    loadMembers();
  };

  const handleToggleStatus = async (member) => {
    try {
      await updateMember(member.id, { is_active: !member.is_active });
      loadMembers();
    } catch (err) {
      console.error('Failed to toggle member status:', err);
    }
  };

  const handleDeleteMember = async (member) => {
    if (window.confirm(`Are you sure you want to permanently delete member "${member.full_name}"?`)) {
      try {
        await deleteMember(member.id);
        loadMembers();
      } catch (err) {
        console.error('Failed to delete member:', err);
        alert(err.response?.data?.detail || 'Failed to delete member.');
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Gym Members</h1>
            <p className="page-subtitle">Manage member profiles, payments, subscriptions, and records.</p>
          </div>
          <button className="btn-primary" onClick={handleOpenRegister}>
            + Register Member
          </button>
        </div>

        <div className="table-controls">
          <div className="search-bar-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, phone number or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-chips">
            <button
              className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({members.length})
            </button>
            <button
              className={`chip ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`chip ${statusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactive
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading members directory...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No members found</h3>
            <p>{searchQuery ? 'No members match your search criteria.' : 'Start by registering the gym\'s first member.'}</p>
            <button className="btn-primary" onClick={handleOpenRegister}>
              + Register Member
            </button>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone Number</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-name-cell">
                        <div className="avatar-circle">
                          {getInitials(member.full_name)}
                        </div>
                        <div>
                          <div className="member-name">{member.full_name}</div>
                          {member.email && <div className="member-subtext">{member.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="phone-tag">{member.phone_number}</span>
                    </td>
                    <td>{member.date_joined}</td>
                    <td>
                      <span className={`status-badge ${member.is_active ? 'status-active' : 'status-inactive'}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          className="btn-pay btn-sm"
                          onClick={() => handleOpenRecordPayment(member)}
                          title="Record payment or renew subscription"
                        >
                          Pay / Renew
                        </button>
                        <button
                          className="btn-accent btn-sm"
                          onClick={() => handleOpenAssignPlan(member)}
                          title="Assign a new membership plan"
                        >
                          Plan
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenAttendance(member)}
                          title="View member attendance log"
                        >
                          Attendance
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenHistory(member)}
                          title="View member payment receipts"
                        >
                          Ledger
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => handleOpenEdit(member)}>
                          Edit
                        </button>
                        {isOwner && (
                          <>
                            <button
                              className={`btn-text btn-sm ${member.is_active ? 'text-danger' : 'text-success'}`}
                              onClick={() => handleToggleStatus(member)}
                            >
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="btn-text btn-sm text-danger"
                              onClick={() => handleDeleteMember(member)}
                              title="Permanently remove member"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <MemberModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveMember}
          memberToEdit={memberToEdit}
        />

        <AssignPlanModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={loadMembers}
          member={memberForPlan}
        />

        <RecordPaymentModal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          onSuccess={loadMembers}
          member={memberForPay}
          subscription={subForPay}
        />

        <MemberHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          member={memberForHistory}
        />

        <MemberAttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          member={memberForAttendance}
        />
      </main>
    </div>
  );
};
