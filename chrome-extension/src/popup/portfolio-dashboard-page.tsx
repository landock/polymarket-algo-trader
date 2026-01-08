/**
 * Portfolio Dashboard Page
 *
 * Displays aggregate portfolio metrics including:
 * - Total portfolio value
 * - Realized and unrealized P&L
 * - Position breakdown with pie chart visualization
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';
import type { PortfolioMetrics, PositionBreakdown } from '../shared/types';
import type { PolymarketPosition } from '../shared/types/positions';

// Define message types for portfolio data
interface GetPortfolioMessage {
  type: 'GET_PORTFOLIO';
}

interface PortfolioResponse {
  success: boolean;
  data?: {
    metrics: PortfolioMetrics;
    breakdown: PositionBreakdown[];
  };
  error?: string;
}

function PortfolioDashboardPage() {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<PositionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    loadPortfolio();

    const interval = setInterval(() => {
      loadPortfolio();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadPortfolio = async () => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PORTFOLIO'
      } as GetPortfolioMessage);

      if (response.success && response.data) {
        setMetrics(response.data.metrics);
        setBreakdown(response.data.breakdown);
      } else {
        setError(response.error || 'Failed to load portfolio data');
      }
    } catch (err: any) {
      console.error('Failed to load portfolio:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPnLColor = (value: number): string => {
    if (value > 0) return '#10b981'; // Green
    if (value < 0) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  // Simple pie chart using CSS conic gradient
  const renderPieChart = () => {
    if (breakdown.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          No positions to display
        </div>
      );
    }

    // Generate colors for pie chart segments
    const colors = [
      '#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    // Build conic gradient for pie chart
    let gradientParts: string[] = [];
    let currentAngle = 0;

    breakdown.forEach((position, index) => {
      const color = colors[index % colors.length];
      const percent = position.percentOfPortfolio;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (percent * 3.6); // Convert % to degrees

      gradientParts.push(`${color} ${startAngle}deg ${endAngle}deg`);
      currentAngle = endAngle;
    });

    const gradientString = gradientParts.join(', ');

    return (
      <div>
        {/* Pie chart */}
        <div
          style={{
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: `conic-gradient(${gradientString})`,
            margin: '0 auto 24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        />

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {breakdown.slice(0, 10).map((position, index) => (
            <div
              key={position.tokenId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  background: colors[index % colors.length],
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={position.marketQuestion}
                >
                  {position.marketQuestion}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {position.outcome}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                  {position.percentOfPortfolio.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatCurrency(position.currentValue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#ef4444', marginBottom: '16px' }}>
          {error}
        </div>
        <button
          onClick={loadPortfolio}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>No portfolio data available</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          Portfolio Dashboard
        </h1>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        {/* Total Portfolio Value */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Total Portfolio Value
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(metrics.totalValue)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {metrics.positionCount} {metrics.positionCount === 1 ? 'position' : 'positions'}
          </div>
        </div>

        {/* Total P&L */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Total P&L
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: getPnLColor(metrics.totalPnL)
            }}
          >
            {formatCurrency(metrics.totalPnL)}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: getPnLColor(metrics.totalPnLPercent),
              marginTop: '4px'
            }}
          >
            {formatPercent(metrics.totalPnLPercent)}
          </div>
        </div>

        {/* Realized P&L */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Realized P&L
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: getPnLColor(metrics.realizedPnL)
            }}
          >
            {formatCurrency(metrics.realizedPnL)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            From closed trades
          </div>
        </div>

        {/* Unrealized P&L */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Unrealized P&L
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: getPnLColor(metrics.unrealizedPnL)
            }}
          >
            {formatCurrency(metrics.unrealizedPnL)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            From open positions
          </div>
        </div>
      </div>

      {/* Position Breakdown Section */}
      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
          Position Distribution
        </h2>
        {renderPieChart()}
      </div>

      {/* Refresh Button */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={loadPortfolio}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Refresh Portfolio
        </button>
      </div>
    </div>
  );
}

// Render the page
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<PortfolioDashboardPage />);
}
