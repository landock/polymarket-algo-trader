/**
 * Price Alerts Page
 *
 * Dedicated page for managing price alerts
 */

import React, { useEffect, useState } from 'react';
import { PriceAlert, PriceAlertCondition, PriceAlertTrigger } from '../../shared/types';

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<PriceAlertTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tokenId, setTokenId] = useState('');
  const [marketQuestion, setMarketQuestion] = useState('');
  const [outcome, setOutcome] = useState('');
  const [condition, setCondition] = useState<PriceAlertCondition>('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    loadAlerts();
    loadHistory();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PRICE_ALERTS'
      });

      if (response.success) {
        setAlerts(response.data || []);
        setError(null);
      } else {
        setError(response.error || 'Failed to load alerts');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ALERT_HISTORY'
      });

      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load alert history:', err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenId || !targetPrice) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_PRICE_ALERT',
        alert: {
          tokenId,
          marketQuestion: marketQuestion || undefined,
          outcome: outcome || undefined,
          condition,
          targetPrice: parseFloat(targetPrice)
        }
      });

      if (response.success) {
        setShowCreateForm(false);
        setTokenId('');
        setMarketQuestion('');
        setOutcome('');
        setTargetPrice('');
        await loadAlerts();
      } else {
        setError(response.error || 'Failed to create alert');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PRICE_ALERT',
        alertId
      });

      if (response.success) {
        await loadAlerts();
      } else {
        setError(response.error || 'Failed to delete alert');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSnoozeAlert = async (alertId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SNOOZE_PRICE_ALERT',
        alertId,
        durationMinutes: 60
      });

      if (response.success) {
        await loadAlerts();
      } else {
        setError(response.error || 'Failed to snooze alert');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(4)}`;
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return '🟢 Active';
      case 'TRIGGERED': return '🔴 Triggered';
      case 'SNOOZED': return '🟡 Snoozed';
      case 'DISMISSED': return '⚫ Dismissed';
      default: return status;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'SNOOZED');
  const triggeredAlerts = alerts.filter(a => a.status === 'TRIGGERED');

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Price Alerts</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {showCreateForm && (
        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Create New Price Alert</h3>
          <form onSubmit={handleCreateAlert}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Token ID *
              </label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="e.g., 0x123abc..."
                required
                style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Market Question (optional)
              </label>
              <input
                type="text"
                value={marketQuestion}
                onChange={(e) => setMarketQuestion(e.target.value)}
                placeholder="e.g., Will BTC reach $100k in 2025?"
                style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Outcome (optional)
              </label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g., Yes, No"
                style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as PriceAlertCondition)}
                  style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="ABOVE">Above</option>
                  <option value="BELOW">Below</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Target Price *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="0.5000"
                  required
                  style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Create Alert
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: activeTab === 'active' ? '#2563eb' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '-2px'
          }}
        >
          Active Alerts ({activeAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: activeTab === 'history' ? '#2563eb' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '-2px'
          }}
        >
          History ({history.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading...
        </div>
      ) : activeTab === 'active' ? (
        <>
          {activeAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No active alerts. Create one to get started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {alert.marketQuestion || 'Unknown Market'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        {alert.outcome || 'Unknown Outcome'}
                      </div>
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        <strong>Condition:</strong> Price {alert.condition.toLowerCase()} {formatPrice(alert.targetPrice)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Token: {alert.tokenId.slice(0, 12)}...{alert.tokenId.slice(-8)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Created: {formatDate(alert.createdAt)}
                      </div>
                      {alert.status === 'SNOOZED' && alert.snoozedUntil && (
                        <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
                          Snoozed until: {formatDate(alert.snoozedUntil)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                        {getStatusBadge(alert.status)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {alert.status === 'TRIGGERED' && (
                      <button
                        onClick={() => handleSnoozeAlert(alert.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Snooze 1hr
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {triggeredAlerts.length > 0 && (
            <>
              <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Recently Triggered</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {triggeredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>{alert.marketQuestion || 'Unknown Market'}</strong> - {alert.outcome || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Triggered at: {alert.triggeredAt ? formatDate(alert.triggeredAt) : 'Unknown'}
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No alert history yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((trigger, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {trigger.alert.marketQuestion || 'Unknown Market'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    {trigger.alert.outcome || 'Unknown Outcome'}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    <strong>Condition:</strong> Price {trigger.alert.condition.toLowerCase()} {formatPrice(trigger.alert.targetPrice)}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    <strong>Triggered Price:</strong> {formatPrice(trigger.currentPrice)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Triggered: {formatDate(trigger.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
