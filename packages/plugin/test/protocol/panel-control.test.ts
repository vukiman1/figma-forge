import { describe, expect, it } from 'vitest';

import {
  clampPanelSize,
  createPanelHide,
  createPanelResize,
  createPanelReveal,
  PANEL_CONTROL_TAG,
  PANEL_DEFAULT_SIZE,
  PANEL_MIN_SIZE,
  parsePanelControl,
} from '../../protocol/panel-control.js';

describe('clampPanelSize', () => {
  it('holds the floor when a drag goes below it', () => {
    expect(clampPanelSize(10, 10)).toEqual(PANEL_MIN_SIZE);
  });

  it('keeps the exact floor value', () => {
    expect(clampPanelSize(PANEL_MIN_SIZE.width, PANEL_MIN_SIZE.height)).toEqual(PANEL_MIN_SIZE);
  });

  it('drops sub-pixels so the window never gets a fractional size', () => {
    expect(clampPanelSize(400.9, 500.2)).toEqual({ width: 400, height: 500 });
  });

  it('clamps each axis independently', () => {
    expect(clampPanelSize(1000, 10)).toEqual({ width: 1000, height: PANEL_MIN_SIZE.height });
    expect(clampPanelSize(10, 1000)).toEqual({ width: PANEL_MIN_SIZE.width, height: 1000 });
  });

  it('is idempotent, so the two ends that both clamp never fight over a drag', () => {
    const once = clampPanelSize(400.9, 500.2);

    expect(clampPanelSize(once.width, once.height)).toEqual(once);
  });

  it('opens at a size the floor would not reject', () => {
    expect(clampPanelSize(PANEL_DEFAULT_SIZE.width, PANEL_DEFAULT_SIZE.height)).toEqual(
      PANEL_DEFAULT_SIZE,
    );
  });
});

describe('parsePanelControl', () => {
  it('round-trips every message the panel can send', () => {
    expect(parsePanelControl(createPanelHide())).toEqual(createPanelHide());
    expect(parsePanelControl(createPanelResize({ width: 400, height: 500 }, true))).toEqual(
      createPanelResize({ width: 400, height: 500 }, true),
    );
    expect(parsePanelControl(createPanelReveal(['1:1', '2:2']))).toEqual(
      createPanelReveal(['1:1', '2:2']),
    );
  });

  it('passes over anything that is not tagged as panel control', () => {
    expect(
      parsePanelControl({ tag: '@figma-forge/bridge', kind: 'tool-call', id: 'x' }),
    ).toBeNull();
    expect(parsePanelControl({ kind: 'panel-hide' })).toBeNull();
    expect(parsePanelControl(null)).toBeNull();
    expect(parsePanelControl('panel-hide')).toBeNull();
    expect(parsePanelControl(undefined)).toBeNull();
  });

  it('rejects a tagged message with an unknown kind', () => {
    expect(parsePanelControl({ tag: PANEL_CONTROL_TAG, kind: 'panel-explode' })).toBeNull();
  });

  describe('resize', () => {
    it('rejects a size that is not a pair of finite numbers, dropping the message whole rather than half-applying it', () => {
      const resize = (over: Record<string, unknown>): unknown => ({
        ...createPanelResize({ width: 400, height: 500 }, false),
        ...over,
      });

      expect(parsePanelControl(resize({ width: '400' }))).toBeNull();
      expect(parsePanelControl(resize({ height: undefined }))).toBeNull();
      expect(parsePanelControl(resize({ width: Number.NaN }))).toBeNull();
      expect(parsePanelControl(resize({ height: Number.POSITIVE_INFINITY }))).toBeNull();
      expect(parsePanelControl(resize({ persist: 'yes' }))).toBeNull();
    });

    it('accepts a size below the floor without clamping it here', () => {
      expect(parsePanelControl(createPanelResize({ width: 10, height: 10 }, false))).toMatchObject({
        width: 10,
        height: 10,
      });
    });
  });

  describe('reveal', () => {
    it('keeps the usable ids when one is the wrong type', () => {
      const message = { ...createPanelReveal(['1:1']), nodeIds: ['1:1', 42, null, '2:2'] };

      expect(parsePanelControl(message)).toEqual(createPanelReveal(['1:1', '2:2']));
    });

    it('rejects a request that names no usable node, so only a reveal that found nothing shows a notice', () => {
      expect(parsePanelControl({ ...createPanelReveal(['1:1']), nodeIds: [] })).toBeNull();
      expect(parsePanelControl({ ...createPanelReveal(['1:1']), nodeIds: [1, 2] })).toBeNull();
      expect(parsePanelControl({ ...createPanelReveal(['1:1']), nodeIds: 'x' })).toBeNull();
    });

    it('does not hand back a reference to the incoming array', () => {
      const nodeIds = ['1:1'];

      const parsed = parsePanelControl({ ...createPanelReveal(nodeIds), nodeIds });

      expect((parsed as { nodeIds: string[] }).nodeIds).not.toBe(nodeIds);
    });
  });
});
