// Refresh deliberately; the bundled snapshot keeps the application offline-capable.
import { readFileSync, writeFileSync } from 'node:fs';
const raw=JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(raw.features) || raw.features.length < 1000 || (raw.totalFeatures && raw.totalFeatures !== raw.features.length)) throw new Error('Incomplete catalog response');
const volcanoes=raw.features.map(({properties:p, geometry:g})=>({id:String(p.Volcano_Number),name:p.Volcano_Name,country:p.Country,region:p.Region,lat:g.coordinates[1],lon:g.coordinates[0],elevation:p.Elevation,type:p.Primary_Volcano_Type,lastEruption:p.Last_Eruption_Year,summary:p.Geological_Summary,url:`https://volcano.si.edu/volcano.cfm?vn=${p.Volcano_Number}`})).sort((a,b)=>a.name.localeCompare(b.name));
if(new Set(volcanoes.map(v=>v.id)).size!==volcanoes.length || volcanoes.some(v=>!Number.isFinite(v.lat)||!Number.isFinite(v.lon))) throw new Error('Invalid catalog');
writeFileSync('src/data/volcanoes.json',JSON.stringify({source:'Smithsonian Global Volcanism Program — Holocene Volcanoes WFS',retrieved:new Date().toISOString().slice(0,10),count:volcanoes.length,volcanoes}));
console.log(`Bundled ${volcanoes.length} official Holocene volcano records.`);
