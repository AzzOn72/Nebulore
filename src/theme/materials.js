// Nebulore — Spatial Glass material recipes. Glass is always top-lit
// (single overhead light) so it reads as spatial-computing hardware.

export const glass = {
  thin: {
    blur: 20,
    fill: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.06)',
    topLight: 'rgba(255,255,255,0.06)',
    bottomLight: 'rgba(255,255,255,0.01)',
  },
  regular: {
    blur: 36,
    fill: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.06)',
    topLight: 'rgba(255,255,255,0.10)',
    bottomLight: 'rgba(255,255,255,0.02)',
  },
  thick: {
    blur: 55,
    fill: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    topLight: 'rgba(255,255,255,0.12)',
    bottomLight: 'rgba(255,255,255,0.02)',
  },
};

export default glass;
