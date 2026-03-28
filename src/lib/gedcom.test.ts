import { describe, expect, it } from 'vitest';
import { parseGedcomProject } from './gedcom';

const sampleGedcom = `0 HEAD
1 SOUR TEST
0 @I1@ INDI
1 NAME Elias /Rowe/
1 SEX M
1 BIRT
2 DATE 14 FEB 1938
1 FAMS @F1@
0 @I2@ INDI
1 NAME Maren /Vale/
1 SEX F
1 BIRT
2 DATE ABT 1940
1 FAMS @F1@
0 @I3@ INDI
1 NAME Sofia /Rowe/
1 SEX F
1 BIRT
2 DATE 4 APR 1990
1 FAMC @F1@
1 RESI
2 DATE 2013
2 PLAC Portland
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 14 JUL 1960
0 TRLR`;

describe('parseGedcomProject', () => {
  it('converts GEDCOM people, marriages, parent links, and events into project data', () => {
    const project = parseGedcomProject(sampleGedcom, 'sample.ged');

    expect(project.people).toHaveLength(3);
    expect(project.marriages).toHaveLength(1);
    expect(project.events).toHaveLength(1);
    expect(project.meta.name).toBe('sample');

    const sofia = project.people.find((person) => person.firstName === 'Sofia');
    expect(sofia?.fatherId).toBe('I1');
    expect(sofia?.motherId).toBe('I2');
    expect(sofia?.birth?.value).toBe('1990-04-04');
    expect(project.events[0]?.location).toBe('Portland');
  });
});