import { expect, it } from 'vitest';
import { applySurfaceUV, surroundingGeometry } from './worldSurface';
import type { TerrainData } from './terrain';
import * as THREE from 'three';
const core: TerrainData = { center: { lat: 0, lon: 0 }, widthKm: 2, size: 3, elevations: new Float32Array(9).fill(100), min: 100, max: 100, spacingM: 1000, sourcePixelM: 38, sources: [], retrieved: '', zoom: 12 };
it('stitches surrounding DEM to the core boundary without a base or interior triangles', () => {
  const geometry = surroundingGeometry(core, { ...core, widthKm: 6, elevations: new Float32Array(9).fill(200) }, 1);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    expect(Math.max(Math.abs(positions.getX(i)), Math.abs(positions.getZ(i)))).toBeGreaterThanOrEqual(12.5);
    expect(Number.isFinite(positions.getY(i))).toBe(true);
    if (i < 8) expect(positions.getY(i)).toBeCloseTo(.07);
    else expect(positions.getY(i)).toBeCloseTo(1.32);
  }
  expect(geometry.getAttribute('normal').getY(0)).toBeGreaterThan(0);
  geometry.dispose();
});
it('maps center and cardinal directions into geographically oriented imagery UVs', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 1,0,0, 0,0,-1], 3));
  applySurfaceUV(geometry, core.center, 1, { west: -1, east: 1, south: -1, north: 1 });
  const uv = geometry.getAttribute('uv');
  expect(uv.getX(0)).toBeCloseTo(.5); expect(uv.getY(0)).toBeCloseTo(.5);
  expect(uv.getX(1)).toBeGreaterThan(.5); expect(uv.getY(2)).toBeGreaterThan(.5);
  geometry.dispose();
});
