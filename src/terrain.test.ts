import { describe, expect, it } from 'vitest';
import { decodeTerrarium, terrainContours, localCoordinate, sampleTerrain, terrainPixel, terrainProbe, type TerrainData } from './terrain';
import { relativeLocation } from './geography';
const flat: TerrainData = { center: { lat: 0, lon: 179.99 }, widthKm: 2, size: 3, elevations: new Float32Array([100, 200, 300, 100, 200, 300, 100, 200, 300]), min: 100, max: 300, spacingM: 1000, sourcePixelM: 38, sources: ['test'], retrieved: '2026-09-09', zoom: 12 };
describe('geographic terrain', () => {
 it('decodes documented Terrarium sample, sea level, and negative elevations', () => {
   expect(decodeTerrarium(137, 219, 68)).toBe(2523.265625);
   expect(decodeTerrarium(128, 0, 0)).toBe(0);
   expect(decodeTerrarium(127, 255, 0)).toBe(-1);
 });
 it('samples bilinearly, preserves edges, and refuses out-of-patch heights', () => {
   expect(sampleTerrain(flat, 0, 0)).toBe(200);
   expect(sampleTerrain(flat, .5, -.5)).toBe(250);
   expect(sampleTerrain(flat, 1, 1)).toBe(300);
   expect(sampleTerrain(flat, -1, -1)).toBe(100);
   expect(sampleTerrain(flat, 1.1, 0)).toBeNull();
 });
 it('uses meter-based slope and correctly oriented north/east coordinates', () => {
   expect(terrainProbe(flat, 0, 0)?.slope).toBeCloseTo(Math.atan(.1) * 180 / Math.PI);
   const north = localCoordinate(flat.center, 0, 1), east = localCoordinate(flat.center, 2, 0);
   expect(north.lat).toBeGreaterThan(0); expect(east.lon).toBeLessThan(-179);
   expect(relativeLocation(flat.center, east).distance).toBeCloseTo(2, 6);
 });
 it('maps tile pixel centers and rejects unsupported polar coordinates', () => {
   expect(terrainPixel({ lat: 0, lon: 0 }, 0)).toEqual({ x: 127.5, y: 127.5 });
   expect(() => terrainPixel({ lat: 86, lon: 0 }, 12)).toThrow('latitude coverage');
 });
});

it('contours follow planar elevations and stay within the measured patch', () => {
 const segments = terrainContours(flat, 150);
 expect(segments.length).toBeGreaterThan(0);
 expect(segments.length % 6).toBe(0);
 for(let i=0;i<segments.length;i+=3){
   expect(segments[i]).toBeCloseTo(-.5);
   expect(segments[i+1]).toBe(150);
   expect(Math.abs(segments[i+2])).toBeLessThanOrEqual(1);
 }
 expect(terrainContours({...flat,elevations:new Float32Array(9).fill(100),max:100},100)).toEqual([]);
 expect(() => terrainContours(flat,0)).toThrow('Contour interval must be positive.');
});
