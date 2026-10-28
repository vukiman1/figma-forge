import { describe, expect, it } from 'vitest';

import type { ActivityPayload } from '../../ui/relay/payload.js';
import {
  ACTIVITY_LIMIT,
  type ActivityEntry,
  initialRelayState,
  recordCallEnd,
  recordCallStart,
  type RelayClientState,
} from '../../ui/relay/state.js';

const payload = (over: Partial<ActivityPayload> = {}): ActivityPayload => ({
  preview: '{"ok":true}',
  bytes: 11,
  truncated: false,
  ...over,
});

const apply = (state: RelayClientState, partial: Partial<RelayClientState>): RelayClientState => ({
  ...state,
  ...partial,
});

const started = (
  state: RelayClientState,
  over: Partial<Parameters<typeof recordCallStart>[1]> = {},
): RelayClientState =>
  apply(
    state,
    recordCallStart(state, { id: 'req-1', method: 'get_node', startedAt: 1000, ...over }),
  );

const entryOf = (state: RelayClientState, id: string): ActivityEntry | undefined =>
  state.activity.find(e => e.id === id);

describe('recordCallStart', () => {
  it('puts the new call at the front, pending', () => {
    const state = started(started(initialRelayState()), { id: 'req-2', method: 'set_fills' });

    expect(state.activity.map(e => e.id)).toEqual(['req-2', 'req-1']);
    expect(state.activity[0]).toMatchObject({ method: 'set_fills', status: 'pending' });
  });

  it('counts every call against the lifetime total, which stays honest once the list has rolled over', () => {
    let state = initialRelayState();
    for (let i = 0; i < ACTIVITY_LIMIT + 5; i++) state = started(state, { id: `req-${i}` });

    expect(state.totalCalls).toBe(ACTIVITY_LIMIT + 5);
    expect(state.activity).toHaveLength(ACTIVITY_LIMIT);
  });

  it('drops the oldest call once the list is full', () => {
    let state = initialRelayState();
    for (let i = 0; i < ACTIVITY_LIMIT + 1; i++) state = started(state, { id: `req-${i}` });

    expect(entryOf(state, 'req-0')).toBeUndefined();
    expect(entryOf(state, `req-${ACTIVITY_LIMIT}`)).toBeDefined();
  });

  it('omits an empty node list, so the row offers no reveal for a call that named nothing', () => {
    const state = started(initialRelayState(), { nodeIds: [] });

    expect(entryOf(state, 'req-1')).not.toHaveProperty('nodeIds');
  });

  it('keeps the request snapshot and the ids the params named', () => {
    const state = started(initialRelayState(), {
      request: payload({ preview: '{"nodeId":"1:2"}' }),
      nodeIds: ['1:2'],
    });

    expect(entryOf(state, 'req-1')).toMatchObject({
      request: { preview: '{"nodeId":"1:2"}' },
      nodeIds: ['1:2'],
    });
  });
});

describe('recordCallEnd', () => {
  const settle = (
    state: RelayClientState,
    over: Partial<Parameters<typeof recordCallEnd>[1]> = {},
  ): RelayClientState =>
    apply(state, recordCallEnd(state, { id: 'req-1', status: 'ok', settledAt: 1250, ...over }));

  it('stamps the outcome and how long the call took', () => {
    const state = settle(started(initialRelayState()), { payload: payload() });

    expect(entryOf(state, 'req-1')).toMatchObject({
      status: 'ok',
      durationMs: 250,
      payload: { bytes: 11 },
    });
  });

  it('leaves other calls untouched', () => {
    const state = settle(started(started(initialRelayState()), { id: 'req-2' }));

    expect(entryOf(state, 'req-2')?.status).toBe('pending');
  });

  it('counts a failure and records its message', () => {
    const state = settle(started(initialRelayState()), { status: 'error', error: 'no node' });

    expect(state.failedCalls).toBe(1);
    expect(entryOf(state, 'req-1')).toMatchObject({ status: 'error', error: 'no node' });
  });

  it('leaves the failure count alone on success', () => {
    expect(settle(started(initialRelayState())).failedCalls).toBe(0);
  });

  describe('node ids', () => {
    it('adds ids the result named to those the params carried, since a create call names its node only in the result', () => {
      const state = settle(started(initialRelayState(), { nodeIds: ['1:2'] }), {
        nodeIds: ['3:4'],
      });

      expect(entryOf(state, 'req-1')?.nodeIds).toEqual(['1:2', '3:4']);
    });

    it('lists a node once when a call both targets and returns it', () => {
      const state = settle(started(initialRelayState(), { nodeIds: ['1:2'] }), {
        nodeIds: ['1:2', '3:4'],
      });

      expect(entryOf(state, 'req-1')?.nodeIds).toEqual(['1:2', '3:4']);
    });

    it('keeps params first, so the call leads with what was asked about', () => {
      const state = settle(started(initialRelayState(), { nodeIds: ['9:9'] }), {
        nodeIds: ['1:1'],
      });

      expect(entryOf(state, 'req-1')?.nodeIds).toEqual(['9:9', '1:1']);
    });
  });

  it('still counts a failure whose row has been dropped, because the count is about the session, not the screen', () => {
    let state = initialRelayState();
    state = started(state, { id: 'old' });
    for (let i = 0; i < ACTIVITY_LIMIT; i++) state = started(state, { id: `req-${i}` });

    const settled = apply(
      state,
      recordCallEnd(state, { id: 'old', status: 'error', settledAt: 2000, error: 'gone' }),
    );

    expect(entryOf(settled, 'old')).toBeUndefined();
    expect(settled.failedCalls).toBe(1);
  });
});
