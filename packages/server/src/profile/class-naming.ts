import type { ClassNamingTally } from './class-naming-tally.js';

const CLASS_NAMING_STYLES = ['ampersand', 'flat'] as const;
export type ClassNamingStyle = (typeof CLASS_NAMING_STYLES)[number];

export interface ClassNamingVerdict {
  readonly style?: ClassNamingStyle;
  readonly reason: string;
}

const AMPERSAND_FLOOR = 5;

const describeVotes = ({ ampersand, flat, filesScanned, omitted }: ClassNamingTally): string => {
  const omission = omitted > 0 ? ` (${omitted} more not read — file cap)` : '';
  return `${ampersand} &-assembled vs ${flat} full-name in ${filesScanned} stylesheet(s)${omission}`;
};

export const detectClassNaming = (tally: ClassNamingTally | undefined): ClassNamingVerdict => {
  if (tally === undefined) return { reason: 'no preprocessor stylesheet found' };
  const { ampersand, flat } = tally;
  const votes = describeVotes(tally);
  if (ampersand === 0 && flat === 0) return { reason: `no compound class name found (${votes})` };
  if (ampersand > flat && ampersand < AMPERSAND_FLOOR) {
    return { style: 'flat', reason: `${votes} — below the floor for an & habit` };
  }
  return { style: ampersand > flat ? 'ampersand' : 'flat', reason: votes };
};
