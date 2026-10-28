export const PANEL_CONTROL_TAG = '@figma-forge/panel';

export const PANEL_MIN_SIZE = { width: 280, height: 300 } as const;

export const PANEL_DEFAULT_SIZE = { width: 292, height: 312 } as const;

export interface PanelSize {
  readonly width: number;
  readonly height: number;
}

export const clampPanelSize = (width: number, height: number): PanelSize => ({
  width: Math.max(PANEL_MIN_SIZE.width, Math.floor(width)),
  height: Math.max(PANEL_MIN_SIZE.height, Math.floor(height)),
});

export interface PanelHide {
  readonly tag: typeof PANEL_CONTROL_TAG;
  readonly kind: 'panel-hide';
}

export interface PanelResize extends PanelSize {
  readonly tag: typeof PANEL_CONTROL_TAG;
  readonly kind: 'panel-resize';
  readonly persist: boolean;
}

export interface PanelReveal {
  readonly tag: typeof PANEL_CONTROL_TAG;
  readonly kind: 'panel-reveal';
  readonly nodeIds: string[];
}

export type PanelControlMessage = PanelHide | PanelResize | PanelReveal;

export const createPanelHide = (): PanelHide => ({
  tag: PANEL_CONTROL_TAG,
  kind: 'panel-hide',
});

export const createPanelResize = (size: PanelSize, persist: boolean): PanelResize => ({
  tag: PANEL_CONTROL_TAG,
  kind: 'panel-resize',
  width: size.width,
  height: size.height,
  persist,
});

export const createPanelReveal = (nodeIds: readonly string[]): PanelReveal => ({
  tag: PANEL_CONTROL_TAG,
  kind: 'panel-reveal',
  nodeIds: [...nodeIds],
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const fieldOf = (raw: object, key: string): unknown => Reflect.get(raw, key);

const parseResize = (raw: object): PanelResize | null => {
  const width = fieldOf(raw, 'width');
  const height = fieldOf(raw, 'height');
  const persist = fieldOf(raw, 'persist');
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || typeof persist !== 'boolean')
    return null;
  return createPanelResize({ width, height }, persist);
};

const parseReveal = (raw: object): PanelReveal | null => {
  const ids = fieldOf(raw, 'nodeIds');
  if (!Array.isArray(ids)) return null;
  const nodeIds = ids.filter((id: unknown): id is string => typeof id === 'string');
  return nodeIds.length === 0 ? null : createPanelReveal(nodeIds);
};

export const parsePanelControl = (raw: unknown): PanelControlMessage | null => {
  if (typeof raw !== 'object' || raw === null || fieldOf(raw, 'tag') !== PANEL_CONTROL_TAG)
    return null;
  switch (fieldOf(raw, 'kind')) {
    case 'panel-hide':
      return createPanelHide();
    case 'panel-resize':
      return parseResize(raw);
    case 'panel-reveal':
      return parseReveal(raw);
    default:
      return null;
  }
};
