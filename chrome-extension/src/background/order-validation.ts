/**
 * Order Validation Utility
 *
 * Validates orders before submission to prevent common errors
 */

export interface OrderValidationError {
  field: string;
  message: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: OrderValidationError[];
}

// Polymarket order constraints
const MIN_ORDER_SIZE = 0.01; // Minimum shares
const MAX_ORDER_SIZE = 1000000; // Maximum shares
const MIN_PRICE = 0.0001; // Minimum price
const MAX_PRICE = 0.9999; // Maximum price
const MIN_USDC_AMOUNT = 1; // Minimum $1 order value

/**
 * Validate order parameters before submission
 */
export function validateOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  size: number,
  price: number
): OrderValidationResult {
  const errors: OrderValidationError[] = [];

  // Validate token ID
  if (!tokenId || tokenId.trim() === '') {
    errors.push({
      field: 'tokenId',
      message: 'Token ID is required'
    });
  }

  // Validate size
  if (size < MIN_ORDER_SIZE) {
    errors.push({
      field: 'size',
      message: `Order size must be at least ${MIN_ORDER_SIZE} shares`
    });
  }

  if (size > MAX_ORDER_SIZE) {
    errors.push({
      field: 'size',
      message: `Order size cannot exceed ${MAX_ORDER_SIZE} shares`
    });
  }

  if (!Number.isFinite(size) || size <= 0) {
    errors.push({
      field: 'size',
      message: 'Order size must be a positive number'
    });
  }

  // Validate price
  if (price < MIN_PRICE) {
    errors.push({
      field: 'price',
      message: `Price must be at least ${MIN_PRICE}`
    });
  }

  if (price > MAX_PRICE) {
    errors.push({
      field: 'price',
      message: `Price cannot exceed ${MAX_PRICE}`
    });
  }

  if (!Number.isFinite(price) || price <= 0) {
    errors.push({
      field: 'price',
      message: 'Price must be a positive number'
    });
  }

  // Validate minimum order value
  const orderValue = size * price;
  if (orderValue < MIN_USDC_AMOUNT) {
    errors.push({
      field: 'size',
      message: `Order value must be at least $${MIN_USDC_AMOUNT} (${size} × $${price.toFixed(4)} = $${orderValue.toFixed(2)})`
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate balance is sufficient for order
 */
export function validateBalance(
  side: 'BUY' | 'SELL',
  size: number,
  price: number,
  availableBalance: number
): OrderValidationResult {
  const errors: OrderValidationError[] = [];

  if (side === 'BUY') {
    const requiredUSDC = size * price;
    if (requiredUSDC > availableBalance) {
      errors.push({
        field: 'balance',
        message: `Insufficient USDC balance. Required: $${requiredUSDC.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
      });
    }
  } else {
    // For SELL orders, need to check token balance (handled separately)
    if (size > availableBalance) {
      errors.push({
        field: 'balance',
        message: `Insufficient shares. Required: ${size}, Available: ${availableBalance}`
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: OrderValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  return errors.map(err => `${err.field}: ${err.message}`).join('\n');
}
