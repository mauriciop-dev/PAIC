import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const builder: Record<string, unknown> = {};
  builder.insert = insert;
  builder.select = vi.fn(() => builder);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  return { insert, builder, client: { from: vi.fn(() => builder) } };
});

vi.mock('@paic/supabase/client', () => ({ supabase: mocks.client }));

import {
  setWriteAccessProvider,
  supabase,
  TRIAL_WRITE_BLOCKED_EVENT,
  TRIAL_WRITE_BLOCKED_MESSAGE,
} from '../supabaseClient';

describe('trial write guard on the Supabase client', () => {
  beforeEach(() => {
    mocks.insert.mockReturnValue(mocks.builder);
  });

  afterEach(() => {
    setWriteAccessProvider(() => true);
    mocks.insert.mockReset();
    mocks.client.from.mockClear();
  });

  it('blocks write queries and dispatches the read-only reminder', async () => {
    setWriteAccessProvider(() => false);
    const onBlocked = vi.fn();
    window.addEventListener(TRIAL_WRITE_BLOCKED_EVENT, onBlocked);

    const { error } = await supabase.from('residents').insert({ name: 'Test' });

    window.removeEventListener(TRIAL_WRITE_BLOCKED_EVENT, onBlocked);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(error).toMatchObject({
      code: 'PAIC_TRIAL_EXPIRED',
      message: TRIAL_WRITE_BLOCKED_MESSAGE,
    });
    expect(onBlocked).toHaveBeenCalledOnce();
  });

  it('preserves the normal query path for accounts with write access', async () => {
    const result = await supabase.from('residents').insert({ name: 'Test' });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(result).toEqual({ data: [], error: null });
  });
});
