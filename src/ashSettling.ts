import { sampleTerrain, type TerrainData } from './terrain';

export const GRAIN_SIZES_UM = [20, 63, 125, 250, 1000] as const;
export const ASH_DENSITY = 2300;
const AIR_DENSITY = 1.225, VISCOSITY = 1.81e-5, GRAVITY = 9.80665;
export interface AshPoint { eastKm: number; northKm: number; elevationM: number }
export interface AshTracer {
  grainUm: number; fallSpeed: number; origin: AshPoint; end: AshPoint;
  endSeconds: number; outcome: 'deposited' | 'outside'; birthFraction: number;
}
export interface AshCounts { airborne: number; deposited: number; outside: number; pending: number }
export interface AshOptions { windKmh: number; direction: number; releaseHeightKm: number }

/** Equivalent spherical grains, fixed standard air; Schiller–Naumann drag below Re=1000. */
export function terminalFallSpeed(diameterUm: number) {
  const diameter = diameterUm * 1e-6;
  if (!(diameter > 0) || !Number.isFinite(diameter)) throw new Error('Grain diameter must be finite and positive.');
  let speed = Math.min(100, (ASH_DENSITY - AIR_DENSITY) * GRAVITY * diameter ** 2 / (18 * VISCOSITY));
  for (let i = 0; i < 60; i++) {
    const re = Math.max(1e-9, AIR_DENSITY * speed * diameter / VISCOSITY);
    const drag = re < 1000 ? 24 / re * (1 + .15 * re ** .687) : .44;
    const next = Math.sqrt(4 * diameter * (ASH_DENSITY - AIR_DENSITY) * GRAVITY / (3 * AIR_DENSITY * drag));
    if (Math.abs(next - speed) < 1e-9) return next;
    speed = (speed + next) / 2;
  }
  return speed;
}
export function advect(origin: AshPoint, seconds: number, speed: number, options: AshOptions): AshPoint {
  const angle = options.direction * Math.PI / 180, distanceKm = options.windKmh / 3600 * seconds;
  return { eastKm: origin.eastKm + Math.sin(angle) * distanceKm, northKm: origin.northKm + Math.cos(angle) * distanceKm, elevationM: origin.elevationM - speed * seconds };
}
export function traceAsh(data: TerrainData, origin: AshPoint, fallSpeed: number, options: AshOptions): Pick<AshTracer, 'end' | 'endSeconds' | 'outcome'> {
  const half = data.widthKm / 2;
  const initialGround = sampleTerrain(data, origin.eastKm, origin.northKm);
  if (initialGround === null) return { end: origin, endSeconds: 0, outcome: 'outside' };
  if (origin.elevationM <= initialGround) return { end: { ...origin, elevationM: initialGround }, endSeconds: 0, outcome: 'deposited' };
  const angle = options.direction * Math.PI / 180;
  const vx = Math.sin(angle) * options.windKmh / 3600, vy = Math.cos(angle) * options.windKmh / 3600;
  const exitTime = Math.min(Math.abs(vx) < 1e-12 ? Infinity : (Math.sign(vx) * half - origin.eastKm) / vx, Math.abs(vy) < 1e-12 ? Infinity : (Math.sign(vy) * half - origin.northKm) / vy);
  const maxTime = Math.min(exitTime, (origin.elevationM - data.min) / fallSpeed + 1);
  // Sample at <= half a DEM cell horizontally and <= 25 m vertically, then refine contact.
  const step = Math.min(60, options.windKmh > 0 ? data.spacingM / 2 / (options.windKmh / 3.6) : 60, 25 / fallSpeed);
  let previous = 0;
  for (let time = Math.min(step, maxTime); ; time = Math.min(time + step, maxTime)) {
    const point = advect(origin, time, fallSpeed, options);
    // Split at grid lines. Within one cell, clearance along a straight ray is quadratic.
    // Solve that quadratic so grazing ridges cannot be skipped between endpoints.
    const breaks = [previous, time];
    const cellKm = data.widthKm / (data.size - 1);
    for (const [start, velocity] of [[origin.eastKm, vx], [origin.northKm, vy]]) {
      if (Math.abs(velocity) < 1e-12) continue;
      const first = (start + velocity * previous + half) / cellKm, last = (start + velocity * time + half) / cellKm;
      for (let line = Math.floor(Math.min(first, last)) + 1; line < Math.ceil(Math.max(first, last)); line++) {
        const cross = (line * cellKm - half - start) / velocity;
        if (cross > previous + 1e-9 && cross < time - 1e-9) breaks.push(cross);
      }
    }
    breaks.sort((a, b) => a - b);
    const clearance = (seconds: number) => {
      const p = advect(origin, seconds, fallSpeed, options);
      return p.elevationM - sampleTerrain(data, Math.max(-half, Math.min(half, p.eastKm)), Math.max(-half, Math.min(half, p.northKm)))!;
    };
    for (let segment = 0; segment < breaks.length - 1; segment++) {
      const low = breaks[segment], high = breaks[segment + 1];
      const c = clearance(low), endClearance = clearance(high), middle = clearance((low + high) / 2);
      const a = 2 * (endClearance + c - 2 * middle), b = endClearance - c - a;
      const roots: number[] = [];
      if (c <= 0) roots.push(0);
      if (Math.abs(a) < 1e-8) { if (Math.abs(b) > 1e-12) roots.push(-c / b); }
      else {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= -1e-8) {
          const root = Math.sqrt(Math.max(0, discriminant));
          roots.push((-b - root) / (2 * a), (-b + root) / (2 * a));
        }
      }
      const contact = roots.filter(value => value >= -1e-9 && value <= 1 + 1e-9).sort((a, b) => a - b)[0];
      if (contact !== undefined) {
        const seconds = low + Math.max(0, Math.min(1, contact)) * (high - low);
        const end = advect(origin, seconds, fallSpeed, options);
        end.elevationM = sampleTerrain(data, Math.max(-half, Math.min(half, end.eastKm)), Math.max(-half, Math.min(half, end.northKm)))!;
        return { end, endSeconds: seconds, outcome: 'deposited' };
      }
    }
    if (time >= maxTime) return { end: point, endSeconds: time, outcome: 'outside' };
    previous = time;
  }
}
const random = (index: number) => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
export function buildAshTracers(data: TerrainData, options: AshOptions, count = 1000): AshTracer[] {
  const vent = sampleTerrain(data, 0, 0)!;
  // Assumed 20 m/s mean column ascent; release starts at the top of the column.
  const riseSeconds = options.releaseHeightKm * 1000 / 20;
  const top = advect({ eastKm: 0, northKm: 0, elevationM: vent + options.releaseHeightKm * 1000 }, riseSeconds, 0, options);
  const speeds = GRAIN_SIZES_UM.map(terminalFallSpeed);
  return Array.from({ length: count }, (_, index) => {
    const angle = random(index + 21) * Math.PI * 2, radius = Math.sqrt(random(index + 72)) * .18;
    const origin = { eastKm: top.eastKm + Math.sin(angle) * radius, northKm: top.northKm + Math.cos(angle) * radius, elevationM: top.elevationM + random(index + 132) * 100 };
    const grainUm = GRAIN_SIZES_UM[index % GRAIN_SIZES_UM.length], fallSpeed = speeds[index % speeds.length];
    return { grainUm, fallSpeed, origin, birthFraction: (index + .5) / count, ...traceAsh(data, origin, fallSpeed, options) };
  });
}
export function tracerState(tracer: AshTracer, elapsedSeconds: number, eruptionSeconds: number) {
  const age = elapsedSeconds - tracer.birthFraction * eruptionSeconds;
  return age < 0 ? 'pending' : age >= tracer.endSeconds ? tracer.outcome : 'airborne';
}
