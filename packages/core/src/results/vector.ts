import type { SerializedPaint } from '../model/paint.js';

export interface GetVectorResult {
  nodeId: string;
  type: string;
  width: number;
  height: number;
  vectorPaths: { windingRule: string; data: string }[];
  vectorNetwork: {
    vertices: {
      x: number;
      y: number;
      strokeCap?: string;
      strokeJoin?: string;
      cornerRadius?: number;
      handleMirroring?: string;
    }[];
    segments: {
      start: number;
      end: number;
      tangentStart?: { x: number; y: number };
      tangentEnd?: { x: number; y: number };
    }[];
    regions?: {
      windingRule: string;
      loops: number[][];
      fills?: SerializedPaint[];
      fillStyleId?: string;
    }[];
  };
  handleMirroring: string;
}
