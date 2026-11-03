const pathDepth = (path: string): number => {
  let depth = 0;
  for (const character of path) {
    if (character === '/') depth += 1;
  }
  return depth;
};

export const byDepthThenPath = (left: string, right: string): number => {
  const depthDifference = pathDepth(left) - pathDepth(right);
  if (depthDifference !== 0) return depthDifference;
  if (left < right) return -1;
  return left > right ? 1 : 0;
};
