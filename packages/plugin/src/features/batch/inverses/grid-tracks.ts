import { readField, writeIfDifferent } from '../snapshot/values.js';
import {
  AUTO_ROWS,
  GRID_COLUMN_PROPS,
  GRID_MODES,
  GRID_ROW_PROPS,
  NO_AUTO_TRACKS,
  ROW_AUTO_FLOW,
} from './auto-layout-fields.js';

export type GridValues = Readonly<Record<string, unknown>>;

const hasAutoRows = (frame: BaseNode): boolean => readField(frame, 'gridAutoTracks') === AUTO_ROWS;

const writeGridFields = (frame: BaseNode, grid: GridValues, keys: readonly string[]): void => {
  for (const key of keys) if (key in grid) writeIfDifferent(frame, key, grid[key]);
};

const isGrowingRows = (frame: BaseNode, grid: GridValues): boolean => {
  const target = grid.gridRowCount;
  const current = readField(frame, 'gridRowCount');
  return typeof target === 'number' && typeof current === 'number' && target > current;
};

export const restoreGridTracks = (frame: BaseNode, grid: GridValues): void => {
  if (hasAutoRows(frame) && 'gridAutoTracks' in grid) {
    writeIfDifferent(frame, 'gridAutoTracks', NO_AUTO_TRACKS);
  }
  if (grid.gridItemsPositioning === ROW_AUTO_FLOW) {
    writeIfDifferent(frame, 'gridItemsPositioning', ROW_AUTO_FLOW);
  }
  writeGridFields(frame, grid, GRID_COLUMN_PROPS);
  if (!hasAutoRows(frame) && isGrowingRows(frame, grid)) {
    writeIfDifferent(frame, 'gridRowCount', grid.gridRowCount);
  }
};

export const finishGrid = (frame: BaseNode, grid: GridValues): void => {
  if (!hasAutoRows(frame)) writeGridFields(frame, grid, GRID_ROW_PROPS);
  writeGridFields(frame, grid, GRID_MODES);
};
