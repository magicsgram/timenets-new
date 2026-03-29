export type Sex = 'M' | 'F' | 'U';

export type RepresentationMode = 'hourglass' | 'pedigree' | 'descendant';

export interface UncertainDate {
  value?: string;
  uncertain?: boolean;
}

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  birth?: UncertainDate;
  death?: UncertainDate;
  deceased?: boolean;
  fatherId?: string;
  motherId?: string;
  notes?: string;
}

export interface Marriage {
  id: string;
  person1Id: string;
  person2Id: string;
  start?: UncertainDate;
  end?: UncertainDate;
  divorced?: boolean;
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date?: UncertainDate;
  endDate?: UncertainDate;
  peopleIds: string[];
  location?: string;
  description?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
}

export interface ProjectData {
  version: number;
  meta: ProjectMeta;
  rootPersonId: string;
  people: Person[];
  marriages: Marriage[];
  events: TimelineEvent[];
}

export interface VisibleRange {
  startYear: number;
  endYear: number;
}

export interface LayoutPerson {
  person: Person;
  generation: number;
  lane: number;
  emphasis: number;
  startYear: number;
  endYear: number;
}

export interface LayoutMarriage {
  marriage: Marriage;
  laneA: number;
  laneB: number;
  year: number;
}

export interface LayoutEvent {
  event: TimelineEvent;
  lane: number;
  year: number;
}

export interface TimelineLayout {
  people: LayoutPerson[];
  marriages: LayoutMarriage[];
  events: LayoutEvent[];
  range: VisibleRange;
  dataRange: VisibleRange;
}