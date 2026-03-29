import { yearFromDate } from './dates';
import type { LayoutPerson, ProjectData } from '../types/domain';

export type LifelinePointType = 'born' | 'dating' | 'marriage' | 'divorce' | 'resting' | 'dead';

export interface LifelinePoint {
  type: LifelinePointType;
  year: number;
  y: number;
  marriageId?: string;
}

export interface PersonGeometry {
  path: string;
  points: LifelinePoint[];
}

const maleColor = '#3d6ea8';
const femaleColor = '#a83d3d';
const unknownColor = '#555753';
const curveWidth = 30;

function createEventPoint(type: LifelinePointType, year: number, y: number, marriageId?: string): LifelinePoint {
  return { type, year, y, marriageId };
}

export function getPersonColor(sex: LayoutPerson['person']['sex']): string {
  if (sex === 'M') {
    return maleColor;
  }

  if (sex === 'F') {
    return femaleColor;
  }

  return unknownColor;
}

export function buildLifelinePoints(
  entry: LayoutPerson,
  project: ProjectData,
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

    if (!marriage.divorced) {
      return;
    }

    const endYear = yearFromDate(marriage.end);
    if (endYear) {
      rawPoints.push(createEventPoint('divorce', endYear, marriageY, marriage.id));
    }
  });

  const sortedMarriages = rawPoints.slice(1).sort((left, right) => left.year - right.year);
  const filteredPoints: LifelinePoint[] = [rawPoints[0]];
  const marriageStarts = sortedMarriages.filter((point) => point.type === 'marriage');
  const divorcesByMarriage = new Map(
    sortedMarriages.filter((point) => point.type === 'divorce').map((point) => [point.marriageId, point]),
  );

  marriageStarts.forEach((marriagePoint, index) => {
    filteredPoints.push(marriagePoint);

    const divorcePoint = divorcesByMarriage.get(marriagePoint.marriageId);
    if (divorcePoint) {
      filteredPoints.push(divorcePoint);
      return;
    }

    const nextMarriage = marriageStarts[index + 1];
    if (!nextMarriage) {
      return;
    }

    const inferredEndYear = nextMarriage.year - 1;
    if (inferredEndYear > marriagePoint.year) {
      filteredPoints.push(createEventPoint('divorce', inferredEndYear, marriagePoint.y, marriagePoint.marriageId));
    }
  });

  const lastPoint = filteredPoints[filteredPoints.length - 1];
  const finalY = lastPoint.type === 'marriage'
    ? lastPoint.y
    : lastPoint.type === 'divorce'
      ? baselineY
      : lastPoint.y;
  filteredPoints.push(createEventPoint('dead', entry.endYear, finalY));

  const expandedPoints: LifelinePoint[] = [];
  filteredPoints.forEach((point, index) => {
    if (point.type === 'marriage') {
      const previousPoint = filteredPoints[index - 1];
      const lowerBound = previousPoint
        ? previousPoint.type === 'born'
          ? previousPoint.year
          : (previousPoint.year + point.year) / 2
        : point.year - alphaYears;
      const datingYear = Math.max(point.year - alphaYears, lowerBound);
      if (datingYear < point.year) {
        expandedPoints.push(createEventPoint('dating', datingYear, baselineY, point.marriageId));
      }
    }

    expandedPoints.push(point);

    if (point.type === 'divorce') {
      const nextPoint = filteredPoints[index + 1];
      const upperBound = nextPoint
        ? nextPoint.type === 'dead'
          ? nextPoint.year
          : (nextPoint.year + point.year) / 2
        : point.year + alphaYears;
      const restingYear = Math.min(point.year + alphaYears, upperBound);
      if (restingYear > point.year) {
        expandedPoints.push(createEventPoint('resting', restingYear, baselineY, point.marriageId));
      }
    }
  });

  for (let index = 1; index < expandedPoints.length; index += 1) {
    const previousPoint = expandedPoints[index - 1];
    const currentPoint = expandedPoints[index];
    if (currentPoint.year - previousPoint.year < 1 && currentPoint.type !== 'dead') {
      currentPoint.year = previousPoint.year + 1;
    }
  }

  return expandedPoints;
}

export function buildPath(points: LifelinePoint[], yearToX: (year: number) => number): string {
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

    if (point.type === 'marriage' || point.type === 'resting') {
      const previousPoint = points[index - 1];
      const previousX = yearToX(previousPoint.year);
      const halfSpan = Math.min(curveWidth, (x - previousX) / 2);
      path += ` C ${previousX + halfSpan} ${previousPoint.y}, ${x - halfSpan} ${point.y}, ${x} ${point.y}`;
    }
  });

  return path;
}

export function interpolateLifeline(points: LifelinePoint[], year: number): number {
  if (points.length === 0) {
    return 0;
  }

  if (year <= points[0].year) {
    return points[0].y;
  }

  for (let index = 1; index < points.length; index += 1) {
    if (year <= points[index].year) {
      const previousPoint = points[index - 1];
      const currentPoint = points[index];
      const progress = (year - previousPoint.year) / Math.max(0.001, currentPoint.year - previousPoint.year);
      return previousPoint.y + (currentPoint.y - previousPoint.y) * progress;
    }
  }

  return points[points.length - 1].y;
}