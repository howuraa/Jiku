import {
  CADProject,
  DiagnosticIssue,
  ParsedNode,
  ParsedRod,
} from '../types/cad';

export function isValidNumericString(raw: string): boolean {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return false;
  const regex = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (!regex.test(trimmed)) return false;
  const num = Number(trimmed);
  return Number.isFinite(num);
}

export function parseNumber(raw: string): number {
  const trimmed = raw.trim().replace(',', '.');
  if (!isValidNumericString(trimmed)) return NaN;
  return Number(trimmed);
}

export function isValidIntegerString(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return false;
  const num = Number(trimmed);
  return Number.isSafeInteger(num);
}

export function runFormalDiagnostics(project: CADProject) {
  const issues: DiagnosticIssue[] = [];

  const addError = (
    message: string,
    targetType?: DiagnosticIssue['targetType'],
    targetId?: number | string,
    field?: string
  ) => {
    issues.push({
      id: `err-${issues.length + 1}`,
      message,
      targetType,
      targetId,
      field,
    });
  };

  const nodeMap = new Map<number, { id: number; x: number; hasSupport: boolean }>();

  project.nodes.forEach((node) => {
    if (!isValidNumericString(node.x)) {
      addError(
        `Узел №${node.id}: координата X («${node.x || 'пусто'}») не является числом.`,
        'node',
        node.id,
        'x'
      );
    } else {
      nodeMap.set(node.id, {
        id: node.id,
        x: parseNumber(node.x),
        hasSupport: node.hasSupport,
      });
    }
  });

  const validRods: Array<{
    id: number;
    startNode: number;
    endNode: number;
    length: number;
    area: number;
    elasticModulus: number;
    allowableStress: number;
  }> = [];

  project.rods.forEach((rod) => {
    let ok = true;

    if (!isValidIntegerString(rod.startNode)) {
      addError(
        `Стержень №${rod.id}: номер начального узла («${rod.startNode}») должен быть целым числом.`,
        'rod',
        rod.id,
        'startNode'
      );
      ok = false;
    }

    if (!isValidIntegerString(rod.endNode)) {
      addError(
        `Стержень №${rod.id}: номер конечного узла («${rod.endNode}») должен быть целым числом.`,
        'rod',
        rod.id,
        'endNode'
      );
      ok = false;
    }

    const fields: Array<{
      key: 'length' | 'area' | 'elasticModulus' | 'allowableStress';
      label: string;
    }> = [
      { key: 'length', label: 'Длина L' },
      { key: 'area', label: 'Площадь сечения A' },
      { key: 'elasticModulus', label: 'Модуль упругости E' },
      { key: 'allowableStress', label: 'Допускаемое напряжение [σ]' },
    ];

    fields.forEach(({ key, label }) => {
      const valStr = rod[key];
      if (!isValidNumericString(valStr)) {
        addError(
          `Стержень №${rod.id}: поле «${label}» («${valStr || 'пусто'}») не является числом.`,
          'rod',
          rod.id,
          key
        );
        ok = false;
      } else {
        const val = parseNumber(valStr);
        if (val <= 0) {
          addError(
            `Стержень №${rod.id}: параметр «${label}» (${val}) должен быть больше нуля.`,
            'rod',
            rod.id,
            key
          );
        }
      }
    });

    if (ok) {
      validRods.push({
        id: rod.id,
        startNode: Number(rod.startNode.trim()),
        endNode: Number(rod.endNode.trim()),
        length: parseNumber(rod.length),
        area: parseNumber(rod.area),
        elasticModulus: parseNumber(rod.elasticModulus),
        allowableStress: parseNumber(rod.allowableStress),
      });
    }
  });

  const nodalForceMap = new Map<number, number>();
  const usedForceNodes = new Set<number>();

  project.concentratedLoads.forEach((item, idx) => {
    if (!isValidIntegerString(item.nodeId)) {
      addError(
        `Сила #${idx + 1}: номер узла («${item.nodeId}») должен быть целым числом.`,
        'force',
        item.id,
        'nodeId'
      );
      return;
    }

    const nId = Number(item.nodeId.trim());
    if (nId <= 0 || !project.nodes.some((n) => n.id === nId)) {
      addError(
        `Сила #${idx + 1}: указан несуществующий узел №${nId}.`,
        'force',
        item.id,
        'nodeId'
      );
    }

    if (usedForceNodes.has(nId)) {
      addError(
        `Сила #${idx + 1}: повторное задание нагрузки для узла №${nId}.`,
        'force',
        item.id,
        'nodeId'
      );
    }
    usedForceNodes.add(nId);

    if (!isValidNumericString(item.force)) {
      addError(
        `Сила в узле №${nId}: значение F («${item.force || 'пусто'}») не является числом.`,
        'force',
        item.id,
        'force'
      );
    } else {
      nodalForceMap.set(nId, (nodalForceMap.get(nId) ?? 0) + parseNumber(item.force));
    }
  });

  const rodLoadMap = new Map<number, number>();
  const usedLoadRods = new Set<number>();

  project.distributedLoads.forEach((item, idx) => {
    if (!isValidIntegerString(item.rodId)) {
      addError(
        `Погонная нагрузка #${idx + 1}: номер стержня («${item.rodId}») должен быть целым числом.`,
        'distributed',
        item.id,
        'rodId'
      );
      return;
    }

    const rId = Number(item.rodId.trim());
    if (rId <= 0 || !project.rods.some((r) => r.id === rId)) {
      addError(
        `Погонная нагрузка #${idx + 1}: указан несуществующий стержень №${rId}.`,
        'distributed',
        item.id,
        'rodId'
      );
    }

    if (usedLoadRods.has(rId)) {
      addError(
        `Погонная нагрузка #${idx + 1}: дублирование нагрузки для стержня №${rId}.`,
        'distributed',
        item.id,
        'rodId'
      );
    }
    usedLoadRods.add(rId);

    if (!isValidNumericString(item.load)) {
      addError(
        `Погонная нагрузка на стержне №${rId}: значение q («${item.load || 'пусто'}») не является числом.`,
        'distributed',
        item.id,
        'load'
      );
    } else {
      rodLoadMap.set(rId, (rodLoadMap.get(rId) ?? 0) + parseNumber(item.load));
    }
  });

  if (project.rods.length === 0) {
    addError(
      'В конструкции нет ни одного стержня.',
      'system'
    );
  }

  if (!project.nodes.some((n) => n.hasSupport)) {
    addError(
      'Не задана ни одна жёсткая опора (заделка).',
      'system'
    );
  }

  const attachedNodes = new Set<number>();
  const adj = new Map<number, Set<number>>();
  const usedStartNodes = new Map<number, number>();
  const usedEndNodes = new Map<number, number>();
  const intervals: Array<{ rodId: number; x1: number; x2: number }> = [];

  validRods.forEach((rod) => {
    const n1 = nodeMap.get(rod.startNode);
    const n2 = nodeMap.get(rod.endNode);

    if (!n1) {
      addError(
        `Стержень №${rod.id}: начальный узел №${rod.startNode} не найден.`,
        'rod',
        rod.id,
        'startNode'
      );
    }

    if (!n2) {
      addError(
        `Стержень №${rod.id}: конечный узел №${rod.endNode} не найден.`,
        'rod',
        rod.id,
        'endNode'
      );
    }

    if (rod.startNode === rod.endNode) {
      addError(
        `Стержень №${rod.id}: начальный и конечный узлы совпадают (узел №${rod.startNode}).`,
        'rod',
        rod.id,
        'endNode'
      );
    } else {
      if (usedStartNodes.has(rod.startNode)) {
        addError(
          `Стержень №${rod.id}: узел №${rod.startNode} уже является начальным для стержня №${usedStartNodes.get(rod.startNode)}.`,
          'rod',
          rod.id,
          'startNode'
        );
      } else {
        usedStartNodes.set(rod.startNode, rod.id);
      }

      if (usedEndNodes.has(rod.endNode)) {
        addError(
          `Стержень №${rod.id}: узел №${rod.endNode} уже является конечным для стержня №${usedEndNodes.get(rod.endNode)}.`,
          'rod',
          rod.id,
          'endNode'
        );
      } else {
        usedEndNodes.set(rod.endNode, rod.id);
      }
    }

    if (n1 && n2 && rod.startNode !== rod.endNode) {
      attachedNodes.add(rod.startNode);
      attachedNodes.add(rod.endNode);

      if (!adj.has(rod.startNode)) adj.set(rod.startNode, new Set());
      if (!adj.has(rod.endNode)) adj.set(rod.endNode, new Set());
      adj.get(rod.startNode)!.add(rod.endNode);
      adj.get(rod.endNode)!.add(rod.startNode);

      const dx = n2.x - n1.x;
      if (dx <= 0) {
        addError(
          `Стержень №${rod.id}: начальный узел №${rod.startNode} (x=${n1.x}) должен быть левее конечного узла №${rod.endNode} (x=${n2.x}).`,
          'rod',
          rod.id,
          'endNode'
        );
      } else if (rod.length > 0 && Math.abs(dx - rod.length) > 1e-6) {
        addError(
          `Стержень №${rod.id}: длина L=${rod.length} не равна расстоянию между узлами (Δx=${Number(dx.toFixed(6))}).`,
          'rod',
          rod.id,
          'length'
        );
      }

      const x1 = Math.min(n1.x, n2.x);
      const x2 = Math.max(n1.x, n2.x);
      if (x2 > x1) {
        intervals.push({ rodId: rod.id, x1, x2 });
      }
    }
  });

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];
      const left = Math.max(a.x1, b.x1);
      const right = Math.min(a.x2, b.x2);
      if (right - left > 1e-7) {
        addError(
          `Стержни №${a.rodId} и №${b.rodId} накладываются друг на друга.`,
          'rod',
          b.rodId,
          'endNode'
        );
      }
    }
  }

  project.nodes.forEach((node) => {
    if (!attachedNodes.has(node.id)) {
      addError(
        `Узел №${node.id} не привязан ни к одному стержню.`,
        'node',
        node.id
      );
    }
  });

  if (attachedNodes.size > 0 && project.rods.length > 0) {
    const first = Array.from(attachedNodes)[0];
    const visited = new Set<number>([first]);
    const queue = [first];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj.get(curr);
      if (neighbors) {
        neighbors.forEach((next) => {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        });
      }
    }

    if (visited.size < attachedNodes.size) {
      addError(
        'Конструкция распадается на несвязанные части.',
        'system'
      );
    }
  }

  const parsedNodes: ParsedNode[] = project.nodes.map((n, index) => {
    const rawX = parseNumber(n.x);
    return {
      id: n.id,
      x: Number.isFinite(rawX) ? rawX : index,
      hasSupport: n.hasSupport,
      concentratedForce: nodalForceMap.get(n.id) ?? 0,
    };
  });

  let runningX = 0;
  const parsedRods: ParsedRod[] = project.rods.map((r) => {
    const rawL = parseNumber(r.length);
    const safeL = Number.isFinite(rawL) && rawL > 0 ? rawL : 1;
    const rawA = parseNumber(r.area);
    const safeA = Number.isFinite(rawA) && rawA > 0 ? rawA : 1;
    const rawE = parseNumber(r.elasticModulus);
    const safeE = Number.isFinite(rawE) && rawE > 0 ? rawE : 1;
    const rawS = parseNumber(r.allowableStress);
    const safeS = Number.isFinite(rawS) && rawS > 0 ? rawS : 1;

    const startId = isValidIntegerString(r.startNode) ? Number(r.startNode) : r.id;
    const endId = isValidIntegerString(r.endNode) ? Number(r.endNode) : r.id + 1;

    const startNodeFound = parsedNodes.find((n) => n.id === startId);
    const endNodeFound = parsedNodes.find((n) => n.id === endId);

    const xStart = startNodeFound ? startNodeFound.x : runningX;
    const xEnd =
      endNodeFound && endNodeFound.x > xStart ? endNodeFound.x : xStart + safeL;
    runningX = xEnd;

    return {
      id: r.id,
      startNode: startId,
      endNode: endId,
      xStart,
      xEnd,
      length: safeL,
      area: safeA,
      elasticModulus: safeE,
      allowableStress: safeS,
      distributedLoad: rodLoadMap.get(r.id) ?? 0,
    };
  });

  return {
    isValid: issues.length === 0,
    errorCount: issues.length,
    issues,
    parsedRods,
    parsedNodes,
  };
}
