/**
 * E2E Test Helpers - Utilities
 * 
 * General utilities for E2E tests.
 * 
 * NOTE: Dev tokens are READ-ONLY by design. Cleanup/CRUD operations
 * are NOT needed in E2E tests because:
 * 1. E2E tests don't create test data (they can't - read-only)
 * 2. CRUD is tested in 1100+ integration tests
 * 3. E2E tests verify connectivity only
 */

/**
 * Role data returned from API
 */
export interface TestRole {
  id: number;
  name: string;
  priority: number;
  description?: string;
  is_active: boolean;
}

/**
 * Wait for specified duration
 * 
 * Utility for adding delays in tests when needed.
 * 
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * 
 * Useful for flaky operations that might need retries.
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default 3)
 * @param initialDelay - Initial delay in ms (default 100)
 * @returns Result of function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await wait(delay);
      }
    }
  }
  
  throw lastError;
}
