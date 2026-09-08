import { describe, it, expect } from 'vitest';
import catalog from './data/volcanoes.json';
import { defaults, runSimulation, parseScenario, type Volcano } from './model';
const v=catalog.volcanoes.find(v=>v.name==='Merapi') as Volcano;
describe('official catalog',()=>{
 it('has complete unique records and valid geography',()=>{expect(catalog.count).toBe(catalog.volcanoes.length);expect(catalog.count).toBeGreaterThan(1000);expect(new Set(catalog.volcanoes.map(v=>v.id)).size).toBe(catalog.count);for(const v of catalog.volcanoes){expect(v.lat).toBeGreaterThanOrEqual(-90);expect(v.lat).toBeLessThanOrEqual(90);expect(v.lon).toBeGreaterThanOrEqual(-180);expect(v.lon).toBeLessThanOrEqual(180);expect(v.name.length).toBeGreaterThan(0);}});
});
describe('training model',()=>{
 it('is deterministic across all catalog entries',()=>{for(const volcano of catalog.volcanoes as Volcano[]){const d=defaults(volcano);const r=runSimulation(d.settings,d.signals,volcano);expect(r).toEqual(runSimulation(d.settings,d.signals,volcano));expect(Number.isFinite(r.ash)).toBe(true);expect(r.low).toBeGreaterThanOrEqual(0);expect(r.high).toBeLessThanOrEqual(100);}});
 it('separates rainfall and wind from unrest',()=>{const d=defaults(v);const a=runSimulation(d.settings,d.signals,v);const b=runSimulation({...d.settings,wind:100},{...d.signals,rainfall:200},v);expect(a.score).toBe(b.score);expect(b.ash).toBeGreaterThan(a.ash);expect(b.lahar).toBeGreaterThan(a.lahar);});
 it('covers score boundaries and eruption scaling',()=>{const d=defaults(v);expect(runSimulation(d.settings,{seismicity:0,tremor:0,deformation:0,gas:0,thermal:0,rainfall:0},v).score).toBe(0);expect(runSimulation(d.settings,{seismicity:200,tremor:100,deformation:100,gas:10000,thermal:100,rainfall:0},v).score).toBe(100);expect(runSimulation({...d.settings,vei:0},d.signals,v).pdc).toBe(0);expect(runSimulation({...d.settings,vei:8},d.signals,v).ash).toBeGreaterThan(runSimulation(d.settings,d.signals,v).ash);});
 it('distinguishes type presets and flags submarine limitations',()=>{expect(defaults({...v,type:'Shield'}).settings.vei).toBe(2);expect(runSimulation(defaults(v).settings,defaults(v).signals,{...v,type:'Submarine volcano'}).unsupported).toBe(true);});
});
describe('scenario imports',()=>{
 const d=defaults(v);const x={version:1,id:'test',name:'Exercise',volcanoId:v.id,...d,notes:'Test',created:'2026-09-07',updated:'2026-09-07'};const ids=new Set([v.id]);
 it('round trips',()=>expect(parseScenario(JSON.parse(JSON.stringify(x)),ids)).toEqual(x));
 it('rejects unknown volcano, unsupported version, and invalid controls',()=>{for(const broken of [{...x,version:2},{...x,volcanoId:'unknown'},{...x,settings:{...x.settings,vei:99}},{...x,signals:{...x.signals,gas:null}},{...x,created:'bad'}])expect(()=>parseScenario(broken,ids)).toThrow();});
});
