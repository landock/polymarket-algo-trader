import type { OrderHistoryEntry, AlgoOrderType } from '../../shared/types';

export type SortField = 'timestamp' | 'orderType' | 'side' | 'size' | 'price';
export type SortOrder = 'asc' | 'desc';

export function getOrderTypeLabel(entry: OrderHistoryEntry): string {
  if (entry.orderType === 'ALGO' && entry.algoType) {
    switch (entry.algoType as AlgoOrderType) {
      case 'TRAILING_STOP': return 'Trailing Stop';
      case 'STOP_LOSS': return 'Stop-Loss';
      case 'TAKE_PROFIT': return 'Take-Profit';
      case 'TWAP': return 'TWAP';
      default: return entry.algoType;
    }
  }
  return entry.orderType;
}

export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

export function getSortIcon(field: SortField, sortField: SortField, sortOrder: SortOrder) {
  if (sortField !== field) return '↕️';
  return sortOrder === 'asc' ? '↑' : '↓';
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildOrderHistoryCsv(orders: OrderHistoryEntry[]) {
  const headers = [
    'Timestamp',
    'Date',
    'Order Type',
    'Algo Type',
    'Token ID',
    'Market Question',
    'Outcome',
    'Side',
    'Size',
    'Price',
    'Executed Price',
    'Status',
    'Algo Order ID',
    'CLOB Order ID',
    'Error'
  ];

  const rows = orders.map(order => [
    order.timestamp,
    new Date(order.timestamp).toISOString(),
    order.orderType,
    order.algoType || '',
    order.tokenId,
    order.marketQuestion || '',
    order.outcome || '',
    order.side,
    order.size,
    order.price,
    order.executedPrice || '',
    order.status,
    order.algoOrderId || '',
    order.clobOrderId || '',
    order.error || ''
  ]);

  const csvContent = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map(row => row.map(escapeCSVValue).join(','))
  ].join('\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `polymarket-order-history-${timestamp}.csv`;

  return { csvContent, filename };
}
