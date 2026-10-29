type Matrix = [[number, number, number], [number, number, number]];

interface FakeNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  parent: FakeNode | { id: string; type: 'PAGE'; parent: null } | null;
  layoutMode?: string;
  layoutPositioning?: string;
  readonly relativeTransform: Matrix;
  readonly absoluteTransform: Matrix;
}

const compose = (m: Matrix, n: Matrix): Matrix => [
  [
    m[0][0] * n[0][0] + m[0][1] * n[1][0],
    m[0][0] * n[0][1] + m[0][1] * n[1][1],
    m[0][0] * n[0][2] + m[0][1] * n[1][2] + m[0][2],
  ],
  [
    m[1][0] * n[0][0] + m[1][1] * n[1][0],
    m[1][0] * n[0][1] + m[1][1] * n[1][1],
    m[1][0] * n[0][2] + m[1][1] * n[1][2] + m[1][2],
  ],
];

export const PAGE = { id: '0:0', type: 'PAGE' as const, parent: null };

export const node = (
  id: string,
  parent: FakeNode['parent'],
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<Pick<FakeNode, 'type' | 'rotation' | 'layoutMode' | 'layoutPositioning'>> = {},
): FakeNode => ({
  id,
  type: 'RECTANGLE',
  x,
  y,
  width,
  height,
  rotation: 0,
  parent,
  ...extra,
  get relativeTransform(): Matrix {
    const r = (this.rotation * Math.PI) / 180;
    return [
      [Math.cos(r), -Math.sin(r), this.x],
      [Math.sin(r), Math.cos(r), this.y],
    ];
  },
  get absoluteTransform(): Matrix {
    const up = this.parent;
    return up !== null && 'absoluteTransform' in up
      ? compose(up.absoluteTransform, this.relativeTransform)
      : this.relativeTransform;
  },
});

export const frame = (extra: Parameters<typeof node>[6] = {}, id = '0:1'): FakeNode =>
  node(id, PAGE, 100, 50, 400, 200, { type: 'FRAME', layoutMode: 'NONE', ...extra });

export const fakeFigma = (...nodes: { id: string }[]): typeof figma => {
  const lookup = Object.fromEntries(nodes.map(n => [n.id, n]));
  return { getNodeByIdAsync: async (id: string) => lookup[id] ?? null } as unknown as typeof figma;
};

export const canvasOrigin = (n: FakeNode): [number, number] => [
  n.absoluteTransform[0][2],
  n.absoluteTransform[1][2],
];
