import { expect, it } from 'vitest';
import { terrainHeight, windVector } from './eruptionScene';
it('maps north/east wind to the scene compass', () => {
  expect(windVector(0).x).toBeCloseTo(0); expect(windVector(0).z).toBeCloseTo(-1);
  expect(windVector(90).x).toBeCloseTo(1); expect(windVector(90).z).toBeCloseTo(0);
  expect(windVector(270).x).toBeCloseTo(-1);
});
it('creates a crater, distinct type profiles, and finite terrain', () => {
  expect(terrainHeight(.65, 0, 'Stratovolcano')).toBeGreaterThan(terrainHeight(0, 0, 'Stratovolcano'));
  expect(terrainHeight(0, 0, 'Shield')).toBeLessThan(terrainHeight(0, 0, 'Stratovolcano'));
  for (const type of ['Shield', 'Caldera', 'Stratovolcano']) for (let x = -12; x <= 12; x += .5) for (let z = -12; z <= 12; z += .5) expect(terrainHeight(x, z, type)).toBeGreaterThanOrEqual(0);
});
