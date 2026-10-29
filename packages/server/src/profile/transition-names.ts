const TRANSITION_SUFFIX = /^(?:enter|leave|exit|appear|move)(?:-(?:from|to|active|done))?$/;
const AMPERSAND_TRANSITION = /^&(?:-{1,2})([A-Za-z0-9_-]+)$/;

export const isTransitionSuffix = (suffix: string): boolean => TRANSITION_SUFFIX.test(suffix);

export const isTransitionConcat = (concat: string): boolean => {
  const tail = AMPERSAND_TRANSITION.exec(concat)?.[1];
  return tail !== undefined && isTransitionSuffix(tail);
};
