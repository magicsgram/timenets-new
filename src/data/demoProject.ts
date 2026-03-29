import type { ProjectData } from '../types/domain';

export const emptyProject: ProjectData = {
  version: 1,
  meta: { id: 'empty', name: 'New Project', description: '' },
  rootPersonId: '',
  people: [],
  marriages: [],
  events: [],
};

export interface DemoEntry {
  id: string;
  name: string;
  description: string;
  project: ProjectData;
}

/* Royal family sample: Charles, Diana, Camilla, William, Harry */
export const demoProject: ProjectData = {
  version: 1,
  meta: {
    id: 'royal-family-demo',
    name: 'British Royal Family',
    description: 'Charles, Diana, Camilla, William, and Harry.',
  },
  rootPersonId: 'charles',
  people: [
    {
      id: 'andrew-pb',
      firstName: 'Andrew',
      lastName: 'Parker Bowles',
      sex: 'M',
      birth: { value: '1939-12-27' },
    },
    {
      id: 'camilla',
      firstName: 'Camilla',
      lastName: 'Shand',
      sex: 'F',
      birth: { value: '1947-07-17' },
    },
    {
      id: 'diana',
      firstName: 'Diana',
      lastName: 'Spencer',
      sex: 'F',
      birth: { value: '1961-07-01' },
      death: { value: '1997-08-31' },
      deceased: true,
    },
    {
      id: 'charles',
      firstName: 'Charles',
      lastName: 'Windsor',
      sex: 'M',
      birth: { value: '1948-11-14' },
    },
    {
      id: 'harry',
      firstName: 'Harry',
      lastName: 'Windsor',
      sex: 'M',
      birth: { value: '1984-09-15' },
      fatherId: 'charles',
      motherId: 'diana',
    },
    {
      id: 'william',
      firstName: 'William',
      lastName: 'Windsor',
      sex: 'M',
      birth: { value: '1982-06-21' },
      fatherId: 'charles',
      motherId: 'diana',
    },
  ],
  marriages: [
    {
      id: 'm-charles-diana',
      person1Id: 'charles',
      person2Id: 'diana',
      start: { value: '1981-07-29' },
      end: { value: '1996-08-28' },
      divorced: true,
    },
    {
      id: 'm-charles-camilla',
      person1Id: 'charles',
      person2Id: 'camilla',
      start: { value: '2005-04-09' },
    },
    {
      id: 'm-andrew-camilla',
      person1Id: 'andrew-pb',
      person2Id: 'camilla',
      start: { value: '1973-07-04' },
      end: { value: '1995-03-03' },
      divorced: true,
    },
  ],
  events: [],
};

export const edithFinchDemo: ProjectData = {
  version: 1,
  meta: {
    id: 'edith-finch-demo',
    name: 'What Remains of Edith Finch',
    description: 'The Finch family from What Remains of Edith Finch.',
  },
  rootPersonId: 'edith',
  people: [
    { id: 'odin', firstName: 'Odin', lastName: 'Finch', sex: 'M', birth: { value: '1880' }, death: { value: '1937' }, deceased: true },
    { id: 'ingeborg', firstName: 'Ingeborg', lastName: 'Finch', sex: 'F', birth: { value: '1883' }, death: { value: '1937' }, deceased: true },
    { id: 'johann', firstName: 'Johann', lastName: 'Finch', sex: 'M', birth: { value: '1937' }, death: { value: '1937' }, deceased: true, fatherId: 'odin', motherId: 'ingeborg' },
    { id: 'edie', firstName: 'Edie', lastName: 'Finch', sex: 'F', birth: { value: '1917' }, death: { value: '2010' }, deceased: true, fatherId: 'odin', motherId: 'ingeborg' },
    { id: 'sven', firstName: 'Sven', lastName: 'Finch', sex: 'M', birth: { value: '1915' }, death: { value: '1964' }, deceased: true },
    { id: 'molly', firstName: 'Molly', lastName: 'Finch', sex: 'F', birth: { value: '1937' }, death: { value: '1947' }, deceased: true, fatherId: 'sven', motherId: 'edie' },
    { id: 'barbara', firstName: 'Barbara', lastName: 'Finch', sex: 'F', birth: { value: '1944' }, death: { value: '1960' }, deceased: true, fatherId: 'sven', motherId: 'edie' },
    { id: 'calvin', firstName: 'Calvin', lastName: 'Finch', sex: 'M', birth: { value: '1950' }, death: { value: '1961' }, deceased: true, fatherId: 'sven', motherId: 'edie' },
    { id: 'walter', firstName: 'Walter', lastName: 'Finch', sex: 'M', birth: { value: '1952' }, death: { value: '2005' }, deceased: true, fatherId: 'sven', motherId: 'edie' },
    { id: 'sam', firstName: 'Sam', lastName: 'Finch', sex: 'M', birth: { value: '1950' }, death: { value: '1983' }, deceased: true, fatherId: 'sven', motherId: 'edie' },
    { id: 'kay', firstName: 'Kay', lastName: 'Carlyle', sex: 'F', birth: { value: '1952' } },
    { id: 'gus', firstName: 'Gus', lastName: 'Finch', sex: 'M', birth: { value: '1969' }, death: { value: '1982' }, deceased: true, fatherId: 'sam', motherId: 'kay' },
    { id: 'gregory', firstName: 'Gregory', lastName: 'Finch', sex: 'M', birth: { value: '1976' }, death: { value: '1977' }, deceased: true, fatherId: 'sam', motherId: 'kay' },
    { id: 'dawn', firstName: 'Dawn', lastName: 'Finch', sex: 'F', birth: { value: '1971' }, death: { value: '2016' }, deceased: true, fatherId: 'sam', motherId: 'kay' },
    { id: 'sanjay', firstName: 'Sanjay', lastName: 'Kumar', sex: 'M', birth: { value: '1970' }, death: { value: '2002' }, deceased: true },
    { id: 'lewis', firstName: 'Lewis', lastName: 'Finch', sex: 'M', birth: { value: '1988' }, death: { value: '2010' }, deceased: true, fatherId: 'sanjay', motherId: 'dawn' },
    { id: 'milton', firstName: 'Milton', lastName: 'Finch', sex: 'M', birth: { value: '1991' }, death: { value: '2003', uncertain: true }, deceased: true, fatherId: 'sanjay', motherId: 'dawn' },
    { id: 'edith', firstName: 'Edith', lastName: 'Finch', sex: 'F', birth: { value: '2000' }, death: { value: '2017' }, deceased: true, fatherId: 'sanjay', motherId: 'dawn' },
    { id: 'christopher', firstName: 'Christopher', lastName: 'Finch', sex: 'M', birth: { value: '2017' }, motherId: 'edith' },
  ],
  marriages: [
    { id: 'm-odin-ingeborg', person1Id: 'odin', person2Id: 'ingeborg', start: { value: '1905' } },
    { id: 'm-sven-edie', person1Id: 'sven', person2Id: 'edie', start: { value: '1937' } },
    { id: 'm-sam-kay', person1Id: 'sam', person2Id: 'kay', start: { value: '1968' }, end: { value: '1977' }, divorced: true },
    { id: 'm-dawn-sanjay', person1Id: 'dawn', person2Id: 'sanjay', start: { value: '1987' }, end: { value: '2002' } },
  ],
  events: [],
};

export const demoEntries: DemoEntry[] = [
  {
    id: 'british-royal',
    name: 'British Royal Family',
    description: 'Charles, Diana, Camilla, William, and Harry.',
    project: demoProject,
  },
  {
    id: 'edith-finch',
    name: 'What Remains of Edith Finch',
    description: 'The Finch family tree from the game.',
    project: edithFinchDemo,
  },
];