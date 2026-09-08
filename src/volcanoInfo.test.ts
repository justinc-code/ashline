import { describe, expect, it } from 'vitest';
import catalog from './data/volcanoes.json';
import { searchVolcanoes, volcanoContext } from './volcanoInfo';
import type { Volcano } from './model';
const volcanoes = catalog.volcanoes as Volcano[];
const merapi = volcanoes.find(v => v.name === 'Merapi')!;
describe('volcano information', () => {
  it('finds multi-word queries regardless of order, case, or accents', () => {
    expect(searchVolcanoes(volcanoes, '  INDONESIA mérapi ')).toContain(merapi);
    expect(searchVolcanoes(volcanoes, merapi.id)).toEqual([merapi]);
  });
  it('searches geology and respects country filters', () => {
    expect(searchVolcanoes([merapi], merapi.summary.split(' ').slice(0, 3).join(' '))).toEqual([merapi]);
    expect(searchVolcanoes([merapi], 'stratovolcano')).toEqual([merapi]);
    expect(searchVolcanoes([merapi], '', 'Japan')).toEqual([]);
    expect(searchVolcanoes(volcanoes, '   ')).toHaveLength(catalog.count);
    expect(searchVolcanoes(volcanoes, 'no-such-volcano')).toEqual([]);
  });
  it('prioritizes underwater limitations over morphology and handles unknown types', () => {
    expect(volcanoContext({...merapi, type:'Lava dome', elevation:-39}).title).toBe('Underwater setting');
    expect(volcanoContext({...merapi, type:'Caldera'}).title).toBe('Caldera setting');
    expect(volcanoContext({...merapi, type:'Shield'}).text).toContain('does not model lava');
    expect(volcanoContext({...merapi, type:'Unknown'}).title).toBe('Interpret the local setting');
  });
});
