/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for API calls that may fail due to network issues
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[]; // Error messages that should trigger retry
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'network',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'fetch failed'
  ]
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString().toLowerCase();

  // Check if error message contains any retryable error keywords
  return retryableErrors.some(keyword =>
    errorMessage.includes(keyword.toLowerCase()) ||
    errorString.includes(keyword.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Try to execute the function
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        console.log('[Retry] Non-retryable error, failing immediately');
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      console.log(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed: ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(`[Retry] All ${opts.maxRetries} retry attempts failed`);
  throw lastError;
}

/**
 * Retry a function that returns a result with success flag
 */
export async function retryWithResult<T extends { success: boolean; error?: string }>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    const result = await fn();

    // If result indicates failure with a retryable error, throw to trigger retry
    if (!result.success && result.error) {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      if (isRetryableError({ message: result.error }, opts.retryableErrors)) {
        throw new Error(result.error);
      }
    }

    return result;
  }, options);
}
