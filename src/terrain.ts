import { destination, type Location } from './geography';
export const TERRAIN_SOURCE = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium';
export const TERRAIN_GRID_SIZE = 257;
export interface TerrainData {
  center: Location; widthKm: number; size: number; elevations: Float32Array;
  min: number; max: number; spacingM: number; sourcePixelM: number;
  sources: string[]; retrieved: string; zoom: number;
}
interface Tile { pixels: Uint8ClampedArray; source: string }
interface Manifest { retrieved: string; tiles: Record<string, { path: string; source: string }> }
const cache = new Map<string, Tile>();
export const decodeTerrarium = (red: number, green: number, blue: number) => red * 256 + green + blue / 256 - 32768;
export function localCoordinate(center: Location, eastKm: number, northKm: number) {
  return destination(center, Math.hypot(eastKm, northKm), Math.atan2(eastKm, northKm) * 180 / Math.PI);
}
export function terrainPixel(location: Location, zoom: number) {
  if (Math.abs(location.lat) > 85.05112878) throw new Error('This patch extends beyond the elevation tile latitude coverage (85.05°). Choose a smaller patch or use the procedural preview.');
  const width = 256 * 2 ** zoom;
  return { x: (location.lon + 180) / 360 * width - .5, y: (1 - Math.asinh(Math.tan(location.lat * Math.PI / 180)) / Math.PI) / 2 * width - .5 };
}
export function sampleTerrain(data: TerrainData, eastKm: number, northKm: number) {
  if (Math.abs(eastKm) > data.widthKm / 2 || Math.abs(northKm) > data.widthKm / 2) return null;
  const x = (eastKm / data.widthKm + .5) * (data.size - 1), y = (.5 - northKm / data.widthKm) * (data.size - 1);
  const ix = Math.min(data.size - 2, Math.floor(x)), iy = Math.min(data.size - 2, Math.floor(y)), fx = x - ix, fy = y - iy;
  const at = (dx: number, dy: number) => data.elevations[(iy + dy) * data.size + ix + dx];
  return (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
}
export function terrainProbe(data: TerrainData, eastKm: number, northKm: number) {
  const elevation = sampleTerrain(data, eastKm, northKm);
  if (elevation === null) return null;
  const step = data.spacingM / 1000;
  const west = Math.max(-data.widthKm / 2, eastKm - step), east = Math.min(data.widthKm / 2, eastKm + step);
  const south = Math.max(-data.widthKm / 2, northKm - step), north = Math.min(data.widthKm / 2, northKm + step);
  const dx = (sampleTerrain(data, east, northKm)! - sampleTerrain(data, west, northKm)!) / ((east - west) * 1000);
  const dy = (sampleTerrain(data, eastKm, north)! - sampleTerrain(data, eastKm, south)!) / ((north - south) * 1000);
  return { ...localCoordinate(data.center, eastKm, northKm), elevation, slope: Math.atan(Math.hypot(dx, dy)) * 180 / Math.PI };
}
export async function loadTerrain(center: Location, widthKm: number, signal: AbortSignal, context = false): Promise<TerrainData> {
  const size = context ? 129 : TERRAIN_GRID_SIZE, zoom = context ? 10 : widthKm <= 20 ? 12 : 11;
  const count = 2 ** zoom, worldWidth = count * 256;
  const pixels: { x: number; y: number }[] = [], keys = new Set<string>();
  const keyFor = (x: number, y: number) => `${zoom}/${((Math.floor(x / 256) % count) + count) % count}/${Math.floor(y / 256)}`;
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const coordinate = localCoordinate(center, (col / (size - 1) - .5) * widthKm, (.5 - row / (size - 1)) * widthKm);
    const pixel = terrainPixel(coordinate, zoom); pixels.push(pixel);
    const x = Math.floor(pixel.x), y = Math.floor(pixel.y);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) keys.add(keyFor(x + dx, y + dy));
  }
  if (keys.size > 64) throw new Error('Too many elevation tiles at this latitude. Choose a smaller patch.');
  let manifest: Manifest = { retrieved: '', tiles: {} };
  try { const response = await fetch(`${import.meta.env.BASE_URL}terrain/manifest.json`, { signal }); if (response.ok) manifest = await response.json(); } catch { signal.throwIfAborted(); }
  const tiles = new Map<string, Tile>();
  const queue = [...keys];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      signal.throwIfAborted();
      const key = queue.shift()!;
      if (cache.has(key)) { tiles.set(key, cache.get(key)!); continue; }
      const bundled = manifest.tiles[key];
      const url = bundled ? `${import.meta.env.BASE_URL}terrain/${bundled.path}` : `${TERRAIN_SOURCE}/${key}.png`;
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error(`Elevation tile unavailable (${response.status}). Retry or use the procedural preview.`);
      const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      try {
        if (bitmap.width !== 256 || bitmap.height !== 256) throw new Error('Unexpected elevation tile dimensions.');
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
        const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Unable to decode elevation data.');
        context.drawImage(bitmap, 0, 0);
        const tile = { pixels: context.getImageData(0, 0, 256, 256).data, source: bundled?.source || response.headers.get('x-amz-meta-x-imagery-sources') || 'Mapzen composite DEM; per-tile source unavailable' };
        tiles.set(key, tile); cache.set(key, tile);
        if (cache.size > 48) cache.delete(cache.keys().next().value!);
      } finally { bitmap.close(); }
    }
  }));
  signal.throwIfAborted();
  const at = (x: number, y: number) => {
    const tile = tiles.get(keyFor(x, y))!;
    const pixelX = ((x % worldWidth) + worldWidth) % worldWidth % 256;
    const index = ((y % 256) * 256 + pixelX) * 4;
    const elevation = decodeTerrarium(tile.pixels[index], tile.pixels[index + 1], tile.pixels[index + 2]);
    if (tile.pixels[index + 3] !== 255 || !Number.isFinite(elevation) || elevation < -11000 || elevation > 9000) throw new Error('Elevation patch contains missing or invalid samples. No synthetic values have been substituted.');
    return elevation;
  };
  const elevations = new Float32Array(size * size);
  let min = Infinity, max = -Infinity;
  pixels.forEach((pixel, index) => {
    const x = Math.floor(pixel.x), y = Math.floor(pixel.y), fx = pixel.x - x, fy = pixel.y - y;
    const value = (at(x, y) * (1 - fx) + at(x + 1, y) * fx) * (1 - fy) + (at(x, y + 1) * (1 - fx) + at(x + 1, y + 1) * fx) * fy;
    elevations[index] = value; min = Math.min(min, value); max = Math.max(max, value);
  });
  return { center: { ...center }, widthKm, size, elevations, min, max, spacingM: widthKm * 1000 / (size - 1), sourcePixelM: Math.cos(center.lat * Math.PI / 180) * 40075016.686 / (256 * count), sources: [...new Set([...tiles.values()].map(tile => tile.source))], retrieved: [...keys].every(key => manifest.tiles[key]) ? manifest.retrieved : new Date().toISOString(), zoom };
}

/** Contour segments interpolated on the same triangles used by the terrain mesh. */
export function terrainContours(data: TerrainData, interval: number): number[] {
  if (!Number.isFinite(interval) || interval <= 0) throw new Error('Contour interval must be positive.');
  const segments: number[] = [];
  const point = (col: number, row: number) => [(col / (data.size - 1) - .5) * data.widthKm, data.elevations[row * data.size + col], (row / (data.size - 1) - .5) * data.widthKm];
  for (let row = 0; row < data.size - 1; row++) for (let col = 0; col < data.size - 1; col++) {
    const a = point(col, row), b = point(col, row + 1), c = point(col + 1, row + 1), d = point(col + 1, row);
    for (const triangle of [[a, b, d], [b, c, d]]) {
      const low = Math.min(...triangle.map(p => p[1])), high = Math.max(...triangle.map(p => p[1]));
      for (let level = Math.ceil(low / interval) * interval; level < high; level += interval) {
        const hits: number[][] = [];
        for (let edge = 0; edge < 3; edge++) {
          const start = triangle[edge], end = triangle[(edge + 1) % 3];
          if ((start[1] <= level && end[1] > level) || (end[1] <= level && start[1] > level)) {
            const t = (level - start[1]) / (end[1] - start[1]);
            hits.push([start[0] + t * (end[0] - start[0]), level, start[2] + t * (end[2] - start[2])]);
          }
        }
        if (hits.length === 2) segments.push(...hits[0], ...hits[1]);
      }
    }
  }
  return segments;
}
