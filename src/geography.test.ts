import { describe, expect, it } from 'vitest';
import { assessLocation, destination, parseLocation, relativeLocation } from './geography';
import { defaults, runSimulation, type Volcano } from './model';
import catalog from './data/volcanoes.json';
const volcano = catalog.volcanoes.find(v => v.name === 'Merapi') as Volcano;
const { settings, signals } = defaults(volcano);
const result = runSimulation(settings, signals, volcano);
describe('geographic scenario checks', () => {
  it('matches a known great-circle distance', () => {
    expect(relativeLocation({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }).distance).toBeCloseTo(111.195, 2);
    expect(relativeLocation({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }).bearing).toBeCloseTo(90);
  });
  it('handles the dateline and high latitudes', () => {
    for (const origin of [{ lat: 0, lon: 179.99 }, { lat: 89.9, lon: 30 }, volcano]) {
      for (const bearing of [0, 90, 180, 270]) {
        const target = destination(origin, 20, bearing);
        const relative = relativeLocation(origin, target);
        expect(relative.distance).toBeCloseTo(20, 5);
        expect(Math.min(Math.abs(relative.bearing - bearing), 360 - Math.abs(relative.bearing - bearing))).toBeLessThan(.001);
        expect(Math.abs(target.lon)).toBeLessThanOrEqual(180);
      }
    }
  });
  it('rotates ash overlap with wind while radial hazards stay fixed', () => {
    const target = destination(volcano, result.ash / 2, 90);
    const east = assessLocation(volcano, target, result, 90);
    const west = assessLocation(volcano, target, result, 270);
    expect(east.ash).toBe(true); expect(west.ash).toBe(false);
    expect(east.pdc).toBe(west.pdc); expect(east.lahar).toBe(west.lahar);
    expect(assessLocation(volcano, destination(volcano, result.ash * 2, 90), result, 90).ash).toBe(false);
  });
  it('includes radial boundaries and excludes zero-radius hazards', () => {
    expect(assessLocation(volcano, destination(volcano, result.pdc, 0), result, 0).pdc).toBe(true);
    expect(assessLocation(volcano, volcano, { ...result, pdc: 0 }, 0).pdc).toBe(false);
  });
  it('requires two finite, bounded coordinates, including valid zeroes', () => {
    expect(parseLocation('0', '0')).toEqual({ lat: 0, lon: 0 });
    for (const [lat, lon] of [['', '0'], ['0', ''], ['91', '20'], ['30', '-181'], ['NaN', '2'], ['0', 'Infinity']]) expect(parseLocation(lat, lon)).toBeNull();
  });
});
