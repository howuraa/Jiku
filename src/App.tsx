import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FolderOpen,
  Trash2,
  X,
} from 'lucide-react';
import { ConstructionCanvas } from './components/ConstructionCanvas';
import { ProjectFileModal } from './components/ProjectFileModal';
import { CADProject, DiagnosticIssue, NodeInput, RodInput } from './types/cad';
import {
  isValidNumericString,
  parseNumber,
  runFormalDiagnostics,
} from './utils/diagnostics';
import {
  DEFAULT_PROJECT,
  deserializeProjectFile,
} from './utils/projectFiles';

const STORAGE_KEY = 'sapr_preprocessor_project_v7';

function normalizeProjectTopology(project: CADProject): CADProject {
  const rods: RodInput[] = project.rods.map((r, idx) => ({
    ...r,
    id: idx + 1,
    startNode: String(idx + 1),
    endNode: String(idx + 2),
  }));

  const targetNodeCount = rods.length > 0 ? rods.length + 1 : 0;
  const nodes: NodeInput[] = [];
  let runningX = 0;

  for (let i = 0; i < targetNodeCount; i++) {
    const nodeId = i + 1;
    const existing = project.nodes.find((n) => n.id === nodeId) || project.nodes[i];
    if (i > 0) {
      const prevRod = rods[i - 1];
      const len = prevRod ? parseNumber(prevRod.length) : 0;
      if (Number.isFinite(len) && len > 0) {
        runningX = Number((runningX + len).toFixed(6));
      }
    }
    nodes.push({
      id: nodeId,
      x: String(runningX),
      hasSupport: existing ? Boolean(existing.hasSupport) : nodeId === 1,
    });
  }

  return {
    ...project,
    rods,
    nodes,
  };
}

export default function App() {
  const [project, setProject] = useState<CADProject>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.rods) && Array.isArray(parsed.nodes)) {
          return normalizeProjectTopology(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return normalizeProjectTopology(DEFAULT_PROJECT);
  });

  const [selectedElement, setSelectedElement] = useState<{
    type: 'rod' | 'node';
    id: number;
  } | null>(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<'canvas' | 'input'>('canvas');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.error(e);
    }
  }, [project]);

  const diagnostics = useMemo(() => runFormalDiagnostics(project), [project]);

  const handleRodFieldChange = (
    rodId: number,
    field: keyof RodInput,
    value: string
  ) => {
    setProject((prev) => {
      const updatedRods = prev.rods.map((r) =>
        r.id === rodId ? { ...r, [field]: value } : r
      );

      return normalizeProjectTopology({
        ...prev,
        rods: updatedRods,
      });
    });
  };

  const handleDistributedLoadChange = (rodId: number, qValue: string) => {
    setProject((prev) => {
      const exists = prev.distributedLoads.some((d) => Number(d.rodId) === rodId);
      if (qValue === '') {
        return {
          ...prev,
          distributedLoads: prev.distributedLoads.filter(
            (d) => Number(d.rodId) !== rodId
          ),
        };
      }
      if (exists) {
        return {
          ...prev,
          distributedLoads: prev.distributedLoads.map((d) =>
            Number(d.rodId) === rodId ? { ...d, load: qValue } : d
          ),
        };
      }
      return {
        ...prev,
        distributedLoads: [
          ...prev.distributedLoads,
          { id: `q-${rodId}`, rodId: String(rodId), load: qValue },
        ],
      };
    });
  };

  const handleAddRodLeft = () => {
    setProject((prev) => {
      const firstRod = prev.rods[0];
      const defLen =
        firstRod && isValidNumericString(firstRod.length)
          ? parseNumber(firstRod.length)
          : 1;
      const safeDefLen = defLen > 0 ? defLen : 1;

      const newRod: RodInput = {
        id: 1,
        startNode: '1',
        endNode: '2',
        length: String(safeDefLen),
        area: firstRod ? firstRod.area : '1',
        elasticModulus: firstRod ? firstRod.elasticModulus : '1',
        allowableStress: firstRod ? firstRod.allowableStress : '1',
      };

      const shiftedDistributed = prev.distributedLoads.map((d) => {
        const nextRodId = Number(d.rodId) + 1;
        return {
          ...d,
          id: `q-${nextRodId}`,
          rodId: String(nextRodId),
        };
      });

      const shiftedNodes: NodeInput[] = [
        {
          id: 1,
          x: '0',
          hasSupport: prev.nodes.length === 0,
        },
        ...prev.nodes.map((n) => ({
          ...n,
          id: n.id + 1,
        })),
      ];

      const shiftedConcentrated = prev.concentratedLoads.map((f) => {
        const nextNodeId = Number(f.nodeId) + 1;
        return {
          ...f,
          id: `f-${nextNodeId}`,
          nodeId: String(nextNodeId),
        };
      });

      return normalizeProjectTopology({
        ...prev,
        rods: [newRod, ...prev.rods],
        nodes: shiftedNodes,
        distributedLoads: shiftedDistributed,
        concentratedLoads: shiftedConcentrated,
      });
    });
  };

  const handleAddRod = () => {
    setProject((prev) => {
      const newId = prev.rods.length + 1;
      const lastRod = prev.rods[prev.rods.length - 1];
      const defLen =
        lastRod && isValidNumericString(lastRod.length)
          ? parseNumber(lastRod.length)
          : 1;
      const safeDefLen = defLen > 0 ? defLen : 1;

      const newRod: RodInput = {
        id: newId,
        startNode: String(newId),
        endNode: String(newId + 1),
        length: String(safeDefLen),
        area: lastRod ? lastRod.area : '1',
        elasticModulus: lastRod ? lastRod.elasticModulus : '1',
        allowableStress: lastRod ? lastRod.allowableStress : '1',
      };

      return normalizeProjectTopology({
        ...prev,
        rods: [...prev.rods, newRod],
      });
    });
  };

  const handleDeleteRod = (rodId: number) => {
    setProject((prev) => {
      const remainingRods = prev.rods.filter((r) => r.id !== rodId);

      const updatedDistributed = prev.distributedLoads
        .filter((d) => Number(d.rodId) !== rodId)
        .map((d) => {
          const oldId = Number(d.rodId);
          const nextRodId = oldId > rodId ? oldId - 1 : oldId;
          return {
            ...d,
            id: `q-${nextRodId}`,
            rodId: String(nextRodId),
          };
        });

      const removedNodeId = rodId + 1;
      const remainingNodes = prev.nodes
        .filter((n) => n.id !== removedNodeId)
        .map((n, idx) => ({ ...n, id: idx + 1 }));

      const updatedConcentrated = prev.concentratedLoads
        .filter((f) => Number(f.nodeId) !== removedNodeId)
        .map((f) => {
          const oldNodeId = Number(f.nodeId);
          const nextNodeId = oldNodeId > removedNodeId ? oldNodeId - 1 : oldNodeId;
          return {
            ...f,
            id: `f-${nextNodeId}`,
            nodeId: String(nextNodeId),
          };
        });

      return normalizeProjectTopology({
        ...prev,
        rods: remainingRods,
        nodes: remainingNodes,
        distributedLoads: updatedDistributed,
        concentratedLoads: updatedConcentrated,
      });
    });
  };

  const handleToggleNodeSupport = (nodeId: number) => {
    setProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, hasSupport: !n.hasSupport } : n
      ),
    }));
  };

  const handleNodalForceChange = (nodeId: number, fValue: string) => {
    setProject((prev) => {
      const exists = prev.concentratedLoads.some(
        (f) => Number(f.nodeId) === nodeId
      );
      if (fValue === '') {
        return {
          ...prev,
          concentratedLoads: prev.concentratedLoads.filter(
            (f) => Number(f.nodeId) !== nodeId
          ),
        };
      }
      if (exists) {
        return {
          ...prev,
          concentratedLoads: prev.concentratedLoads.map((f) =>
            Number(f.nodeId) === nodeId ? { ...f, force: fValue } : f
          ),
        };
      }
      return {
        ...prev,
        concentratedLoads: [
          ...prev.concentratedLoads,
          { id: `f-${nodeId}`, nodeId: String(nodeId), force: fValue },
        ],
      };
    });
  };

  const handleQuickFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result ?? '');
        const imported = deserializeProjectFile(text, file.name);
        setProject(normalizeProjectTopology(imported));
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasFieldError = (
    targetType: DiagnosticIssue['targetType'],
    targetId: number | string,
    field?: string
  ): string | undefined => {
    const found = diagnostics.issues.find(
      (iss) =>
        iss.targetType === targetType &&
        String(iss.targetId) === String(targetId) &&
        (!field || !iss.field || iss.field === field)
    );
    return found?.message;
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#090b10] text-zinc-100 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,.sapr"
        onChange={handleQuickFileUpload}
        className="hidden"
      />

      <header className="h-11 shrink-0 bg-[#0e121a] border-b border-[#1c2331] px-4 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-0.5 bg-[#090b10] p-0.5 rounded border border-[#1c2331]">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-[3px] cursor-default"
          >
            Препроцессор
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1 text-xs font-medium text-zinc-500 rounded-[3px] cursor-not-allowed"
          >
            Процессор
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1 text-xs font-medium text-zinc-500 rounded-[3px] cursor-not-allowed"
          >
            Постпроцессор
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-[#141924] border border-[#222b3d] rounded-[4px] hover:bg-[#1a2130] hover:text-white transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Открыть</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-[4px] hover:bg-blue-500 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col">
        <div className="h-9 shrink-0 bg-[#111622] border-b border-[#1c2331] px-4 flex items-center gap-3 z-20">
          <div className="flex items-center h-full gap-1">
            <button
              type="button"
              onClick={() => setActiveWindow('canvas')}
              className={`h-full px-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center ${
                activeWindow === 'canvas'
                  ? 'border-blue-500 text-white bg-blue-500/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
              }`}
            >
              Отрисовка
            </button>
            <button
              type="button"
              onClick={() => setActiveWindow('input')}
              className={`h-full px-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeWindow === 'input'
                  ? 'border-blue-500 text-white bg-blue-500/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
              }`}
            >
              <span>Ввод</span>
              {!diagnostics.isValid && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </button>
          </div>
        </div>

        {activeWindow === 'canvas' ? (
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            <ConstructionCanvas
              rods={diagnostics.parsedRods}
              nodes={diagnostics.parsedNodes}
              issues={diagnostics.issues}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onToggleNodeSupport={handleToggleNodeSupport}
            />
          </div>
        ) : (
          <div
            onClick={() => setSelectedElement(null)}
            className="flex-1 min-h-0 w-full flex flex-row bg-[#0f131c] overflow-hidden"
          >
            <div className="w-[58%] h-full flex flex-col overflow-hidden min-w-0 border-r border-zinc-800">
              <div className="h-11 shrink-0 px-4 bg-[#141925] border-b border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  Стержни и распределённые нагрузки
                </span>
                <div className="inline-flex items-center bg-[#090b10] p-0.5 rounded border border-[#1c2331]">
                  <button
                    type="button"
                    onClick={handleAddRodLeft}
                    className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#161c28] rounded-[3px] transition-colors"
                  >
                    + Слева
                  </button>
                  <div className="w-px h-3.5 bg-[#1c2331] mx-0.5" />
                  <button
                    type="button"
                    onClick={handleAddRod}
                    className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#161c28] rounded-[3px] transition-colors"
                  >
                    + Справа
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-400 font-medium">
                      <th className="py-2 px-2.5 w-10">№</th>
                      <th className="py-2 px-2 w-20">Узлы</th>
                      <th className="py-2 px-2">Длина L</th>
                      <th className="py-2 px-2">Сечение A</th>
                      <th className="py-2 px-2">Модуль E</th>
                      <th className="py-2 px-2">Напряжение [σ]</th>
                      <th className="py-2 px-2">Погонная q</th>
                      <th className="py-2 px-2 w-9"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
                    {project.rods.map((rod) => {
                      const isSelected =
                        selectedElement?.type === 'rod' &&
                        selectedElement.id === rod.id;
                      const qEntry = project.distributedLoads.find(
                        (d) => Number(d.rodId) === rod.id
                      );
                      const qVal = qEntry ? qEntry.load : '';

                      const errL = hasFieldError('rod', rod.id, 'length');
                      const errA = hasFieldError('rod', rod.id, 'area');
                      const errE = hasFieldError(
                        'rod',
                        rod.id,
                        'elasticModulus'
                      );
                      const errS = hasFieldError(
                        'rod',
                        rod.id,
                        'allowableStress'
                      );

                      return (
                        <tr
                          key={rod.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement({ type: 'rod', id: rod.id });
                          }}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-blue-950/35'
                              : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <td className="py-2 px-2.5 font-semibold text-zinc-300">
                            {rod.id}
                          </td>

                          <td className="py-2 px-2 text-xs text-zinc-400 whitespace-nowrap">
                            {rod.id} <span className="text-zinc-600">→</span> {rod.id + 1}
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={rod.length}
                              onChange={(e) =>
                                handleRodFieldChange(
                                  rod.id,
                                  'length',
                                  e.target.value
                                )
                              }
                              title={errL}
                              className={`w-full py-1.5 px-2.5 rounded-md border bg-[#0b0d13] text-zinc-100 focus:outline-none ${
                                errL
                                  ? 'border-rose-500 text-rose-300'
                                  : 'border-zinc-800 focus:border-blue-500'
                              }`}
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={rod.area}
                              onChange={(e) =>
                                handleRodFieldChange(
                                  rod.id,
                                  'area',
                                  e.target.value
                                )
                              }
                              title={errA}
                              className={`w-full py-1.5 px-2.5 rounded-md border bg-[#0b0d13] text-zinc-100 focus:outline-none ${
                                errA
                                  ? 'border-rose-500 text-rose-300'
                                  : 'border-zinc-800 focus:border-blue-500'
                              }`}
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={rod.elasticModulus}
                              onChange={(e) =>
                                handleRodFieldChange(
                                  rod.id,
                                  'elasticModulus',
                                  e.target.value
                                )
                              }
                              title={errE}
                              className={`w-full py-1.5 px-2.5 rounded-md border bg-[#0b0d13] text-zinc-100 focus:outline-none ${
                                errE
                                  ? 'border-rose-500 text-rose-300'
                                  : 'border-zinc-800 focus:border-blue-500'
                              }`}
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={rod.allowableStress}
                              onChange={(e) =>
                                handleRodFieldChange(
                                  rod.id,
                                  'allowableStress',
                                  e.target.value
                                )
                              }
                              title={errS}
                              className={`w-full py-1.5 px-2.5 rounded-md border bg-[#0b0d13] text-zinc-100 focus:outline-none ${
                                errS
                                  ? 'border-rose-500 text-rose-300'
                                  : 'border-zinc-800 focus:border-blue-500'
                              }`}
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={qVal}
                              placeholder="0"
                              onChange={(e) =>
                                handleDistributedLoadChange(
                                  rod.id,
                                  e.target.value
                                )
                              }
                              className="w-full py-1.5 px-2.5 rounded-md border border-zinc-800 bg-[#0b0d13] text-emerald-400 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                            />
                          </td>

                          <td className="py-1.5 px-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRod(rod.id);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-md transition-colors"
                              title="Удалить стержень"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-[42%] h-full flex flex-col overflow-hidden min-w-0">
              <div className="h-11 shrink-0 px-4 bg-[#141925] border-b border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  Узлы, опоры и сосредоточенные силы
                </span>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-400 font-medium">
                      <th className="py-2 px-3">Узел №</th>
                      <th className="py-2 px-2">Координата X</th>
                      <th className="py-2 px-2">Сила F</th>
                      <th className="py-2 px-3 text-right">Опора</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
                    {project.nodes.map((node) => {
                      const isSelected =
                        selectedElement?.type === 'node' &&
                        selectedElement.id === node.id;
                      const fEntry = project.concentratedLoads.find(
                        (f) => Number(f.nodeId) === node.id
                      );
                      const fVal = fEntry ? fEntry.force : '';

                      return (
                        <tr
                          key={node.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement({ type: 'node', id: node.id });
                          }}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-blue-950/35'
                              : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-zinc-300 whitespace-nowrap">
                            Узел {node.id}
                          </td>

                          <td className="py-2 px-2 text-zinc-400">
                            x = {node.x}
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={fVal}
                              placeholder="0"
                              onChange={(e) =>
                                handleNodalForceChange(
                                  node.id,
                                  e.target.value
                                )
                              }
                              className="w-full py-1.5 px-2.5 rounded-md border border-zinc-800 bg-[#0b0d13] text-sky-400 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
                            />
                          </td>

                          <td className="py-1.5 px-3 text-right font-sans">
                            <label className="inline-flex items-center justify-end gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={node.hasSupport}
                                onChange={() =>
                                  handleToggleNodeSupport(node.id)
                                }
                                className="w-4 h-4 rounded border-zinc-700 bg-[#0b0d13] accent-blue-600"
                              />
                              <span className="text-xs text-zinc-300 w-14 text-left">
                                {node.hasSupport ? 'Заделка' : 'Нет'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="h-8 shrink-0 px-4 bg-[#0d1017] border-t border-zinc-800/80 flex items-center justify-between relative select-none z-30">
          <div className="text-[11px] text-zinc-500 font-mono">
            Стержней: {project.rods.length} &middot; Узлов:{' '}
            {project.nodes.length}
          </div>

          {isDiagnosticsOpen && (
            <div className="absolute bottom-9 right-4 w-80 sm:w-96 max-h-72 flex flex-col bg-[#141925] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50">
              <div className="px-3.5 py-2.5 bg-[#10141d] border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      diagnostics.isValid ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    {diagnostics.isValid
                      ? 'Проверка данных: норма'
                      : `Ошибки ввода (${diagnostics.errorCount})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiagnosticsOpen(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 overflow-y-auto space-y-2 text-xs">
                {diagnostics.isValid ? (
                  <div className="text-zinc-400 leading-relaxed">
                    Все параметры стержней, координаты узлов, нагрузки и
                    граничные условия заданы корректно.
                  </div>
                ) : (
                  diagnostics.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="w-full text-left py-1.5 px-2 rounded bg-[#10141d] border border-zinc-800/80 text-zinc-300 leading-snug"
                    >
                      {issue.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen((v) => !v)}
            className={`h-6 px-2.5 rounded border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
              diagnostics.isValid
                ? 'border-zinc-800 bg-[#141925] text-zinc-300 hover:border-emerald-500/50 hover:text-zinc-100'
                : 'border-rose-500/50 bg-rose-950/40 text-rose-200 hover:bg-rose-950/60'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {!diagnostics.isValid && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  diagnostics.isValid ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span>
              {diagnostics.isValid
                ? 'Норма'
                : `Ошибки: ${diagnostics.errorCount}`}
            </span>
          </button>
        </div>
      </div>

      <ProjectFileModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        project={project}
        isValid={diagnostics.isValid}
        errorCount={diagnostics.errorCount}
        onImportProject={(imported) => {
          setProject(normalizeProjectTopology(imported));
        }}
      />
    </div>
  );
}
