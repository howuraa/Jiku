import {
  CADProject,
  ConcentratedLoadInput,
  DistributedLoadInput,
  NodeInput,
  ProjectExportFormat,
  RodInput,
} from '../types/cad';
import { isValidNumericString, parseNumber } from './diagnostics';

export const DEFAULT_PROJECT: CADProject = {
  name: 'Проект САПР',
  description: 'Расчётная схема плоской стержневой системы',
  createdAt: '2026-11-07T00:00:00.000Z',
  updatedAt: '2026-11-07T00:00:00.000Z',
  unitSystem: 'SI',
  rods: [
    {
      id: 1,
      startNode: '1',
      endNode: '2',
      length: '3',
      area: '2',
      elasticModulus: '1',
      allowableStress: '1',
    },
    {
      id: 2,
      startNode: '2',
      endNode: '3',
      length: '2',
      area: '3',
      elasticModulus: '1',
      allowableStress: '1',
    },
    {
      id: 3,
      startNode: '3',
      endNode: '4',
      length: '3',
      area: '1',
      elasticModulus: '1',
      allowableStress: '1',
    },
  ],
  nodes: [
    { id: 1, x: '0', hasSupport: true },
    { id: 2, x: '3', hasSupport: false },
    { id: 3, x: '5', hasSupport: false },
    { id: 4, x: '8', hasSupport: true },
  ],
  concentratedLoads: [
    { id: 'f-1', nodeId: '2', force: '1' },
    { id: 'f-2', nodeId: '3', force: '-2' },
  ],
  distributedLoads: [
    { id: 'q-1', rodId: '1', load: '3' },
    { id: 'q-2', rodId: '3', load: '1' },
  ],
};

export const PRESET_PROJECTS: Array<{ id: string; title: string; project: CADProject }> = [
  {
    id: 'simple-1',
    title: 'Простая задача № 1',
    project: {
      name: 'Простая задача № 1',
      description: '1 стержень, заделка слева, сила F справа',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        {
          id: 1,
          startNode: '1',
          endNode: '2',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: false },
      ],
      concentratedLoads: [{ id: 'f-2', nodeId: '2', force: '1' }],
      distributedLoads: [],
    },
  },
  {
    id: 'simple-2',
    title: 'Простая задача № 2',
    project: {
      name: 'Простая задача № 2',
      description: '1 стержень, сила F слева, заделка справа',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        {
          id: 1,
          startNode: '1',
          endNode: '2',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: false },
        { id: 2, x: '1', hasSupport: true },
      ],
      concentratedLoads: [{ id: 'f-1', nodeId: '1', force: '1' }],
      distributedLoads: [],
    },
  },
  {
    id: 'simple-3',
    title: 'Простая задача № 3',
    project: {
      name: 'Простая задача № 3',
      description: '1 стержень, заделка слева, погонная нагрузка q',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        {
          id: 1,
          startNode: '1',
          endNode: '2',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: false },
      ],
      concentratedLoads: [],
      distributedLoads: [{ id: 'q-1', rodId: '1', load: '1' }],
    },
  },
  {
    id: 'simple-4',
    title: 'Простая задача № 4',
    project: {
      name: 'Простая задача № 4',
      description: '1 стержень, заделки слева и справа, погонная нагрузка q',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        {
          id: 1,
          startNode: '1',
          endNode: '2',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: true },
      ],
      concentratedLoads: [],
      distributedLoads: [{ id: 'q-1', rodId: '1', load: '1' }],
    },
  },
  {
    id: 'simple-5',
    title: 'Простая задача № 5',
    project: {
      name: 'Простая задача № 5',
      description: '2 стержня, заделки по краям, нагрузки q и -q',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        {
          id: 1,
          startNode: '1',
          endNode: '2',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
        {
          id: 2,
          startNode: '2',
          endNode: '3',
          length: '1',
          area: '1',
          elasticModulus: '1',
          allowableStress: '1',
        },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: false },
        { id: 3, x: '2', hasSupport: true },
      ],
      concentratedLoads: [],
      distributedLoads: [
        { id: 'q-1', rodId: '1', load: '1' },
        { id: 'q-2', rodId: '2', load: '-1' },
      ],
    },
  },
  {
    id: 'task-1',
    title: 'Задача 1',
    project: {
      name: 'Задача 1',
      description: '2 стержня (3L, 2L), сила 26F в узле 2',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '3', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '2', area: '3', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '3', hasSupport: false },
        { id: 3, x: '5', hasSupport: true },
      ],
      concentratedLoads: [{ id: 'f-2', nodeId: '2', force: '26' }],
      distributedLoads: [],
    },
  },
  {
    id: 'task-2',
    title: 'Задача 2',
    project: {
      name: 'Задача 2',
      description: '3 стержня (L, 2L, L), силы 3F и F',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '1', area: '3', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '2', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 3, startNode: '3', endNode: '4', length: '1', area: '1', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: false },
        { id: 3, x: '3', hasSupport: false },
        { id: 4, x: '4', hasSupport: true },
      ],
      concentratedLoads: [
        { id: 'f-2', nodeId: '2', force: '3' },
        { id: 'f-3', nodeId: '3', force: '1' },
      ],
      distributedLoads: [],
    },
  },
  {
    id: 'task-3',
    title: 'Задача 3',
    project: {
      name: 'Задача 3',
      description: '2 стержня (2L, L), нагрузка q и сила -4',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '2', area: '1', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '1', area: '2', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '2', hasSupport: false },
        { id: 3, x: '3', hasSupport: true },
      ],
      concentratedLoads: [{ id: 'f-2', nodeId: '2', force: '-4' }],
      distributedLoads: [{ id: 'q-1', rodId: '1', load: '1' }],
    },
  },
  {
    id: 'task-4',
    title: 'Задача 4',
    project: {
      name: 'Задача 4',
      description: '2 стержня (2L, L), заделка слева, сила -2 и q',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '2', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '1', area: '1', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '2', hasSupport: false },
        { id: 3, x: '3', hasSupport: false },
      ],
      concentratedLoads: [{ id: 'f-2', nodeId: '2', force: '-2' }],
      distributedLoads: [{ id: 'q-2', rodId: '2', load: '1' }],
    },
  },
  {
    id: 'task-5',
    title: 'Задача 5',
    project: {
      name: 'Задача 5',
      description: '4 стержня (L, 2L, 2L, L), нагрузки q, -q и сила F',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '1', area: '1', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '2', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 3, startNode: '3', endNode: '4', length: '2', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 4, startNode: '4', endNode: '5', length: '1', area: '1', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '1', hasSupport: false },
        { id: 3, x: '3', hasSupport: false },
        { id: 4, x: '5', hasSupport: false },
        { id: 5, x: '6', hasSupport: true },
      ],
      concentratedLoads: [{ id: 'f-3', nodeId: '3', force: '1' }],
      distributedLoads: [
        { id: 'q-1', rodId: '1', load: '1' },
        { id: 'q-4', rodId: '4', load: '-1' },
      ],
    },
  },
  {
    id: 'task-6',
    title: 'Задача 6',
    project: {
      name: 'Задача 6',
      description: '2 стержня (2L, 4L), нагрузки 9q и -2q',
      createdAt: '2026-11-09T00:00:00.000Z',
      updatedAt: '2026-11-09T00:00:00.000Z',
      unitSystem: 'SI',
      rods: [
        { id: 1, startNode: '1', endNode: '2', length: '2', area: '2', elasticModulus: '1', allowableStress: '1' },
        { id: 2, startNode: '2', endNode: '3', length: '4', area: '1', elasticModulus: '1', allowableStress: '1' },
      ],
      nodes: [
        { id: 1, x: '0', hasSupport: true },
        { id: 2, x: '2', hasSupport: false },
        { id: 3, x: '6', hasSupport: true },
      ],
      concentratedLoads: [],
      distributedLoads: [
        { id: 'q-1', rodId: '1', load: '9' },
        { id: 'q-2', rodId: '2', load: '-2' },
      ],
    },
  },
];

export function serializeProject(
  project: CADProject,
  format: ProjectExportFormat
): { content: string; extension: string; mime: string } {
  if (format === 'sapr-json') {
    return {
      content: JSON.stringify(project, null, 2),
      extension: 'json',
      mime: 'application/json',
    };
  }

  if (format === 'method-topological-json') {
    const xr = project.nodes.map((n) =>
      isValidNumericString(n.x) ? parseNumber(n.x) : 0
    );
    const xs = project.rods.map((r, idx) => ({
      I: Number(r.startNode) || idx + 1,
      J: Number(r.endNode) || idx + 2,
      Ig: idx + 1,
    }));
    const xc = project.rods.map((r) => ({
      A: isValidNumericString(r.area) ? parseNumber(r.area) : 1,
      E: isValidNumericString(r.elasticModulus)
        ? parseNumber(r.elasticModulus)
        : 1,
      S: isValidNumericString(r.allowableStress)
        ? parseNumber(r.allowableStress)
        : 1,
    }));
    const nb = project.nodes.filter((n) => n.hasSupport).map((n) => n.id);
    const qr = project.concentratedLoads
      .filter((f) => isValidNumericString(f.force) && parseNumber(f.force) !== 0)
      .map((f) => ({
        I: Number(f.nodeId) || 1,
        Fx: parseNumber(f.force),
      }));
    const qs = project.distributedLoads
      .filter((q) => isValidNumericString(q.load) && parseNumber(q.load) !== 0)
      .map((q) => ({
        I: Number(q.rodId) || 1,
        Qx: parseNumber(q.load),
      }));

    return {
      content: JSON.stringify({ xr, xs, xc, nb, qr, qs }, null, 2),
      extension: 'json',
      mime: 'application/json',
    };
  }

  if (format === 'method-rods-json') {
    const rodsObj: Record<
      string,
      {
        Length: number;
        Width: number;
        'Young modulus': number;
        Sigma: number;
        Load: number;
      }
    > = {};

    project.rods.forEach((r) => {
      const qFound = project.distributedLoads.find(
        (d) => Number(d.rodId) === r.id
      );
      rodsObj[String(r.id)] = {
        Length: isValidNumericString(r.length) ? parseNumber(r.length) : 1,
        Width: isValidNumericString(r.area) ? parseNumber(r.area) : 1,
        'Young modulus': isValidNumericString(r.elasticModulus)
          ? parseNumber(r.elasticModulus)
          : 1,
        Sigma: isValidNumericString(r.allowableStress)
          ? parseNumber(r.allowableStress)
          : 1,
        Load:
          qFound && isValidNumericString(qFound.load)
            ? parseNumber(qFound.load)
            : 0,
      };
    });

    const knotsObj: Record<string, number> = {};
    project.nodes.forEach((n) => {
      const fFound = project.concentratedLoads.find(
        (f) => Number(f.nodeId) === n.id
      );
      knotsObj[String(n.id)] =
        fFound && isValidNumericString(fFound.force)
          ? parseNumber(fFound.force)
          : 0;
    });

    const firstNode = project.nodes[0];
    const lastNode = project.nodes[project.nodes.length - 1];

    return {
      content: JSON.stringify(
        {
          Rods: rodsObj,
          Knots: knotsObj,
          Sealing: {
            Left: Boolean(firstNode?.hasSupport),
            Right: Boolean(lastNode?.hasSupport && project.nodes.length > 1),
          },
        },
        null,
        2
      ),
      extension: 'json',
      mime: 'application/json',
    };
  }

  const nodesLine = project.nodes.map((n) => n.x.trim() || '0').join(' ');
  const thicknessesLine = project.rods
    .map((r) => r.area.trim() || '1')
    .join(' ');
  const eLine = project.rods
    .map((r) => r.elasticModulus.trim() || '1')
    .join(' ');
  const sygmasLine = project.rods
    .map((r) => r.allowableStress.trim() || '1')
    .join(' ');
  const pillarsLine = project.nodes
    .filter((n) => n.hasSupport)
    .map((n) => n.id)
    .join(' ');
  const pointLine = project.nodes
    .map((n) => {
      const f = project.concentratedLoads.find(
        (item) => Number(item.nodeId) === n.id
      );
      return f ? f.force.trim() : '0';
    })
    .join(' ');
  const distributedLine = project.rods
    .map((r) => {
      const q = project.distributedLoads.find(
        (item) => Number(item.rodId) === r.id
      );
      return q ? q.load.trim() : '0';
    })
    .join(' ');

  const txtContent = [
    `nodes: ${nodesLine}`,
    `thicknesses: ${thicknessesLine}`,
    `E: ${eLine}`,
    `sygmas: ${sygmasLine}`,
    `pillars: ${pillarsLine}`,
    `point: ${pointLine}`,
    `distributed: ${distributedLine}`,
  ].join('\n');

  return {
    content: txtContent,
    extension: 'txt',
    mime: 'text/plain',
  };
}

export function deserializeProjectFile(
  rawText: string,
  fileName: string
): CADProject {
  const trimmed = rawText.trim();

  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);

    if (Array.isArray(data.rods) && Array.isArray(data.nodes)) {
      const concentratedLoads: ConcentratedLoadInput[] = Array.isArray(
        data.concentratedLoads
      )
        ? data.concentratedLoads
        : [];

      const distributedLoads: DistributedLoadInput[] = Array.isArray(
        data.distributedLoads
      )
        ? data.distributedLoads
        : [];

      if (concentratedLoads.length === 0) {
        data.nodes.forEach(
          (
            n: NodeInput & { concentratedForce?: string | number },
            idx: number
          ) => {
            const nodeId = Number(n.id) || idx + 1;
            if (
              n.concentratedForce !== undefined &&
              String(n.concentratedForce).trim() !== '' &&
              String(n.concentratedForce).trim() !== '0'
            ) {
              concentratedLoads.push({
                id: `f-${nodeId}`,
                nodeId: String(nodeId),
                force: String(n.concentratedForce),
              });
            }
          }
        );
      }

      if (distributedLoads.length === 0) {
        data.rods.forEach(
          (
            r: RodInput & { distributedLoad?: string | number },
            idx: number
          ) => {
            const rodId = Number(r.id) || idx + 1;
            if (
              r.distributedLoad !== undefined &&
              String(r.distributedLoad).trim() !== '' &&
              String(r.distributedLoad).trim() !== '0'
            ) {
              distributedLoads.push({
                id: `q-${rodId}`,
                rodId: String(rodId),
                load: String(r.distributedLoad),
              });
            }
          }
        );
      }

      return {
        name: data.name || fileName.replace(/\.[^.]+$/, ''),
        description: data.description || 'Импортированный проект',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unitSystem:
          data.unitSystem === 'dimensionless' ? 'dimensionless' : 'SI',
        rods: data.rods.map(
          (
            r: RodInput & {
              leftNodeId?: string | number;
              rightNodeId?: string | number;
            },
            idx: number
          ) => ({
            id: Number(r.id) || idx + 1,
            startNode: String(r.startNode ?? r.leftNodeId ?? idx + 1),
            endNode: String(r.endNode ?? r.rightNodeId ?? idx + 2),
            length: String(r.length ?? '1'),
            area: String(r.area ?? '1'),
            elasticModulus: String(r.elasticModulus ?? '1'),
            allowableStress: String(r.allowableStress ?? '1'),
          })
        ),
        nodes: data.nodes.map((n: NodeInput, idx: number) => ({
          id: Number(n.id) || idx + 1,
          x: String(n.x ?? idx),
          hasSupport: Boolean(n.hasSupport),
        })),
        concentratedLoads,
        distributedLoads,
      };
    }

    if (
      Array.isArray(data.xr) &&
      Array.isArray(data.xs) &&
      Array.isArray(data.xc)
    ) {
      const nbSet = new Set<number>(
        Array.isArray(data.nb) ? data.nb.map(Number) : []
      );
      const nodes: NodeInput[] = data.xr.map((xVal: number, idx: number) => ({
        id: idx + 1,
        x: String(xVal),
        hasSupport: nbSet.has(idx + 1),
      }));

      const rods: RodInput[] = data.xs.map(
        (s: { I: number; J: number; Ig: number }, idx: number) => {
          const classIdx = (Number(s.Ig) || idx + 1) - 1;
          const c = data.xc[classIdx] || data.xc[idx] || { A: 1, E: 1, S: 1 };
          const nStart = nodes.find((n) => n.id === Number(s.I));
          const nEnd = nodes.find((n) => n.id === Number(s.J));
          const calcL =
            nStart && nEnd
              ? Math.abs(Number(nEnd.x) - Number(nStart.x))
              : 1;
          return {
            id: idx + 1,
            startNode: String(s.I ?? idx + 1),
            endNode: String(s.J ?? idx + 2),
            length: String(calcL > 0 ? calcL : 1),
            area: String(c.A ?? 1),
            elasticModulus: String(c.E ?? 1),
            allowableStress: String(c.S ?? 1),
          };
        }
      );

      const concentratedLoads: ConcentratedLoadInput[] = Array.isArray(data.qr)
        ? data.qr.map((item: { I: number; Fx: number }, idx: number) => ({
            id: `f-${idx + 1}`,
            nodeId: String(item.I),
            force: String(item.Fx),
          }))
        : [];

      const distributedLoads: DistributedLoadInput[] = Array.isArray(data.qs)
        ? data.qs.map((item: { I: number; Qx: number }, idx: number) => ({
            id: `q-${idx + 1}`,
            rodId: String(item.I),
            load: String(item.Qx),
          }))
        : [];

      return {
        name: fileName.replace(/\.[^.]+$/, ''),
        description: 'Импортированный проект',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unitSystem: 'SI',
        rods,
        nodes,
        concentratedLoads,
        distributedLoads,
      };
    }

    if (data.Rods && typeof data.Rods === 'object') {
      const rodKeys = Object.keys(data.Rods).sort(
        (a, b) => Number(a) - Number(b)
      );
      const rods: RodInput[] = [];
      const distributedLoads: DistributedLoadInput[] = [];
      let runningX = 0;
      const nodes: NodeInput[] = [];

      const leftSeal = Boolean(data.Sealing?.Left);
      const rightSeal = Boolean(data.Sealing?.Right);

      rodKeys.forEach((key, idx) => {
        const rObj = data.Rods[key];
        const rId = idx + 1;
        const len = Number(rObj.Length ?? 1);
        nodes.push({
          id: rId,
          x: String(runningX),
          hasSupport: rId === 1 ? leftSeal : false,
        });
        runningX += Number.isFinite(len) ? len : 1;

        rods.push({
          id: rId,
          startNode: String(rId),
          endNode: String(rId + 1),
          length: String(rObj.Length ?? 1),
          area: String(rObj.Width ?? 1),
          elasticModulus: String(rObj['Young modulus'] ?? 1),
          allowableStress: String(rObj.Sigma ?? 1),
        });

        if (rObj.Load !== undefined && Number(rObj.Load) !== 0) {
          distributedLoads.push({
            id: `q-${rId}`,
            rodId: String(rId),
            load: String(rObj.Load),
          });
        }
      });

      nodes.push({
        id: rodKeys.length + 1,
        x: String(runningX),
        hasSupport: rightSeal,
      });

      const concentratedLoads: ConcentratedLoadInput[] = [];
      if (data.Knots && typeof data.Knots === 'object') {
        Object.entries(data.Knots).forEach(([kId, val], idx) => {
          if (Number(val) !== 0) {
            concentratedLoads.push({
              id: `f-${idx + 1}`,
              nodeId: String(kId),
              force: String(val),
            });
          }
        });
      }

      return {
        name: fileName.replace(/\.[^.]+$/, ''),
        description: 'Импортированный проект',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unitSystem: 'SI',
        rods,
        nodes,
        concentratedLoads,
        distributedLoads,
      };
    }
  }

  const lines = trimmed.split(/\r?\n/);
  const map: Record<string, string[]> = {};
  lines.forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const vals = line
        .slice(colonIdx + 1)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      map[key] = vals;
    }
  });

  if (map.nodes && map.thicknesses) {
    const pillarsSet = new Set((map.pillars || []).map(Number));
    const nodes: NodeInput[] = map.nodes.map((xStr, idx) => ({
      id: idx + 1,
      x: xStr,
      hasSupport: pillarsSet.has(idx + 1),
    }));

    const rods: RodInput[] = map.thicknesses.map((aStr, idx) => {
      const x1 = Number(nodes[idx]?.x ?? idx);
      const x2 = Number(nodes[idx + 1]?.x ?? x1 + 1);
      const len = x2 - x1;
      return {
        id: idx + 1,
        startNode: String(idx + 1),
        endNode: String(idx + 2),
        length: String(Number.isFinite(len) && len > 0 ? len : 1),
        area: aStr,
        elasticModulus: map.e?.[idx] ?? '1',
        allowableStress: map.sygmas?.[idx] ?? '1',
      };
    });

    const concentratedLoads: ConcentratedLoadInput[] = [];
    (map.point || []).forEach((fStr, idx) => {
      if (fStr !== '0') {
        concentratedLoads.push({
          id: `f-${idx + 1}`,
          nodeId: String(idx + 1),
          force: fStr,
        });
      }
    });

    const distributedLoads: DistributedLoadInput[] = [];
    (map.distributed || []).forEach((qStr, idx) => {
      if (qStr !== '0') {
        distributedLoads.push({
          id: `q-${idx + 1}`,
          rodId: String(idx + 1),
          load: qStr,
        });
      }
    });

    return {
      name: fileName.replace(/\.[^.]+$/, ''),
      description: 'Импортированный проект',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unitSystem: 'SI',
      rods,
      nodes,
      concentratedLoads,
      distributedLoads,
    };
  }

  throw new Error('Не удалось распознать формат файла.');
}
