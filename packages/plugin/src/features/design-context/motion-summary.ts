import type { MotionSummary } from '@figma-forge/core';

interface MotionRead {
  readonly styles: string[];
  readonly props: string[];
  readonly duration: number | undefined;
}

const readMotionOrNull = (node: SceneNode & MotionNodeMixin): MotionRead | null => {
  try {
    return {
      styles: node.animationStyles.map(style => style.name),
      props: Object.keys(node.animations),
      duration: node.timelines[0]?.duration,
    };
  } catch {
    return null;
  }
};

export const motionSummary = (node: SceneNode): MotionSummary | undefined => {
  if (!('animationStyles' in node)) return undefined;
  const motion = readMotionOrNull(node);
  if (motion === null || (motion.styles.length === 0 && motion.props.length === 0)) {
    return undefined;
  }
  const { styles, props, duration } = motion;
  return {
    ...(styles.length > 0 && { animationStyles: styles }),
    ...(props.length > 0 && { animatedProperties: props }),
    ...(duration !== undefined && { timelineDuration: duration }),
  };
};
