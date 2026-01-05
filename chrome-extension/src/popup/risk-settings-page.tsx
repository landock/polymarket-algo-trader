/**
 * Risk Management Settings Page
 *
 * UI for configuring risk management parameters
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { RiskSettings, DailyLossTracking } from '../shared/types';

function RiskSettingsPage() {
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [dailyLoss, setDailyLoss] = useState<DailyLossTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [maxPositionSize, setMaxPositionSize] = useState('1000');
  const [maxDailyLossLimit, setMaxDailyLossLimit] = useState('500');
  const [maxExposure, setMaxExposure] = useState('5000');
  const [enableChecks, setEnableChecks] = useState(true);

  useEffect(() => {
    loadSettings();
    loadDailyLoss();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RISK_SETTINGS' });
      if (response.success) {
        setSettings(response.data);
        setMaxPositionSize(response.data.maxPositionSizePerMarket.toString());
        setMaxDailyLossLimit(response.data.maxDailyLoss.toString());
        setMaxExposure(response.data.maxTotalExposure.toString());
        setEnableChecks(response.data.enableRiskChecks);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyLoss = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_DAILY_LOSS' });
      if (response.success) {
        setDailyLoss(response.data);
      }
    } catch (error) {
      console.error('Failed to load daily loss:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updatedSettings = {
        maxPositionSizePerMarket: parseFloat(maxPositionSize),
        maxDailyLoss: parseFloat(maxDailyLossLimit),
        maxTotalExposure: parseFloat(maxExposure),
        enableRiskChecks: enableChecks
      };

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_RISK_SETTINGS',
        payload: updatedSettings
      });

      if (response.success) {
        setSettings(response.data);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all risk settings to defaults?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESET_RISK_SETTINGS' });

      if (response.success) {
        setSettings(response.data);
        setMaxPositionSize(response.data.maxPositionSizePerMarket.toString());
        setMaxDailyLossLimit(response.data.maxDailyLoss.toString());
        setMaxExposure(response.data.maxTotalExposure.toString());
        setEnableChecks(response.data.enableRiskChecks);
        setMessage({ type: 'success', text: 'Settings reset to defaults' });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to reset settings' });
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  const dailyLossPercent = settings && dailyLoss
    ? (dailyLoss.totalLoss / settings.maxDailyLoss) * 100
    : 0;

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        Risk Management Settings
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Configure trading limits to protect your portfolio
      </p>

      {/* Current Daily Loss Status */}
      {dailyLoss && (
        <div
          style={{
            backgroundColor: dailyLossPercent >= 100 ? '#fee2e2' : dailyLossPercent >= 80 ? '#fef3c7' : '#f0fdf4',
            border: `1px solid ${dailyLossPercent >= 100 ? '#fca5a5' : dailyLossPercent >= 80 ? '#fcd34d' : '#86efac'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Today's Loss: ${dailyLoss.totalLoss.toFixed(2)} / ${settings?.maxDailyLoss.toFixed(2)}
          </h3>
          <div style={{ backgroundColor: '#fff', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(dailyLossPercent, 100)}%`,
                height: '100%',
                backgroundColor: dailyLossPercent >= 100 ? '#ef4444' : dailyLossPercent >= 80 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s'
              }}
            />
          </div>
          {dailyLossPercent >= 100 && (
            <p style={{ color: '#dc2626', marginTop: '8px', fontSize: '13px' }}>
              ⚠️ Daily loss limit reached. Trading suspended until tomorrow.
            </p>
          )}
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: message.type === 'success' ? '#065f46' : '#991b1b'
          }}
        >
          {message.text}
        </div>
      )}

      {/* Settings Form */}
      <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Risk Limits
        </h2>

        {/* Enable/Disable Risk Checks */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableChecks}
              onChange={(e) => setEnableChecks(e.target.checked)}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500' }}>Enable Risk Checks</span>
          </label>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginLeft: '26px' }}>
            When disabled, all risk limits will be bypassed (not recommended)
          </p>
        </div>

        {/* Max Position Size Per Market */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
            Max Position Size Per Market
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>$</span>
            <input
              type="number"
              value={maxPositionSize}
              onChange={(e) => setMaxPositionSize(e.target.value)}
              min="0"
              step="100"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={!enableChecks}
            />
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Maximum USD value for a single position in one market
          </p>
        </div>

        {/* Max Daily Loss */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
            Max Daily Loss Limit
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>$</span>
            <input
              type="number"
              value={maxDailyLossLimit}
              onChange={(e) => setMaxDailyLossLimit(e.target.value)}
              min="0"
              step="50"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={!enableChecks}
            />
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Maximum loss allowed per day. Trading stops when reached.
          </p>
        </div>

        {/* Max Total Exposure */}
        <div style={{ marginBottom: '0' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px' }}>
            Max Total Portfolio Exposure
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>$</span>
            <input
              type="number"
              value={maxExposure}
              onChange={(e) => setMaxExposure(e.target.value)}
              min="0"
              step="500"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={!enableChecks}
            />
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Maximum total value of all open positions combined
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          style={{
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Help Text */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
          ℹ️ How Risk Management Works
        </h3>
        <ul style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6', marginLeft: '20px' }}>
          <li>Orders exceeding position size limits are automatically rejected</li>
          <li>Daily loss tracking resets at midnight UTC</li>
          <li>Portfolio exposure is calculated from current open positions</li>
          <li>SELL orders are not restricted (they reduce exposure)</li>
          <li>You can temporarily override limits with a confirmation dialog (future feature)</li>
        </ul>
      </div>

      {/* Last Updated */}
      {settings && (
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px', textAlign: 'center' }}>
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// Render the page
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<RiskSettingsPage />);
}
