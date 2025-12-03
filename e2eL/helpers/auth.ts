/**
 * E2E Test Helpers - Authentication
 * 
 * Provides reusable authentication helpers for Playwright tests
 * Uses dev mode token endpoint for test authentication
 */

import { Page } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

/**
 * Get dev mode authentication token
 * 
 * Uses /api/dev/token endpoint to get a test token for specified role.
 * Only works in development mode.
 * 
 * @param role - Role to authenticate as (admin, manager, dispatcher, technician, client)
 * @returns JWT token string
 * 
 * @example
 * ```ts
 * const token = await getDevToken('admin');
 * ```
 */
export async function getDevToken(
  role: 'admin' | 'manager' | 'dispatcher' | 'technician' | 'client' = 'admin'
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/dev/token?role=${role}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get dev token for role ${role}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.token) {
    throw new Error(`No token in response for role ${role}`);
  }
  
  return data.token;
}

/**
 * Login to frontend as admin user
 * 
 * Gets admin dev token and injects it into localStorage.
 * Navigates to frontend and reloads to activate authentication.
 * 
 * @param page - Playwright page instance
 * 
 * @example
 * ```ts
 * test('admin test', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   // Now authenticated as admin
 * });
 * ```
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const token = await getDevToken('admin');
  
  // Navigate to frontend first
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  
  // Inject token into localStorage
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  
  // Reload to activate authentication
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  // Give Flutter time to initialize
  await page.waitForTimeout(1000);
}

/**
 * Login to frontend as technician user
 * 
 * Gets technician dev token and injects it into localStorage.
 * Used for testing non-admin access restrictions.
 * 
 * @param page - Playwright page instance
 * 
 * @example
 * ```ts
 * test('technician blocked from admin', async ({ page }) => {
 *   await loginAsTechnician(page);
 *   await page.goto(`${FRONTEND_URL}/admin`);
 *   // Should be blocked or redirected
 * });
 * ```
 */
export async function loginAsTechnician(page: Page): Promise<void> {
  const token = await getDevToken('technician');
  
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

/**
 * Login to frontend as manager user
 * 
 * @param page - Playwright page instance
 */
export async function loginAsManager(page: Page): Promise<void> {
  const token = await getDevToken('manager');
  
  await page.goto(FRONTEND_URL);
  
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Login to frontend as dispatcher user
 * 
 * @param page - Playwright page instance
 */
export async function loginAsDispatcher(page: Page): Promise<void> {
  const token = await getDevToken('dispatcher');
  
  await page.goto(FRONTEND_URL);
  
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Login to frontend as client user
 * 
 * @param page - Playwright page instance
 */
export async function loginAsClient(page: Page): Promise<void> {
  const token = await getDevToken('client');
  
  await page.goto(FRONTEND_URL);
  
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from frontend
 * 
 * Clears authentication token from localStorage and reloads.
 * 
 * @param page - Playwright page instance
 * 
 * @example
 * ```ts
 * await logout(page);
 * // Now unauthenticated
 * ```
 */
export async function logout(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.clear(); // Clear all auth-related storage
  });
  
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

/**
 * Check if page is authenticated
 * 
 * Checks for presence of auth token in localStorage.
 * 
 * @param page - Playwright page instance
 * @returns true if auth token exists
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('auth_token');
  });
  
  return !!token;
}

/**
 * Get current auth token from page
 * 
 * @param page - Playwright page instance
 * @returns Auth token or null if not authenticated
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('auth_token');
  });
}
