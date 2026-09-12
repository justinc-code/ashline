import { describe, expect, it } from 'vitest';
import { advect, buildAshTracers, GRAIN_SIZES_UM, terminalFallSpeed, traceAsh, tracerState, type AshOptions } from './ashSettling';
import type { TerrainData } from './terrain';
const terrain: TerrainData = { center: { lat: 0, lon: 0 }, widthKm: 20, size: 3, elevations: new Float32Array(9), min: 0, max: 0, spacingM: 10000, sourcePixelM: 38, sources: ['test'], retrieved: '2026-09-10', zoom: 12 };
const calm: AshOptions = { windKmh: 0, direction: 0, releaseHeightKm: 1.5 };
describe('ash gravitational settling', () => {
 it('matches the Stokes limit for small particles and faster settling for coarse grains', () => {
   const stokes = (2300 - 1.225) * 9.80665 * (1e-6) ** 2 / (18 * 1.81e-5);
   expect(terminalFallSpeed(1)).toBeCloseTo(stokes, 6);
   const speeds = GRAIN_SIZES_UM.map(terminalFallSpeed);
   speeds.slice(1).forEach((speed, i) => expect(speed).toBeGreaterThan(speeds[i]));
   expect(speeds[0]).toBeGreaterThan(.02); expect(speeds[0]).toBeLessThan(.04);
   expect(() => terminalFallSpeed(0)).toThrow();
 });
 it('lands at the analytic time on flat terrain and does not drift in calm air', () => {
   const origin = { eastKm: 1, northKm: -1, elevationM: 1000 };
   const trace = traceAsh(terrain, origin, 2, calm);
   expect(trace.outcome).toBe('deposited'); expect(trace.endSeconds).toBeCloseTo(500, 2);
   expect(trace.end).toEqual({ eastKm: 1, northKm: -1, elevationM: 0 });
 });
 it('advects downwind in real units and distinguishes leaving the patch from deposition', () => {
   const options = { ...calm, windKmh: 36, direction: 90 };
   const point = advect({ eastKm: 0, northKm: 0, elevationM: 2000 }, 100, 2, options);
   expect(point.eastKm).toBeCloseTo(1); expect(point.northKm).toBeCloseTo(0); expect(point.elevationM).toBe(1800);
   const trace = traceAsh(terrain, { eastKm: 0, northKm: 0, elevationM: 2000 }, .1, options);
   expect(trace.outcome).toBe('outside'); expect(trace.endSeconds).toBeCloseTo(1000); expect(trace.end.elevationM).toBeCloseTo(1900);
 });
 it('intersects rising terrain earlier than a flat surface', () => {
   const rising = { ...terrain, elevations: new Float32Array([0, 1000, 2000, 0, 1000, 2000, 0, 1000, 2000]), max: 2000 };
   const trace = traceAsh(rising, { eastKm: 0, northKm: 0, elevationM: 2000 }, 1, { ...calm, windKmh: 36, direction: 90 });
   expect(trace.outcome).toBe('deposited'); expect(trace.endSeconds).toBeCloseTo(500, 2); expect(trace.end.elevationM).toBeCloseTo(1500, 2);
 });
 it('detects ridge contact even when both timestep endpoints are above terrain', () => {
   const ridge = { ...terrain, elevations: new Float32Array([0, 1000, 0, 0, 1000, 0, 0, 1000, 0]), max: 1000 };
   const result = traceAsh(ridge, { eastKm: -.1, northKm: 0, elevationM: 995 }, .1, { ...calm, windKmh: 36, direction: 90 });
   expect(result.outcome).toBe('deposited');
   expect(result.endSeconds).toBeCloseTo(5 / 1.1, 5);
 });
 it('is deterministic and keeps settled particles deposited when scrubbing forward', () => {
   const particles = buildAshTracers(terrain, calm, 20);
   expect(particles).toEqual(buildAshTracers(terrain, calm, 20));
   const particle = particles[4], birth = particle.birthFraction * 3600;
   expect(tracerState(particle, 0, 3600)).toBe('pending');
   expect(tracerState(particle, birth + 1, 3600)).toBe('airborne');
   expect(tracerState(particle, birth + particle.endSeconds + 1, 3600)).toBe('deposited');
   expect(tracerState(particle, 1000000, 3600)).toBe('deposited');
   expect(tracerState(particle, 0, 3600)).toBe('pending');
 });
});
