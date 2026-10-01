import { chromium, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@paicai.com.co';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'testpassword123';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3003';
const AUTH_FILE = path.join(__dirname, '.auth', 'superadmin.json');

async function setupAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    console.log('Filling login form...');
    await page.locator('input[type="email"]').fill(SUPERADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(SUPERADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    console.log('Waiting for redirect to dashboard...');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on dashboard
    await page.waitForSelector('aside', { timeout: 10000 });
    console.log('Login successful, saving auth state...');

    // Save storage state
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: AUTH_FILE });
    console.log(`Auth state saved to ${AUTH_FILE}`);
  } catch (error) {
    console.error('Auth setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run setup
setupAuth().catch(console.error);