// Nebulore — Motion system. Everything has mass, momentum, and spring.
// Light objects are snappy; heavy objects are weighty and slow.

export const spring = {
  snappy: { damping: 15, stiffness: 320, mass: 0.45 }, // pills, icons, tabs
  default: { damping: 18, stiffness: 200, mass: 0.6 }, // cards, list items
  heavy: { damping: 22, stiffness: 140, mass: 1.1 }, // deep dive, sheets
  gel: { damping: 30, stiffness: 90 }, // background drift, parallax settle
};

// Cubic-bezier control points for timing-based animations.
export const bezier = {
  outExpo: [0.16, 1, 0.3, 1], // entrances
  inOutQuint: [0.83, 0, 0.17, 1], // hyperspace warp
  outSoft: [0.22, 1, 0.36, 1], // micro fades
};

export const duration = {
  micro: 200,
  fast: 320,
  base: 440,
  slow: 600,
};

export default { spring, bezier, duration };
