import { type MonitoringSignals, type ScenarioSettings, type SimulationResult, type Volcano } from './model';

export interface Location { lat: number; lon: number }
export interface ScenarioRun {
  id: string; created: string; volcano: Volcano; settings: ScenarioSettings;
  signals: MonitoringSignals; result: SimulationResult; location: Location | null; measures: string[];
}
const radians = Math.PI / 180;
export const earthRadius = 6371;
export function destination(origin: Location, distance: number, bearing: number): Location {
  const angular = distance / earthRadius, b = bearing * radians, lat = origin.lat * radians;
  const targetLat = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(b));
  const lon = origin.lon * radians + Math.atan2(Math.sin(b) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(targetLat));
  return { lat: targetLat / radians, lon: ((lon / radians + 540) % 360) - 180 };
}
export function relativeLocation(origin: Location, target: Location) {
  const lat1 = origin.lat * radians, lat2 = target.lat * radians, delta = (target.lon - origin.lon) * radians;
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta / 2) ** 2;
  const distance = earthRadius * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
  const bearing = (Math.atan2(Math.sin(delta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)) / radians + 360) % 360;
  return { distance, bearing, east: distance * Math.sin(bearing * radians), north: distance * Math.cos(bearing * radians) };
}
export function assessLocation(origin: Location, target: Location, result: SimulationResult, direction: number) {
  const relative = relativeLocation(origin, target);
  const angle = (relative.bearing - direction) * radians;
  const along = relative.distance * Math.cos(angle), across = relative.distance * Math.sin(angle);
  return { ...relative,
    ash: result.ash > 0 && ((along - result.ash / 2) / (result.ash / 2)) ** 2 + (across / (result.ash * .22)) ** 2 <= 1 + 1e-9,
    pdc: result.pdc > 0 && relative.distance <= result.pdc + 1e-9,
    lahar: result.lahar > 0 && relative.distance <= result.lahar + 1e-9,
  };
}
export function parseLocation(lat: string, lon: string): Location | null {
  if (!lat.trim() || !lon.trim()) return null;
  const location = { lat: Number(lat), lon: Number(lon) };
  return Number.isFinite(location.lat) && Number.isFinite(location.lon) && Math.abs(location.lat) <= 90 && Math.abs(location.lon) <= 180 ? location : null;
}
export const mitigationMeasures = [
  { id: 'evacuation', title: 'Rehearse an official evacuation plan', effect: 'Reduces time spent in hazardous areas when an evacuation is ordered. Confirm transport, accessible shelters, and official routes before an incident.' },
  { id: 'ash', title: 'Prepare for ash exposure', effect: 'Indoor shelter, closed windows, protected water, and well-fitting particulate respirators when exposure is unavoidable can reduce inhalation and contamination. Respirators do not protect against volcanic gases.' },
  { id: 'lahar', title: 'Plan around river channels', effect: 'Identify official lahar zones and local warning signals. Practice reaching higher ground away from channels; lahars can continue after an eruption.' },
  { id: 'gas', title: 'Arrange gas monitoring before return', effect: 'Use qualified gas and oxygen monitoring with official re-entry clearance. Avoid low areas and enclosed spaces; particulate respirators do not protect against volcanic gases.' },
  { id: 'cleanup', title: 'Coordinate aftermath cleanup', effect: 'Plan structural and water checks, approved ash disposal, essential access, and continuing lahar surveillance before recovery crews enter affected areas.' },
  { id: 'communications', title: 'Set up accessible warnings and support', effect: 'Agree on trusted alerts, household contacts, medicines, and assistance for people who need transport or accessible communication.' },
];
