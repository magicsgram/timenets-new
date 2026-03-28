import { useMemo, useRef, useState, type PointerEventHandler, type WheelEventHandler } from 'react';
import { clamp, yearFromDate } from '../lib/dates';
import { getPersonName } from '../lib/family';
import type { LayoutPerson, ProjectData, TimelineLayout } from '../types/domain';

interface TimelineCanvasProps {
  project: ProjectData;
  layout: TimelineLayout;
  selectedPersonId: string;
  rootId: string;
  curvature: number;
  spacing: number;
  rootCentric: boolean;
  onSelectPerson: (personId: string) => void;
  onRootChange: (personId: string) => void;
}

type LifelinePointType = 'born' | 'dating' | 'marriage' | 'divorce' | 'resting' | 'dead';

interface LifelinePoint {
  type: LifelinePointType;
  year: number;
  y: number;
  marriageId?: string;
}

interface PersonGeometry {
  path: string;
  points: LifelinePoint[];
}

const maleColor = '#3d6ea8';
const femaleColor = '#a83d3d';
const unknownColor = '#555753';
const ribbonAlpha = 0.7;
const uncertaintyYears = 3;
const labelColor = '#2e3436';
const curveWidth = 30; // fixed horizontal control-point offset for consistent curvature

function createEventPoint(type: LifelinePointType, year: number, y: number, marriageId?: string): LifelinePoint {
  return { type, year, y, marriageId };
}

function getPersonColor(sex: LayoutPerson['person']['sex']): string {
  if (sex === 'M') {
    return maleColor;
  }
  if (sex === 'F') {
    return femaleColor;
  }
  return unknownColor;
}

function buildLifelinePoints(
  entry: LayoutPerson,
  project: ProjectData,
  _laneByPersonId: Map<string, number>,
  laneToY: (lane: number) => number,
  alphaYears: number,
  marriageYMap: Map<string, number>,
): LifelinePoint[] {
  const baselineY = laneToY(entry.lane);
  const rawPoints: LifelinePoint[] = [createEventPoint('born', entry.startYear, baselineY)];
  const marriages = project.marriages
    .filter((marriage) => marriage.person1Id === entry.person.id || marriage.person2Id === entry.person.id)
    .sort((left, right) => (yearFromDate(left.start) ?? 0) - (yearFromDate(right.start) ?? 0));

  marriages.forEach((marriage) => {
    const startYear = yearFromDate(marriage.start);
    if (!startYear) {
      return;
    }

    const marriageY = marriageYMap.get(`${marriage.id}:${entry.person.id}`) ?? baselineY;

    rawPoints.push(createEventPoint('marriage', startYear, marriageY, marriage.id));

    if (marriage.divorced) {
      const endYear = yearFromDate(marriage.end);
      if (endYear) {
        rawPoints.push(createEventPoint('divorce', endYear, marriageY, marriage.id));
      }
    }
  });

  // Build a clean sequence: for each marriage, emit marriage + divorce points.
  // If a marriage has no divorce, infer an end just before the next marriage starts.
  const sortedMarriages = rawPoints
    .slice(1)
    .sort((left, right) => left.year - right.year);

  const filteredPoints: LifelinePoint[] = [rawPoints[0]];

  // Group by marriage/divorce pairs
  const marriageStarts = sortedMarriages.filter((p) => p.type === 'marriage');
  const divorcesByMarriage = new Map(
    sortedMarriages.filter((p) => p.type === 'divorce').map((p) => [p.marriageId, p]),
  );

  marriageStarts.forEach((mar, idx) => {
    filteredPoints.push(mar);

    const divorce = divorcesByMarriage.get(mar.marriageId);
    if (divorce) {
      filteredPoints.push(divorce);
    } else {
      const nextMarriage = marriageStarts[idx + 1];
      if (nextMarriage) {
        // Infer end before next marriage
        const inferredEndYear = nextMarriage.year - 1;
        if (inferredEndYear > mar.year) {
          filteredPoints.push(createEventPoint('divorce', inferredEndYear, mar.y, mar.marriageId));
        }
      }
      // If no next marriage and no divorce, marriage is ongoing — don't add a divorce point
    }
  });

  const lastPoint = filteredPoints[filteredPoints.length - 1];
  const isStillMarried = lastPoint.type === 'marriage';
  filteredPoints.push(createEventPoint('dead', entry.endYear, isStillMarried ? lastPoint.y : (lastPoint.type === 'divorce' ? baselineY : lastPoint.y)));

  const expandedPoints: LifelinePoint[] = [];
  filteredPoints.forEach((point, index) => {
    if (point.type === 'marriage') {
      const prevPoint = filteredPoints[index - 1];
      const lowerBound = prevPoint ? (prevPoint.type === 'born' ? prevPoint.year : (prevPoint.year + point.year) / 2) : point.year - alphaYears;
      const datingYear = Math.max(point.year - alphaYears, lowerBound);
      if (datingYear < point.year) {
        expandedPoints.push(createEventPoint('dating', datingYear, baselineY, point.marriageId));
      }
    }

    expandedPoints.push(point);

    if (point.type === 'divorce') {
      const nextPoint = filteredPoints[index + 1];
      const upperBound = nextPoint ? (nextPoint.type === 'dead' ? nextPoint.year : (nextPoint.year + point.year) / 2) : point.year + alphaYears;
      const restingYear = Math.min(point.year + alphaYears, upperBound);
      if (restingYear > point.year) {
        expandedPoints.push(createEventPoint('resting', restingYear, baselineY, point.marriageId));
      }
    }
  });

  const minGap = 1;
  for (let index = 1; index < expandedPoints.length; index += 1) {
    const previous = expandedPoints[index - 1];
    const current = expandedPoints[index];
    if (current.year - previous.year < minGap && current.type !== 'dead') {
      current.year = previous.year + minGap;
    }
  }

  return expandedPoints;
}

function buildPath(points: LifelinePoint[], yearToX: (year: number) => number): string {
  let path = '';

  points.forEach((point, index) => {
    const x = yearToX(point.year);
    if (point.type === 'born') {
      path += `M ${x} ${point.y}`;
      return;
    }

    if (point.type === 'dating' || point.type === 'divorce' || point.type === 'dead') {
      path += ` L ${x} ${point.y}`;
      return;
    }

    if (point.type === 'marriage') {
      const previous = points[index - 1];
      const previousX = yearToX(previous.year);
      const halfSpan = Math.min(curveWidth, (x - previousX) / 2);
      path += ` C ${previousX + halfSpan} ${previous.y}, ${x - halfSpan} ${point.y}, ${x} ${point.y}`;
      return;
    }

    if (point.type === 'resting') {
      const previous = points[index - 1];
      const previousX = yearToX(previous.year);
      const halfSpan = Math.min(curveWidth, (x - previousX) / 2);
      path += ` C ${previousX + halfSpan} ${previous.y}, ${x - halfSpan} ${point.y}, ${x} ${point.y}`;
      return;
    }
  });

  return path;
}

function interpolateLifeline(points: LifelinePoint[], year: number): number {
  if (points.length === 0) return 0;
  if (year <= points[0].year) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (year <= points[i].year) {
      const prev = points[i - 1];
      const curr = points[i];
      const t = (year - prev.year) / Math.max(0.001, curr.year - prev.year);
      return prev.y + (curr.y - prev.y) * t;
    }
  }
  return points[points.length - 1].y;
}

export function TimelineCanvas(props: TimelineCanvasProps) {
  const { project, layout, rootId, curvature, spacing, rootCentric, onSelectPerson } = props;
  const lineThickness = 4;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [dragState, setDragState] = useState<{
    pointerX: number;
    pointerY: number;
    translateX: number;
    translateY: number;
  } | null>(null);

  const width = 1080;
  const laneHeight = spacing;
  const compactLaneHeight = Math.max(18, Math.round(spacing * 0.72));
  const marriageGap = Math.round(spacing * 0.55);
  const labelFontSize = Math.max(8, Math.min(14, spacing * 0.35));
  const labelOffset = -Math.max(4, spacing * 0.2);
  const topPadding = 28;
  const leftPadding = 138;
  const rightPadding = 20;
  const bottomPadding = 48;

  const rootLaneIdx = rootCentric ? layout.people.findIndex((e) => e.person.id === rootId) : -1;
  const classifyRootCentricSide = (laneA: number, laneB: number): 'above' | 'below' => {
    if (rootLaneIdx < 0) {
      return 'below';
    }

    if (laneA === rootLaneIdx) {
      return laneB < rootLaneIdx ? 'above' : 'below';
    }

    if (laneB === rootLaneIdx) {
      return laneA < rootLaneIdx ? 'above' : 'below';
    }

    if (laneA < rootLaneIdx && laneB < rootLaneIdx) {
      return 'above';
    }

    if (laneA > rootLaneIdx && laneB > rootLaneIdx) {
      return 'below';
    }

    return (laneA + laneB) / 2 < rootLaneIdx ? 'above' : 'below';
  };

  const marriagePairsByPeople = new Set(
    project.marriages.flatMap((marriage) => [
      `${marriage.person1Id}:${marriage.person2Id}`,
      `${marriage.person2Id}:${marriage.person1Id}`,
    ]),
  );
  const isDirectlyRelated = (upperLane: number, lowerLane: number): boolean => {
    const upper = layout.people[upperLane]?.person;
    const lower = layout.people[lowerLane]?.person;
    if (!upper || !lower) {
      return false;
    }

    if (marriagePairsByPeople.has(`${upper.id}:${lower.id}`)) {
      return true;
    }

    return upper.fatherId === lower.id
      || upper.motherId === lower.id
      || lower.fatherId === upper.id
      || lower.motherId === upper.id;
  };

  // Build a set of marriage pairs to figure out where marriage lines need dedicated space
  const marriagePairs = new Set<string>();
  for (const m of project.marriages) {
    // In root-centric mode, root marriages use the dedicated upper/lower root lanes.
    if (rootCentric && (m.person1Id === rootId || m.person2Id === rootId)) continue;
    const laneA = layout.people.findIndex((e) => e.person.id === m.person1Id);
    const laneB = layout.people.findIndex((e) => e.person.id === m.person2Id);
    if (laneA >= 0 && laneB >= 0) {
      const top = Math.min(laneA, laneB);
      // Only reserve space in the gap directly below the top spouse lane
      marriagePairs.add(`${top}:${top}`);
    }
  }

  // Count how many marriage lines cross each gap (between lane i and lane i+1)
  const gapMarriageCount = new Map<number, number>();
  for (const key of marriagePairs) {
    const gap = parseInt(key.split(':')[0]);
    gapMarriageCount.set(gap, (gapMarriageCount.get(gap) ?? 0) + 1);
  }

  // Compute absolute Y for each lane
  const personY = new Map<number, number>();
  let currentY = 0;
  for (let i = 0; i < layout.people.length; i++) {
    personY.set(i, currentY);

    const nextLaneGap = i < layout.people.length - 1 && !isDirectlyRelated(i, i + 1) ? compactLaneHeight : laneHeight;
    currentY += nextLaneGap;

    const marriagesInGap = gapMarriageCount.get(i) ?? 0;
    currentY += marriagesInGap * marriageGap;
  }

  const lastLane = layout.people.length - 1;
  const totalSpan = lastLane >= 0 ? (personY.get(lastLane) ?? 0) : 0;
  // Don't center on root — just place first person at topPadding
  const centerOffset = topPadding;
  const height = topPadding + bottomPadding + totalSpan;
  const innerWidth = width - leftPadding - rightPadding;

  const yearToX = (year: number) =>
    leftPadding + ((year - layout.range.startYear) / Math.max(1, layout.range.endYear - layout.range.startYear)) * innerWidth;

  const laneToY = (lane: number) => centerOffset + (personY.get(lane) ?? lane * laneHeight);

  const geometries = useMemo(() => {
    const laneByPersonId = new Map(layout.people.map((entry) => [entry.person.id, entry.lane]));

    // Precompute a shared Y for each marriage in dedicated gap space
    const marriageYMap = new Map<string, number>();
    // Track which slot each marriage gets in the gap closest to the top spouse
    const gapSlotCounters = new Map<number, number>();
    // In root-centric mode, all marriages share the dedicated gap
    for (const marriage of project.marriages) {
      const laneA = laneByPersonId.get(marriage.person1Id);
      const laneB = laneByPersonId.get(marriage.person2Id);
      if (laneA !== undefined && laneB !== undefined) {
        if (rootCentric && (marriage.person1Id === rootId || marriage.person2Id === rootId)) {
          const sharedY = classifyRootCentricSide(laneA, laneB) === 'above'
            ? (rootLaneIdx > 0 ? (laneToY(rootLaneIdx - 1) + laneToY(rootLaneIdx)) / 2 : laneToY(rootLaneIdx) - laneHeight / 2)
            : (rootLaneIdx < layout.people.length - 1 ? (laneToY(rootLaneIdx) + laneToY(rootLaneIdx + 1)) / 2 : laneToY(rootLaneIdx) + laneHeight / 2);
          const stackOffset = 2;
          const dir = laneA < laneB ? 1 : -1;
          marriageYMap.set(`${marriage.id}:${marriage.person1Id}`, sharedY - dir * stackOffset);
          marriageYMap.set(`${marriage.id}:${marriage.person2Id}`, sharedY + dir * stackOffset);
        } else {
          const topLane = Math.min(laneA, laneB);
          const slotIndex = gapSlotCounters.get(topLane) ?? 0;
          gapSlotCounters.set(topLane, slotIndex + 1);
          const gapStartY = laneToY(topLane) + laneHeight / 2 + (slotIndex + 0.5) * marriageGap;
          const stackOffset = 2;
          const dir = laneA < laneB ? 1 : -1;
          marriageYMap.set(`${marriage.id}:${marriage.person1Id}`, gapStartY - dir * stackOffset);
          marriageYMap.set(`${marriage.id}:${marriage.person2Id}`, gapStartY + dir * stackOffset);
        }
      }
    }

    return new Map(
      layout.people.map((entry) => {
        const points = buildLifelinePoints(entry, project, laneByPersonId, laneToY, curvature, marriageYMap);
        return [entry.person.id, { points, path: buildPath(points, yearToX) } satisfies PersonGeometry];
      }),
    );
  }, [innerWidth, layout.people, layout.range.endYear, layout.range.startYear, leftPadding, project, curvature, spacing, rootCentric, rootId, rootLaneIdx]);

  const toSvgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const handleWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault();
    const svgPoint = toSvgPoint(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = clamp(viewport.scale * factor, 0.65, 4);
    if (nextScale === viewport.scale) {
      return;
    }

    const contentX = (svgPoint.x - viewport.translateX) / viewport.scale;
    const contentY = (svgPoint.y - viewport.translateY) / viewport.scale;

    setViewport({
      scale: nextScale,
      translateX: svgPoint.x - contentX * nextScale,
      translateY: svgPoint.y - contentY * nextScale,
    });
  };

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    const point = toSvgPoint(event.clientX, event.clientY);
    setDragState({
      pointerX: point.x,
      pointerY: point.y,
      translateX: viewport.translateX,
      translateY: viewport.translateY,
    });
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    if (!dragState) {
      return;
    }

    const point = toSvgPoint(event.clientX, event.clientY);
    setViewport((current) => ({
      ...current,
      translateX: dragState.translateX + (point.x - dragState.pointerX),
      translateY: dragState.translateY + (point.y - dragState.pointerY),
    }));
  };



  return (
    <section className="canvas-card timenets-canvas-card">
      <div className="canvas-caption">
        <div>
          <h2>TimeNets</h2>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="timeline-canvas"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragState(null)}
        onPointerLeave={() => setDragState(null)}
      >
        <defs>
          {layout.people.map((entry) => {
            const color = getPersonColor(entry.person.sex);
            return (
              <g key={entry.person.id}>
                <linearGradient id={`birth-unc-${entry.person.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={color} stopOpacity="0" />
                  <stop offset="100%" stopColor={color} stopOpacity={ribbonAlpha.toString()} />
                </linearGradient>
                <linearGradient id={`death-unc-${entry.person.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={color} stopOpacity={ribbonAlpha.toString()} />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </g>
            );
          })}

        </defs>

        <rect x="0" y="0" width={width} height={height} fill="#050607" rx="18" />
        <g transform={`translate(${viewport.translateX} ${viewport.translateY}) scale(${viewport.scale})`}>
          <line x1={leftPadding} x2={width - rightPadding} y1={height - 24} y2={height - 24} className="baseline" />

          {Array.from({ length: layout.dataRange.endYear - layout.dataRange.startYear + 1 }, (_, index) => {
            const year = layout.dataRange.startYear + index;
            if (year % 10 !== 0) {
              return null;
            }

            const x = yearToX(year);
            return (
              <g key={year}>
                <line x1={x} x2={x} y1={16} y2={height - 24} className="year-grid" />
                <text x={x} y={height - 7} className="year-label">
                  {year}
                </text>
              </g>
            );
          })}

          {layout.people.map((entry) => {
            const geometry = geometries.get(entry.person.id);
            if (!geometry) {
              return null;
            }

            const root = entry.person.id === rootId;
            const color = getPersonColor(entry.person.sex);
            const labelY = laneToY(entry.lane);
            const birthYear = yearFromDate(entry.person.birth) ?? entry.startYear;
            const deathYear = yearFromDate(entry.person.death) ?? entry.endYear;
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthYear;
            const likelyDeceased = !entry.person.death && !entry.person.deceased && age > 130;
            const isAlive = !entry.person.death && !entry.person.deceased && !likelyDeceased;
            const needsFade = likelyDeceased || isAlive;
            const birthUncertainStart = yearToX(birthYear - uncertaintyYears);
            const birthX = yearToX(birthYear);
            const deathX = yearToX(deathYear);
            const deathUncertainEnd = yearToX(deathYear + uncertaintyYears);
            const fadeStartX = likelyDeceased ? birthX + (deathX - birthX) * 0.7 : yearToX(currentYear);
            const fadeGradientId = `fade-${entry.person.id}`;

            return (
              <g key={entry.person.id} style={{ opacity: entry.emphasis }}>
                {needsFade && (
                  <linearGradient id={fadeGradientId} x1={birthX} x2={deathX} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset={`${((fadeStartX - birthX) / (deathX - birthX)) * 100}%`} stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                )}
                {entry.person.birth?.uncertain ? (
                  <line
                    x1={birthUncertainStart}
                    x2={birthX}
                    y1={labelY}
                    y2={labelY}
                    stroke={`url(#birth-unc-${entry.person.id})`}
                    strokeWidth={lineThickness}
                  />
                ) : null}
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={needsFade ? `url(#${fadeGradientId})` : color}
                  strokeOpacity={ribbonAlpha}
                  strokeWidth={lineThickness}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  className={'person-path-core'}
                />
                {entry.person.death?.uncertain && entry.person.deceased ? (
                  <line
                    x1={deathX}
                    x2={deathUncertainEnd}
                    y1={geometry.points[geometry.points.length - 1]?.y ?? labelY}
                    y2={geometry.points[geometry.points.length - 1]?.y ?? labelY}
                    stroke={`url(#death-unc-${entry.person.id})`}
                    strokeWidth={lineThickness}
                  />
                ) : null}
                <text
                  x={birthX + 2}
                  y={labelY + labelOffset}
                  fill={labelColor}
                  fontSize={labelFontSize}
                  fontFamily="sans-serif"
                  className={`person-label${root ? ' is-root' : ''}`}
                  onClick={() => onSelectPerson(entry.person.id)}
                >
                  {getPersonName(entry.person)}
                  <tspan fontSize={labelFontSize * 0.75}>
                    {' '}({birthYear}{entry.person.birth?.uncertain ? '?' : ''}–{entry.person.deceased || entry.person.death ? `${deathYear}${entry.person.death?.uncertain ? '?' : ''}` : ''}
                    {(entry.person.deceased || entry.person.death) ? `. Age: ${deathYear - birthYear}${entry.person.birth?.uncertain || entry.person.death?.uncertain ? '?' : ''}` : ''})
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Parent-child edges: dashed vertical lines at child's birth year */}
          {layout.people.map((entry) => {
            const person = entry.person;
            const parentIds = [person.fatherId, person.motherId].filter(Boolean) as string[];
            if (parentIds.length === 0) return null;

            const birthYear = yearFromDate(person.birth) ?? entry.startYear;
            const x = yearToX(birthYear);
            const childY = laneToY(entry.lane);
            const color = getPersonColor(person.sex);

            return parentIds.map((parentId) => {
              const parentEntry = layout.people.find((p) => p.person.id === parentId);
              if (!parentEntry) return null;

              const parentGeometry = geometries.get(parentId);
              const parentY = parentGeometry
                ? interpolateLifeline(parentGeometry.points, birthYear)
                : laneToY(parentEntry.lane);

              return (
                <line
                  key={`edge-${parentId}-${person.id}`}
                  x1={x}
                  y1={parentY}
                  x2={x}
                  y2={childY}
                  stroke={color}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            });
          })}

        </g>
      </svg>
    </section>
  );
}
