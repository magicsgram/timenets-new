import { useMemo } from 'react';
import { yearFromDate } from '../lib/dates';
import { getPersonName } from '../lib/family';
import { useSvgViewport } from '../hooks/useSvgViewport';
import { buildLifelinePoints, buildPath, getPersonColor, interpolateLifeline, type PersonGeometry } from '../lib/timelineGeometry';
import type { ProjectData, TimelineLayout } from '../types/domain';

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

const ribbonAlpha = 0.7;
const uncertaintyYears = 3;
const labelColor = '#2e3436';

export function TimelineCanvas(props: TimelineCanvasProps) {
  const { project, layout, rootId, curvature, spacing, rootCentric, onSelectPerson } = props;
  const lineThickness = 4;

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
  const { svgRef, translateGroupRef, scaleGroupRef, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, clearDragState } = useSvgViewport();

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
        const points = buildLifelinePoints(entry, project, laneToY, curvature, marriageYMap);
        return [entry.person.id, { points, path: buildPath(points, yearToX) } satisfies PersonGeometry];
      }),
    );
  }, [innerWidth, layout.people, layout.range.endYear, layout.range.startYear, leftPadding, project, curvature, spacing, rootCentric, rootId, rootLaneIdx]);


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
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={clearDragState}
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
        <g ref={translateGroupRef}>
          <g ref={scaleGroupRef}>
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
            const birthUncertain = !!entry.person.birth?.uncertain;
            const deathUncertain = !!entry.person.death?.uncertain;
            const needsFade = likelyDeceased || isAlive || deathUncertain || birthUncertain;
            const birthUncertainStart = yearToX(birthYear - uncertaintyYears);
            const birthX = yearToX(birthYear);
            const deathX = yearToX(deathYear);
            const deathUncertainEnd = yearToX(deathYear + uncertaintyYears);
            const fadeEndX = deathUncertain
              ? birthX + (deathX - birthX) * 0.7
              : likelyDeceased ? birthX + (deathX - birthX) * 0.7 : yearToX(currentYear);
            const fadeBirthEndX = birthUncertain
              ? birthX + (deathX - birthX) * 0.3
              : birthX;
            const fadeGradientId = `fade-${entry.person.id}`;

            return (
              <g key={entry.person.id} style={{ opacity: entry.emphasis }}>
                {needsFade && (
                  <linearGradient id={fadeGradientId} x1={birthX} x2={deathX} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={color} stopOpacity={birthUncertain ? 0 : 1} />
                    <stop offset={`${((fadeBirthEndX - birthX) / (deathX - birthX)) * 100}%`} stopColor={color} stopOpacity={1} />
                    <stop offset={`${((fadeEndX - birthX) / (deathX - birthX)) * 100}%`} stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={(deathUncertain || likelyDeceased || isAlive) ? 0 : 1} />
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
                    {' '}({birthYear}{entry.person.birth?.uncertain ? '?' : ''}–{entry.person.deceased || entry.person.death ? `${deathYear}${entry.person.death?.uncertain ? '?' : ''}` : ''})
                    {(entry.person.deceased || entry.person.death)
                      ? ` (Age: ${deathYear - birthYear}${entry.person.birth?.uncertain || entry.person.death?.uncertain ? '?' : ''})`
                      : ` (Current age: ${currentYear - birthYear}${entry.person.birth?.uncertain ? '?' : ''})`}
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
        </g>
      </svg>
    </section>
  );
}
