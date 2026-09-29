import { ConjuntoInfo, UserProfile, UserRole } from '../types';

export const TRIAL_DEMO_EMAIL = 'shadowalkalone@gmail.com';

export function isTrialExpired(userProfile: UserProfile | null, now = Date.now()): boolean {
  if (userProfile?.role !== UserRole.Trial && userProfile?.role !== UserRole.Subscriber) return false;
  if (!userProfile.trialExpiresAt) return true;

  const trialExpiresAt = new Date(userProfile.trialExpiresAt).getTime();
  return !Number.isFinite(trialExpiresAt) || trialExpiresAt <= now;
}

export function hasActivePaidPlan(conjuntoInfo: ConjuntoInfo | null, now = Date.now()): boolean {
  if (conjuntoInfo?.subscriptionPlan !== 'Paid') return false;
  if (!conjuntoInfo.planExpiresAt) return true;

  const planExpiresAt = new Date(conjuntoInfo.planExpiresAt).getTime();
  return Number.isFinite(planExpiresAt) && planExpiresAt > now;
}

export function canWriteForAccount(
  userProfile: UserProfile | null,
  conjuntoInfo: ConjuntoInfo | null,
  now = Date.now()
): boolean {
  if (!userProfile) return true;
  if (userProfile.email.trim().toLowerCase() === TRIAL_DEMO_EMAIL) return true;
  if (userProfile.role !== UserRole.Trial && userProfile.role !== UserRole.Subscriber) return true;
  if (hasActivePaidPlan(conjuntoInfo, now)) return true;
  if (userProfile.role === UserRole.Subscriber) return false;
  return !isTrialExpired(userProfile, now);
}

export function isReadOnlyAccount(
  userProfile: UserProfile | null,
  conjuntoInfo: ConjuntoInfo | null,
  now = Date.now()
): boolean {
  return userProfile !== null
    && (userProfile.role === UserRole.Trial || userProfile.role === UserRole.Subscriber)
    && !canWriteForAccount(userProfile, conjuntoInfo, now);
}
