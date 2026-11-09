export interface RodInput {
  id: number;
  startNode: string;
  endNode: string;
  length: string;
  area: string;
  elasticModulus: string;
  allowableStress: string;
}

export interface NodeInput {
  id: number;
  x: string;
  hasSupport: boolean;
}

export interface ConcentratedLoadInput {
  id: string;
  nodeId: string;
  force: string;
}

export interface DistributedLoadInput {
  id: string;
  rodId: string;
  load: string;
}

export interface CADProject {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  unitSystem: 'SI' | 'dimensionless';
  rods: RodInput[];
  nodes: NodeInput[];
  concentratedLoads: ConcentratedLoadInput[];
  distributedLoads: DistributedLoadInput[];
}

export interface DiagnosticIssue {
  id: string;
  message: string;
  targetType?: 'rod' | 'node' | 'force' | 'distributed' | 'system';
  targetId?: number | string;
  field?: string;
}

export interface ParsedRod {
  id: number;
  startNode: number;
  endNode: number;
  xStart: number;
  xEnd: number;
  length: number;
  area: number;
  elasticModulus: number;
  allowableStress: number;
  distributedLoad: number;
}

export interface ParsedNode {
  id: number;
  x: number;
  hasSupport: boolean;
  concentratedForce: number;
}

export type ProjectExportFormat =
  | 'sapr-json'
  | 'method-topological-json'
  | 'method-rods-json'
  | 'method-txt';
