export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export type NodeChangeKind = 'added' | 'removed' | 'changed';

export interface NodeChange {
  id: string;
  name: string;
  type: string;
  path: string;
  kind: NodeChangeKind;
  fields?: FieldChange[];
}

export interface DesignDiffChanges {
  added: NodeChange[];
  removed: NodeChange[];
  changed: NodeChange[];
}

export interface FlatDesignNode {
  own: Record<string, unknown>;
  name: string;
  type: string;
  path: string;
  parentId: string | null;
  index: number;
}
