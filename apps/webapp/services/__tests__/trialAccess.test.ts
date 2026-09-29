import { describe, expect, it } from 'vitest';
import { ConjuntoInfo, UserProfile, UserRole } from '../../types';
import {
  canWriteForAccount,
  hasActivePaidPlan,
  isReadOnlyAccount,
  isTrialExpired,
  TRIAL_DEMO_EMAIL,
} from '../trialAccess';

const now = new Date('2026-09-29T12:00:00.000Z').getTime();

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  email: 'admin@example.com',
  fullName: 'Admin',
  role: UserRole.Trial,
  trialExpiresAt: '2026-09-29T12:00:00.000Z',
  ...overrides,
});

const conjunto = (overrides: Partial<ConjuntoInfo> = {}): ConjuntoInfo => ({
  id: 'conjunto-1',
  name: 'Conjunto',
  nit: '',
  address: '',
  adminName: 'Admin',
  adminEmail: 'admin@example.com',
  adminPhone: '',
  subscriptionPlan: 'Free',
  ...overrides,
});

describe('trial write access', () => {
  it('treats the exact expiration instant as expired', () => {
    expect(isTrialExpired(profile(), now)).toBe(true);
    expect(isTrialExpired(profile({ trialExpiresAt: '2026-09-29T12:00:00.001Z' }), now)).toBe(false);
    expect(isTrialExpired(profile({ trialExpiresAt: undefined }), now)).toBe(true);
  });

  it('allows a paid plan only while its configured expiry is in the future', () => {
    expect(hasActivePaidPlan(conjunto({ subscriptionPlan: 'Paid' }), now)).toBe(true);
    expect(hasActivePaidPlan(conjunto({
      subscriptionPlan: 'Paid',
      planExpiresAt: '2026-09-29T12:00:00.001Z',
    }), now)).toBe(true);
    expect(hasActivePaidPlan(conjunto({
      subscriptionPlan: 'Paid',
      planExpiresAt: '2026-09-29T12:00:00.000Z',
    }), now)).toBe(false);
  });

  it('makes an expired trial read-only unless the account has an active plan', () => {
    expect(canWriteForAccount(profile(), conjunto(), now)).toBe(false);
    expect(canWriteForAccount(profile(), conjunto({ subscriptionPlan: 'Paid' }), now)).toBe(true);
    expect(canWriteForAccount(profile({ role: UserRole.Subscriber }), conjunto(), now)).toBe(false);
    expect(canWriteForAccount(
      profile({ role: UserRole.Subscriber }),
      conjunto({ subscriptionPlan: 'Paid' }),
      now
    )).toBe(true);
  });

  it('keeps the designated demonstration account writable regardless of trial status', () => {
    expect(canWriteForAccount(profile({ email: TRIAL_DEMO_EMAIL }), conjunto(), now)).toBe(true);
    expect(canWriteForAccount(profile({ email: TRIAL_DEMO_EMAIL.toUpperCase() }), conjunto(), now)).toBe(true);
  });

  it('shows read-only state when a subscriber plan expires even if the trial date is later', () => {
    const subscriber = profile({
      role: UserRole.Subscriber,
      trialExpiresAt: '2026-10-01T12:00:00.000Z',
    });
    expect(isTrialExpired(subscriber, now)).toBe(false);
    expect(isReadOnlyAccount(subscriber, conjunto(), now)).toBe(true);
  });
});
