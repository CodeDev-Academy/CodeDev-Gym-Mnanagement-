import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from '../components/Navbar';
import { PlanModal } from './PlanModal';
import { getPlans, createPlan, updatePlan } from '../api/plans';

export const PlansPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter === 'active') params.is_active = 'true';
      if (statusFilter === 'inactive') params.is_active = 'false';
      const data = await getPlans(params);
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setPlanToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setPlanToEdit(plan);
    setModalOpen(true);
  };

  const handleSavePlan = async (formData) => {
    if (planToEdit) {
      await updatePlan(planToEdit.id, formData);
    } else {
      await createPlan(formData);
    }
    loadPlans();
  };

  const handleToggleStatus = async (plan) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      loadPlans();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const formatNaira = (amount) => {
    return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Membership Plans</h1>
            <p className="page-subtitle">
              {isOwner
                ? 'Configure duration packages, pricing tiers, and plan statuses.'
                : 'View membership packages and duration rates for member onboarding.'}
            </p>
          </div>
          {isOwner && (
            <button className="btn-primary" onClick={handleOpenCreate}>
              + Create New Plan
            </button>
          )}
        </div>

        <div className="table-controls">
          <div className="filter-chips">
            <button
              className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Plans ({plans.length})
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
          <div className="loading-state">Loading membership plans...</div>
        ) : plans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No membership plans found</h3>
            <p>
              {isOwner
                ? 'Get started by creating your first subscription package for members.'
                : 'No active subscription packages have been configured yet.'}
            </p>
            {isOwner && (
              <button className="btn-primary" onClick={handleOpenCreate}>
                + Create Plan
              </button>
            )}
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`plan-card ${!plan.is_active ? 'plan-inactive' : ''}`}>
                <div className="plan-card-header">
                  <span className="plan-duration-badge">{plan.duration_days} Days</span>
                  <span className={`status-badge ${plan.is_active ? 'status-active' : 'status-inactive'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="plan-card-title">{plan.name}</h3>
                <div className="plan-card-price">{formatNaira(plan.price)}</div>

                {isOwner ? (
                  <div className="plan-card-footer">
                    <button className="btn-secondary btn-sm" onClick={() => handleOpenEdit(plan)}>
                      Edit
                    </button>
                    <button
                      className={`btn-text btn-sm ${plan.is_active ? 'text-danger' : 'text-success'}`}
                      onClick={() => handleToggleStatus(plan)}
                    >
                      {plan.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ) : (
                  <div className="plan-card-footer" style={{ justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Fixed Rate Package
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <PlanModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSavePlan}
          planToEdit={planToEdit}
        />
      </main>
    </div>
  );
};
