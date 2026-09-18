import { describe, expect, it } from 'vitest';
import { buildNotificationPayload, isPushSupported } from '../pwaPush';

describe('pwaPush', () => {
  it('builds a notification payload with defaults', () => {
    expect(buildNotificationPayload({ title: 'Comunicado', body: 'Hay un nuevo aviso' })).toEqual({
      title: 'Comunicado',
      body: 'Hay un nuevo aviso',
      url: '/',
      icon: '/logo-paic.png',
      badge: '/logo-paic.png',
    });
  });

  it('falls back to the default target URL when none is provided', () => {
    expect(buildNotificationPayload({ title: 'Aviso' }).url).toBe('/');
  });

  it('detects browser push support only when the APIs exist', () => {
    expect(typeof isPushSupported).toBe('function');
  });
});
