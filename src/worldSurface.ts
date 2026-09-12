import * as THREE from 'three';
import { localCoordinate, sampleTerrain, type TerrainData } from './terrain';

export interface SurfaceImagery { bitmap: ImageBitmap; west: number; east: number; south: number; north: number }
export const IMAGERY_SOURCE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';

export async function loadSurfaceImagery(data: TerrainData, signal: AbortSignal): Promise<SurfaceImagery> {
  const edge = data.widthKm / 2;
  const corners = [-edge, edge].flatMap(x => [-edge, edge].map(y => localCoordinate(data.center, x, y)));
  const west = Math.min(...corners.map(p => p.lon)), east = Math.max(...corners.map(p => p.lon));
  const south = Math.min(...corners.map(p => p.lat)), north = Math.max(...corners.map(p => p.lat));
  if (east - west > 180) throw new Error('Satellite imagery is unavailable for patches crossing the date line.');
  const params = new URLSearchParams({ bbox: [west, south, east, north].join(','), bboxSR: '4326', imageSR: '4326', size: '2048,2048', format: 'jpg', f: 'json' });
  const response = await fetch(`${IMAGERY_SOURCE}/export?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error('Satellite imagery unavailable.');
  const metadata = await response.json();
  if (!metadata.href || !metadata.extent || metadata.error) throw new Error('Satellite imagery unavailable.');
  const imageResponse = await fetch(metadata.href, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!imageResponse.ok || !imageResponse.headers.get('content-type')?.startsWith('image/')) throw new Error('Satellite imagery unavailable.');
  const bitmap = await createImageBitmap(await imageResponse.blob(), { imageOrientation: 'flipY' });
  if (signal.aborted) { bitmap.close(); signal.throwIfAborted(); }
  return { bitmap, west: metadata.extent.xmin, east: metadata.extent.xmax, south: metadata.extent.ymin, north: metadata.extent.ymax };
}

export function applySurfaceUV(geometry: THREE.BufferGeometry, center: TerrainData['center'], unitsPerKm: number, imagery: Omit<SurfaceImagery, 'bitmap'>) {
  const positions = geometry.getAttribute('position'), uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    const p = localCoordinate(center, positions.getX(i) / unitsPerKm, -positions.getZ(i) / unitsPerKm);
    uv[i * 2] = (p.lon - imagery.west) / (imagery.east - imagery.west);
    uv[i * 2 + 1] = (p.lat - imagery.south) / (imagery.north - imagery.south);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** A stitched surrounding DEM ring. Its inner edge uses the exact simulation boundary. */
export function surroundingGeometry(core: TerrainData, context: TerrainData, exaggeration: number) {
  const units = 25 / core.widthKm, sides = core.size - 1, rings = 32;
  const positions: number[] = [], indices: number[] = [];
  const inner = core.widthKm / 2, outer = context.widthKm / 2;
  for (let ring = 0; ring <= rings; ring++) {
    const radius = inner + (outer - inner) * ring / rings;
    for (let edge = 0; edge < 4; edge++) for (let step = 0; step < sides; step++) {
      const t = step / sides;
      const [x, z] = edge === 0 ? [-radius + 2 * radius * t, -radius] : edge === 1 ? [radius, -radius + 2 * radius * t] : edge === 2 ? [radius - 2 * radius * t, radius] : [-radius, radius - 2 * radius * t];
      const elevation = ring === 0 ? sampleTerrain(core, x, -z)! : sampleTerrain(context, x, -z)!;
      positions.push(x * units, (elevation - core.min) / 1000 * units * exaggeration + .07, z * units);
    }
  }
  const stride = sides * 4;
  for (let ring = 0; ring < rings; ring++) for (let i = 0; i < stride; i++) {
    const a = ring * stride + i, b = ring * stride + (i + 1) % stride, c = a + stride, d = b + stride;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
