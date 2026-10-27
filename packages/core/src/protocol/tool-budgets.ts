export const DEFAULT_TOOL_BUDGET_MS = 30_000;

export const HEAVY_TOOL_BUDGET_MS = 120_000;

export const BUDGET_LAYER_MARGIN_MS = 5_000;

const HEAVY_TOOLS: ReadonlySet<string> = new Set([
  'get_screenshot',
  'save_screenshots',
  'save_image_fills',
  'export_pdf',
  'get_document',
  'get_design_context',
  'get_node',
  'get_nodes_info',
  'search_nodes',
  'scan_text_nodes',
  'scan_nodes_by_types',
  'get_local_components',
  'import_variable',
  'import_style',
  'batch',
]);

export const getToolBudget = (toolName: string): number =>
  HEAVY_TOOLS.has(toolName) ? HEAVY_TOOL_BUDGET_MS : DEFAULT_TOOL_BUDGET_MS;

export const getRelayBudget = (toolName: string): number =>
  getToolBudget(toolName) + BUDGET_LAYER_MARGIN_MS;

export const getFollowerBudget = (toolName: string): number =>
  getToolBudget(toolName) + 2 * BUDGET_LAYER_MARGIN_MS;
