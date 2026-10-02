import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from '../components/Navbar';
import {
  BellIcon,
  WhatsAppIcon,
  MessageSquareIcon,
  RefreshIcon,
  CheckInIcon,
  UsersIcon,
} from '../components/Icons';
import {
  getPendingReminders,
  markRemindersSent,
  getReminderTemplates,
  updateReminderTemplate,
} from '../api/reminders';

const TABS = [
  {
    key: 'expiring_3d',
    label: 'Expiring Soon (3 Days)',
    badgeColor: 'badge-amber',
    chipClass: 'chip-amber',
    subtitle: 'Members whose subscriptions expire within the next 3 days',
    daysLabel: 'Days Left',
  },
  {
    key: 'lapsed_7d',
    label: 'Lapsed (7–14 Days)',
    badgeColor: 'badge-blue',
    chipClass: 'chip-blue',
    subtitle: 'Stage 1 check-in for members whose plans expired 1 to 2 weeks ago',
    daysLabel: 'Days Expired',
  },
  {
    key: 'lapsed_30d',
    label: 'Lapsed (30–45 Days)',
    badgeColor: 'badge-orange',
    chipClass: 'chip-orange',
    subtitle: 'Stage 2 re-engagement for members whose plans expired a month ago',
    daysLabel: 'Days Expired',
  },
  {
    key: 'lapsed_60d',
    label: 'Lapsed (60–75 Days)',
    badgeColor: 'badge-red',
    chipClass: 'chip-red',
    subtitle: 'Stage 3 fresh start for members whose plans expired 2 months ago',
    daysLabel: 'Days Expired',
  },
  {
    key: 'inactive_14d',
    label: '14+ Days Absent Active',
    badgeColor: 'badge-purple',
    chipClass: 'chip-purple',
    subtitle: 'Members with active ongoing passes who have not attended in 14+ days',
    daysLabel: 'Days Absent',
  },
];

export const RemindersDeskPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState('expiring_3d');
  const [data, setData] = useState({
    counts: {
      expiring_3d: 0,
      lapsed_7d: 0,
      lapsed_30d: 0,
      lapsed_60d: 0,
      inactive_14d: 0,
    },
    categories: {
      expiring_3d: [],
      lapsed_7d: [],
      lapsed_30d: [],
      lapsed_60d: [],
      inactive_14d: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Message Preview / Customizer Modal
  const [previewItem, setPreviewItem] = useState(null);
  const [customText, setCustomText] = useState('');

  // Templates Drawer Modal
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [savingTemplateId, setSavingTemplateId] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await getPendingReminders();
      setData(res);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load pending reminders:', err);
      setFeedback({ type: 'error', text: 'Failed to fetch pending reminders.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const currentTabConfig = TABS.find((t) => t.key === activeTab) || TABS[0];
  const currentItems = data.categories[activeTab] || [];

  // Toggle selection for a single row
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on current tab
  const toggleSelectAll = () => {
    if (selectedIds.length === currentItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentItems.map((item) => item.id));
    }
  };

  // Mark selected items as sent
  const handleMarkSelectedAsSent = async () => {
    if (selectedIds.length === 0) return;
    setBatchSubmitting(true);
    setFeedback(null);
    try {
      const payload = { category: activeTab };
      if (activeTab === 'inactive_14d') {
        payload.member_ids = selectedIds;
      } else {
        payload.subscription_ids = selectedIds;
      }

      const res = await markRemindersSent(payload);
      setFeedback({
        type: 'success',
        text: res.detail || `Marked ${selectedIds.length} members as reminded.`,
      });
      await loadPending();
    } catch (err) {
      console.error('Failed to mark reminders as sent:', err);
      setFeedback({
        type: 'error',
        text: 'Failed to update reminder status.',
      });
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Mark single item as sent
  const handleMarkSingleSent = async (item) => {
    try {
      const payload = { category: activeTab };
      if (activeTab === 'inactive_14d') {
        payload.member_ids = [item.member_id];
      } else {
        payload.subscription_ids = [item.subscription_id];
      }
      await markRemindersSent(payload);
      setFeedback({
        type: 'success',
        text: `Marked ${item.member_name} as reminded.`,
      });
      await loadPending();
    } catch (err) {
      console.error('Failed to mark reminder as sent:', err);
    }
  };

  // Open Preview Modal
  const openPreview = (item) => {
    setPreviewItem(item);
    setCustomText(item.prepared_message);
  };

  // Build custom WhatsApp URL if message was modified
  const getCustomWhatsAppUrl = (phone, text) => {
    const raw = String(phone || '').replace(/\D/g, '');
    const cleanPhone = raw.startsWith('0') && raw.length === 11 ? '234' + raw.slice(1) : raw;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Open Templates Modal
  const openTemplatesModal = async () => {
    setTemplatesModalOpen(true);
    try {
      const tpls = await getReminderTemplates();
      setTemplates(tpls);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleSaveTemplate = async (templateId, body) => {
    setSavingTemplateId(templateId);
    try {
      await updateReminderTemplate(templateId, { body });
      setFeedback({ type: 'success', text: 'Template updated successfully.' });
      const tpls = await getReminderTemplates();
      setTemplates(tpls);
      loadPending();
    } catch (err) {
      console.error('Failed to save template:', err);
      setFeedback({ type: 'error', text: 'Failed to save template.' });
    } finally {
      setSavingTemplateId(null);
    }
  };

  const totalActionable = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="dashboard-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Retention & Reminders Desk</h1>
            <p className="page-subtitle">
              Automated milestone tracking and one-click WhatsApp re-engagement with zero daily spam.
            </p>
          </div>
          <div className="header-actions">
            {isOwner && (
              <button
                className="btn btn-secondary"
                onClick={openTemplatesModal}
                title="Customize message templates"
              >
                <MessageSquareIcon size={16} />
                Message Templates
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={loadPending}
              disabled={loading}
              title="Refresh queue"
            >
              <RefreshIcon size={16} className={loading ? 'spinning' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`alert-banner alert-${feedback.type}`}>
            <span>{feedback.text}</span>
            <button
              className="alert-dismiss-btn"
              onClick={() => setFeedback(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Overview Stats Bar */}
        <div className="reminders-summary-bar">
          <div className="summary-stat-pill">
            <span className="summary-stat-label">Total Actionable Queue:</span>
            <span className="summary-stat-value">{totalActionable}</span>
          </div>
          <div className="summary-tags-strip">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`summary-pill-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(t.key);
                  setSelectedIds([]);
                }}
              >
                <span className="pill-name">{t.label.split(' ')[0]}</span>
                <span className={`pill-counter ${t.badgeColor}`}>
                  {data.counts[t.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="reminders-tabs-header">
          <div className="reminders-tabs-list">
            {TABS.map((tab) => {
              const count = data.counts[tab.key] || 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`reminders-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedIds([]);
                  }}
                >
                  <span className="tab-label">{tab.label}</span>
                  <span className={`tab-badge ${tab.badgeColor}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Context Card & Batch Toolbar */}
        <div className="reminders-toolbar-card">
          <div className="toolbar-info">
            <span className="toolbar-subtitle">{currentTabConfig.subtitle}</span>
          </div>

          <div className="toolbar-actions">
            {currentItems.length > 0 && (
              <>
                <label className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 &&
                      selectedIds.length === currentItems.length
                    }
                    onChange={toggleSelectAll}
                  />
                  <span>Select All ({currentItems.length})</span>
                </label>

                {selectedIds.length > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleMarkSelectedAsSent}
                    disabled={batchSubmitting}
                  >
                    {batchSubmitting
                      ? 'Updating...'
                      : `Mark ${selectedIds.length} Selected as Sent`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Table / Queue */}
        <div className="card">
          {loading ? (
            <div className="table-loading-state">
              <div className="spinner" />
              <p>Scanning member subscriptions and attendance logs...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BellIcon size={44} color="#64748b" />
              </div>
              <h3 className="empty-state-title">No Pending Members in this Queue</h3>
              <p className="empty-state-text">
                All members in this milestone category have been engaged or are up to date.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === currentItems.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Member</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>End Date</th>
                    <th>{currentTabConfig.daysLabel}</th>
                    <th>Personalized Message</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id} className={isChecked ? 'row-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(item.id)}
                          />
                        </td>
                        <td>
                          <div className="member-name-cell">
                            <span className="name-primary">{item.member_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="phone-code">{item.phone_number}</span>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{item.plan_name}</span>
                        </td>
                        <td>
                          <span className="text-muted">{item.end_date}</span>
                        </td>
                        <td>
                          <span className={`chip ${currentTabConfig.chipClass}`}>
                            {item.days_count}{' '}
                            {activeTab === 'expiring_3d'
                              ? 'days left'
                              : activeTab === 'inactive_14d'
                              ? 'days absent'
                              : 'days lapsed'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px' }}>
                          <div
                            className="message-snippet"
                            title={item.prepared_message}
                            onClick={() => openPreview(item)}
                          >
                            {item.prepared_message}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions-inline">
                            {/* 1-Click WhatsApp Direct Chat */}
                            <a
                              href={item.whatsapp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp"
                              title="Open direct WhatsApp Web chat"
                            >
                              <WhatsAppIcon size={16} />
                              <span>WhatsApp</span>
                            </a>

                            {/* Preview/Edit Modal */}
                            <button
                              className="btn-icon-subtle"
                              onClick={() => openPreview(item)}
                              title="Preview or edit message"
                            >
                              <MessageSquareIcon size={16} />
                            </button>

                            {/* Mark Single as Sent */}
                            <button
                              className="btn-icon-subtle"
                              onClick={() => handleMarkSingleSent(item)}
                              title="Mark as sent"
                            >
                              <CheckInIcon size={16} />
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
      </main>

      {/* Message Preview & Customizer Modal */}
      {previewItem && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Message Preview — {previewItem.member_name}
                </h3>
                <p className="modal-subtitle">
                  {previewItem.plan_name} • {previewItem.phone_number}
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setPreviewItem(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="form-label">
                Custom Message (Editable before sending):
              </label>
              <textarea
                className="form-textarea"
                rows={6}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <p className="form-hint">
                Editing here only changes the message for this recipient. Permanent copy changes can be set in Message Templates.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setPreviewItem(null)}
              >
                Cancel
              </button>

              <button
                className="btn btn-secondary"
                onClick={async () => {
                  await handleMarkSingleSent(previewItem);
                  setPreviewItem(null);
                }}
              >
                Mark as Sent
              </button>

              <a
                href={getCustomWhatsAppUrl(previewItem.phone_number, customText)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp btn-whatsapp-lg"
                onClick={() => {
                  setTimeout(() => {
                    handleMarkSingleSent(previewItem);
                    setPreviewItem(null);
                  }, 1200);
                }}
              >
                <WhatsAppIcon size={18} />
                Open in WhatsApp & Mark Sent
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Templates Manager Modal (Owner Only) */}
      {templatesModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-xl">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Customize Reminder Copy</h3>
                <p className="modal-subtitle">
                  These default templates are used to generate personalized messages across all 5 retention milestones.
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setTemplatesModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="templates-variables-callout">
                <span className="callout-title">Supported Template Variables:</span>
                <code>&#123;name&#125;</code>: Member full name • 
                <code>&#123;plan_name&#125;</code>: Membership plan • 
                <code>&#123;end_date&#125;</code>: Expiration date • 
                <code>&#123;days_left&#125;</code>: Days count (expiry, lapsed, or absence)
              </div>

              <div className="templates-list">
                {templates.map((tpl) => (
                  <TemplateItemCard
                    key={tpl.id}
                    template={tpl}
                    isSaving={savingTemplateId === tpl.id}
                    onSave={handleSaveTemplate}
                  />
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setTemplatesModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent for each template card in the templates editor
const TemplateItemCard = ({ template, isSaving, onSave }) => {
  const [text, setText] = useState(template.body);
  const [isModified, setIsModified] = useState(false);

  const handleChange = (e) => {
    setText(e.target.value);
    setIsModified(e.target.value !== template.body);
  };

  const handleSave = () => {
    onSave(template.id, text);
    setIsModified(false);
  };

  return (
    <div className="template-card">
      <div className="template-card-header">
        <div>
          <h4 className="template-card-title">{template.title}</h4>
          <span className="template-card-key">{template.key}</span>
        </div>
        {isModified && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
      <textarea
        className="form-textarea"
        rows={4}
        value={text}
        onChange={handleChange}
      />
    </div>
  );
};
