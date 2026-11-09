import React, { useRef, useState } from 'react';
import { Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { DiagnosticIssue, ParsedNode, ParsedRod } from '../types/cad';

interface ConstructionCanvasProps {
  rods: ParsedRod[];
  nodes: ParsedNode[];
  issues: DiagnosticIssue[];
  selectedElement: { type: 'rod' | 'node'; id: number } | null;
  onSelectElement: (sel: { type: 'rod' | 'node'; id: number } | null) => void;
  onToggleNodeSupport: (nodeId: number) => void;
}

export const ConstructionCanvas: React.FC<ConstructionCanvasProps> = ({
  rods,
  nodes,
  issues,
  selectedElement,
  onSelectElement,
  onToggleNodeSupport,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const didDragRef = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const VIEW_W = 1280;
  const VIEW_H = 400;
  const DRAW_LEFT = 160;
  const CENTER_Y = 185;

  const allXValues: number[] = [
    ...nodes.map((n) => n.x),
    ...rods.flatMap((r) => [r.xStart, r.xEnd]),
  ].filter((v) => Number.isFinite(v));

  const minX = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const maxX =
    allXValues.length > 0 ? Math.max(...allXValues, minX + 1) : 1;
  const totalSpan = Math.max(1e-6, maxX - minX);

  const positiveLengths = rods
    .map((r) => Math.abs(r.xEnd - r.xStart))
    .filter((len) => Number.isFinite(len) && len > 1e-6);
  const minRodLen =
    positiveLengths.length > 0 ? Math.min(...positiveLengths) : totalSpan;

  const DRAW_WIDTH = Math.max(
    960,
    rods.length * 130,
    (totalSpan / Math.max(1e-6, minRodLen)) * 105
  );
  const DRAW_RIGHT = DRAW_LEFT + DRAW_WIDTH;

  const toPxX = (xVal: number): number => {
    const safeX = Number.isFinite(xVal) ? xVal : minX;
    return DRAW_LEFT + ((safeX - minX) / totalSpan) * DRAW_WIDTH;
  };

  const areas = rods.map((r) => (r.area > 0 ? r.area : 1));
  const minArea = areas.length > 0 ? Math.min(...areas) : 1;

  const unitArea =
    minArea >= 0.25 && minArea <= 15 ? 1 : minArea > 0 ? minArea : 1;
  const normalizedAreas = areas.map((a) => Math.max(0.25, a / unitArea));
  const maxNormArea = Math.max(8, ...normalizedAreas);

  const MIN_ROD_HEIGHT = 46;
  const MAX_ROD_HEIGHT = 158;

  const getRodPixelHeight = (area: number): number => {
    const safeArea = Number.isFinite(area) && area > 0 ? area : unitArea;
    const normA = Math.max(0.25, safeArea / unitArea);
    if (normA <= 1) {
      return 34 + ((normA - 0.25) / 0.75) * (MIN_ROD_HEIGHT - 34);
    }
    const ratio = Math.min(1, (normA - 1) / (maxNormArea - 1));
    return MIN_ROD_HEIGHT + ratio * (MAX_ROD_HEIGHT - MIN_ROD_HEIGHT);
  };

  interface RenderedRod extends ParsedRod {
    pxStart: number;
    pxEnd: number;
    pxWidth: number;
    pxHeight: number;
    hasError: boolean;
  }

  const renderedRods: RenderedRod[] = rods.map((r) => {
    const x1 = Math.min(r.xStart, r.xEnd);
    const x2 = Math.max(r.xStart, r.xEnd);
    const pxStart = toPxX(x1);
    const pxEnd = Math.max(pxStart + 24, toPxX(x2));
    const pxWidth = pxEnd - pxStart;

    const hasError = issues.some(
      (iss) => iss.targetType === 'rod' && Number(iss.targetId) === r.id
    );

    return {
      ...r,
      pxStart,
      pxEnd,
      pxWidth,
      pxHeight: getRodPixelHeight(r.area),
      hasError,
    };
  });

  const maxStructureHeight =
    renderedRods.length > 0
      ? Math.max(...renderedRods.map((r) => r.pxHeight), 86)
      : 86;

  const renderedNodes = nodes.map((n) => {
    const pxX = toPxX(n.x);
    const hasError = issues.some(
      (iss) => iss.targetType === 'node' && Number(iss.targetId) === n.id
    );

    return {
      ...n,
      pxX,
      wallHeight: maxStructureHeight + 52,
      hasError,
    };
  });

  const getForceArrowLength = (nodePxX: number, force: number): number => {
    if (force === 0) return 0;
    const targetRod =
      renderedRods.find((r) =>
        force > 0
          ? Math.abs(r.pxStart - nodePxX) < 2
          : Math.abs(r.pxEnd - nodePxX) < 2
      ) ||
      renderedRods.find(
        (r) =>
          Math.abs(r.pxStart - nodePxX) < 2 || Math.abs(r.pxEnd - nodePxX) < 2
      );
    if (!targetRod) return 46;
    return Math.max(32, Math.min(50, targetRod.pxWidth * 0.34));
  };

  const formatNum = (val: number): string => {
    if (!Number.isFinite(val)) return '—';
    if (Math.abs(val) >= 1e5 || (Math.abs(val) > 0 && Math.abs(val) < 1e-3)) {
      return val.toExponential(2);
    }
    return Number(val.toFixed(4)).toString();
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const nextX = e.clientX - panStart.x;
    const nextY = e.clientY - panStart.y;
    if (Math.abs(nextX - pan.x) > 3 || Math.abs(nextY - pan.y) > 3) {
      didDragRef.current = true;
    }
    setPan({
      x: nextX,
      y: nextY,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) =>
      Math.min(2.4, Math.max(0.15, Number((z * factor).toFixed(2))))
    );
  };

  const exportPNG = () => {
    if (!svgRef.current) return;
    const exportW = Math.max(VIEW_W, DRAW_RIGHT + 160);
    const exportH = VIEW_H;
    const clonedSvg = svgRef.current.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('viewBox', `0 0 ${exportW} ${exportH}`);
    clonedSvg.setAttribute('width', String(exportW * 2));
    clonedSvg.setAttribute('height', String(exportH * 2));
    const mainGroup = clonedSvg.querySelector('g');
    if (mainGroup) {
      mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportW * 2;
      canvas.height = exportH * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0d1017';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = 'construction_scheme.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="relative w-full h-full bg-[#0d1017] overflow-hidden select-none flex flex-col">
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <div className="flex items-center bg-[#151923]/90 backdrop-blur-xs border border-zinc-800 rounded-md px-1 py-0.5">
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.max(0.15, Number((z - 0.15).toFixed(2))))
            }
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Уменьшить"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-11 text-center font-mono text-xs tabular-nums text-zinc-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))))
            }
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Увеличить"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Сбросить масштаб"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={exportPNG}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-[#151923]/90 backdrop-blur-xs border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={`w-full h-full flex-1 block ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
          if (!didDragRef.current) {
            onSelectElement(null);
          }
        }}
        onWheel={handleWheel}
      >
        <defs>
          <pattern
            id="dark-grid-minor"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#131822"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id="dark-grid-major"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <rect width="120" height="120" fill="url(#dark-grid-minor)" />
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke="#19202e"
              strokeWidth="1.2"
            />
          </pattern>

          <marker
            id="dark-arrow-q"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path
              d="M 1.5 2 L 8.5 5 L 1.5 8"
              fill="none"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        <rect
          x={-20000}
          y={-20000}
          width={60000}
          height={60000}
          fill="url(#dark-grid-major)"
        />

        <g
          transform={`translate(${
            pan.x + (VIEW_W * (1 - zoom)) / 2
          }, ${pan.y + (VIEW_H * (1 - zoom)) / 2}) scale(${zoom})`}
        >
          {(renderedRods.length > 0 || renderedNodes.length > 0) && (
            <line
              x1={DRAW_LEFT - 60}
              y1={CENTER_Y}
              x2={DRAW_RIGHT + 60}
              y2={CENTER_Y}
              stroke="#334155"
              strokeWidth="1.1"
              strokeDasharray="16 6 2 6"
            />
          )}

          {renderedRods.map((rod) => {
            const isSelected =
              selectedElement?.type === 'rod' && selectedElement.id === rod.id;
            const topY = CENTER_Y - rod.pxHeight / 2;
            const midX = (rod.pxStart + rod.pxEnd) / 2;

            const startNodeObj = renderedNodes.find(
              (n) => n.id === rod.startNode
            );
            const endNodeObj = renderedNodes.find((n) => n.id === rod.endNode);

            const leftForceInset =
              startNodeObj && startNodeObj.concentratedForce > 0
                ? getForceArrowLength(
                    startNodeObj.id,
                    startNodeObj.concentratedForce
                  ) + 8
                : 4;

            const rightForceInset =
              endNodeObj && endNodeObj.concentratedForce < 0
                ? getForceArrowLength(
                    endNodeObj.id,
                    endNodeObj.concentratedForce
                  ) + 8
                : 4;

            const qStartX = rod.pxStart + leftForceInset;
            const qEndX = rod.pxEnd - rightForceInset;
            const qSpanW = Math.max(0, qEndX - qStartX);

            return (
              <g
                key={`rod-${rod.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement({ type: 'rod', id: rod.id });
                }}
                className="cursor-pointer"
              >
                <rect
                  x={rod.pxStart}
                  y={topY}
                  width={rod.pxWidth}
                  height={rod.pxHeight}
                  fill={
                    rod.hasError
                      ? '#4c0519'
                      : isSelected
                      ? '#172554'
                      : '#141923'
                  }
                  fillOpacity={0.9}
                  stroke={
                    rod.hasError
                      ? '#f43f5e'
                      : isSelected
                      ? '#3b82f6'
                      : '#cbd5e1'
                  }
                  strokeWidth={isSelected || rod.hasError ? 2.4 : 1.75}
                />

                <g
                  transform={`translate(${midX}, ${
                    CENTER_Y - maxStructureHeight / 2 - 44
                  })`}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={13}
                    fill={isSelected ? '#2563eb' : '#141923'}
                    stroke={isSelected ? '#60a5fa' : '#94a3b8'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#e4e4e7'}
                    fontSize="12"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {rod.id}
                  </text>
                </g>

                <text
                  x={midX}
                  y={topY - 9}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="12"
                  fontWeight="500"
                  fontFamily="JetBrains Mono, monospace"
                >
                  E={formatNum(rod.elasticModulus)}, A={formatNum(rod.area)}
                </text>

                {rod.distributedLoad !== 0 && qSpanW > 18 && (
                  <g>
                    {(() => {
                      const isRight = rod.distributedLoad > 0;
                      const numArrows = Math.max(
                        2,
                        Math.min(14, Math.floor(qSpanW / 26))
                      );
                      const step = qSpanW / numArrows;
                      const arrows = [];
                      for (let k = 0; k < numArrows; k++) {
                        const xA = qStartX + k * step + 2;
                        const xB = qStartX + (k + 1) * step - 2;
                        arrows.push(
                          <line
                            key={k}
                            x1={isRight ? xA : xB}
                            y1={CENTER_Y}
                            x2={isRight ? xB : xA}
                            y2={CENTER_Y}
                            stroke="#34d399"
                            strokeWidth="1.65"
                            markerEnd="url(#dark-arrow-q)"
                          />
                        );
                      }
                      const qLabelX = (qStartX + qEndX) / 2;
                      return (
                        <>
                          {arrows}
                          <text
                            x={qLabelX}
                            y={CENTER_Y - 10}
                            textAnchor="middle"
                            fill="#34d399"
                            fontSize="11"
                            fontWeight="600"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {formatNum(Math.abs(rod.distributedLoad))}q
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}

          {renderedNodes.map((node) => {
            if (!node.hasSupport) return null;
            const halfWall = node.wallHeight / 2;
            const yTop = CENTER_Y - halfWall;
            const yBottom = CENTER_Y + halfWall;
            const maxNodePxX = Math.max(...renderedNodes.map((n) => n.pxX));
            const minNodePxX = Math.min(...renderedNodes.map((n) => n.pxX));
            const isRightSide =
              renderedNodes.length > 1 &&
              node.pxX >= maxNodePxX - 1 &&
              node.pxX > minNodePxX + 1;

            const numTicks = Math.floor(node.wallHeight / 9);
            const ticks = [];
            for (let t = 0; t <= numTicks; t++) {
              const yPos = yTop + t * 9;
              const dx = isRightSide ? 11 : -11;
              const dy = isRightSide ? 8 : -8;
              ticks.push(
                <line
                  key={t}
                  x1={node.pxX}
                  y1={yPos}
                  x2={node.pxX + dx}
                  y2={yPos + dy}
                  stroke="#94a3b8"
                  strokeWidth="1.4"
                />
              );
            }

            return (
              <g
                key={`sup-${node.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement({ type: 'node', id: node.id });
                }}
                className="cursor-pointer"
              >
                <line
                  x1={node.pxX}
                  y1={yTop}
                  x2={node.pxX}
                  y2={yBottom}
                  stroke="#e2e8f0"
                  strokeWidth="2.8"
                  strokeLinecap="square"
                />
                {ticks}
              </g>
            );
          })}

          {renderedNodes.map((node) => {
            if (node.concentratedForce === 0) return null;
            const isPositive = node.concentratedForce > 0;
            const dir = isPositive ? 1 : -1;
            const arrowLen = getForceArrowLength(
              node.pxX,
              node.concentratedForce
            );
            const headLen = 10;
            const headHalfH = 4.2;

            const xStart = node.pxX;
            const xTip = xStart + dir * arrowLen;
            const xShaftEnd = xTip - dir * headLen;
            const midArrowX = (xStart + xTip) / 2;

            return (
              <g
                key={`f-${node.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement({ type: 'node', id: node.id });
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={xStart}
                  cy={CENTER_Y}
                  r={3.5}
                  fill="#38bdf8"
                  stroke="#0d1017"
                  strokeWidth="1.2"
                />
                <line
                  x1={xStart}
                  y1={CENTER_Y}
                  x2={xShaftEnd}
                  y2={CENTER_Y}
                  stroke="#38bdf8"
                  strokeWidth="2.4"
                />
                <polygon
                  points={`${xTip},${CENTER_Y} ${xShaftEnd},${
                    CENTER_Y - headHalfH
                  } ${xShaftEnd},${CENTER_Y + headHalfH}`}
                  fill="#38bdf8"
                />
                <text
                  x={midArrowX}
                  y={CENTER_Y + 17}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatNum(Math.abs(node.concentratedForce))}F
                </text>
              </g>
            );
          })}

          {renderedNodes.length > 0 && (
            <g>
              {(() => {
                const dimY = CENTER_Y + maxStructureHeight / 2 + 72;
                const nodeBoxY = dimY - 30;

                return (
                  <>
                    {renderedNodes.map((node) => {
                      const isNodeSelected =
                        selectedElement?.type === 'node' &&
                        selectedElement.id === node.id;

                      return (
                        <g
                          key={`node-${node.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectElement({ type: 'node', id: node.id });
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onToggleNodeSupport(node.id);
                          }}
                          className="cursor-pointer"
                        >
                          <line
                            x1={node.pxX}
                            y1={CENTER_Y + maxStructureHeight / 2 - 2}
                            x2={node.pxX}
                            y2={dimY + 8}
                            stroke="#475569"
                            strokeWidth="1.1"
                            strokeDasharray="3 3"
                          />
                          <g transform={`translate(${node.pxX}, ${nodeBoxY})`}>
                            <rect
                              x={-12}
                              y={-12}
                              width={24}
                              height={24}
                              rx={3}
                              fill={isNodeSelected ? '#2563eb' : '#141923'}
                              stroke={isNodeSelected ? '#60a5fa' : '#94a3b8'}
                              strokeWidth="1.5"
                            />
                            <text
                              x={0}
                              y={4}
                              textAnchor="middle"
                              fill={isNodeSelected ? '#ffffff' : '#e4e4e7'}
                              fontSize="12"
                              fontWeight="600"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {node.id}
                            </text>
                          </g>
                          <text
                            x={node.pxX}
                            y={dimY + 22}
                            textAnchor="middle"
                            fill="#71717a"
                            fontSize="11"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            x={formatNum(node.x)}
                          </text>
                        </g>
                      );
                    })}

                    {renderedRods.map((rod) => {
                      const midX = (rod.pxStart + rod.pxEnd) / 2;
                      return (
                        <g key={`dim-${rod.id}`}>
                          <line
                            x1={rod.pxStart}
                            y1={dimY}
                            x2={rod.pxEnd}
                            y2={dimY}
                            stroke="#64748b"
                            strokeWidth="1.3"
                          />
                          <path
                            d={`M ${rod.pxStart + 7} ${dimY - 3.5} L ${
                              rod.pxStart
                            } ${dimY} L ${rod.pxStart + 7} ${dimY + 3.5}`}
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="1.3"
                          />
                          <path
                            d={`M ${rod.pxEnd - 7} ${dimY - 3.5} L ${
                              rod.pxEnd
                            } ${dimY} L ${rod.pxEnd - 7} ${dimY + 3.5}`}
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="1.3"
                          />
                          <text
                            x={midX}
                            y={dimY - 6}
                            textAnchor="middle"
                            fill="#d4d4d8"
                            fontSize="12"
                            fontWeight="600"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            L={formatNum(rod.length)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
