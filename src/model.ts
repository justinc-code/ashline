export interface Volcano { id:string; name:string; country:string; region:string; lat:number; lon:number; elevation:number|null; type:string; lastEruption:number|null; summary:string; url:string }
export interface MonitoringSignals { seismicity:number; tremor:number; deformation:number; gas:number; thermal:number; rainfall:number }
export interface ScenarioSettings { vei:number; duration:number; wind:number; direction:number; uncertainty:number }
export interface SimulationResult { score:number; band:string; low:number; high:number; ash:number; pdc:number; lahar:number; preset:string; unsupported:boolean }
export interface SavedScenario { version:1; id:string; name:string; volcanoId:string; signals:MonitoringSignals; settings:ScenarioSettings; notes:string; created:string; updated:string }
export const signalSpecs = [
  {key:'seismicity',label:'Earthquakes',unit:'/ day',max:200,step:1},
  {key:'tremor',label:'Tremor',unit:'relative',max:100,step:1},
  {key:'deformation',label:'Ground uplift',unit:'mm / month',max:100,step:1},
  {key:'gas',label:'SO₂ emissions',unit:'t / day',max:10000,step:100},
  {key:'thermal',label:'Thermal anomaly',unit:'°C above baseline',max:100,step:1},
  {key:'rainfall',label:'Rainfall',unit:'mm / day',max:200,step:1}
] as const;
export const settingSpecs = [
  {key:'vei',label:'Explosivity · VEI',unit:'',max:8,min:0,step:1},
  {key:'duration',label:'Eruption duration',unit:'hours',max:72,min:1,step:1},
  {key:'wind',label:'Wind speed',unit:'km / h',max:120,min:0,step:1},
  {key:'direction',label:'Wind toward',unit:'° clockwise from north',max:359,min:0,step:1},
  {key:'uncertainty',label:'Sensitivity range',unit:'%',max:50,min:10,step:5}
] as const;
export function defaults(v:Volcano):{signals:MonitoringSignals;settings:ScenarioSettings} {
  const shield=/shield|fissure/i.test(v.type);
  return {signals:{seismicity:48,tremor:32,deformation:24,gas:1600,thermal:18,rainfall:25},settings:{vei:shield?2:3,duration:12,wind:25,direction:110,uncertainty:25}};
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function runSimulation(settings:ScenarioSettings,s:MonitoringSignals,v:Volcano):SimulationResult {
  const score=Math.round(clamp(s.seismicity/200*25+s.tremor*.25+s.deformation*.2+s.gas/10000*20+s.thermal*.1,0,100));
  const shield=/shield|fissure/i.test(v.type), caldera=/caldera/i.test(v.type);
  const factor=shield?.7:caldera?1.2:1;
  const strength=2**(settings.vei/2)*factor;
  const ash=+(strength*(2+settings.wind*.18)*Math.sqrt(settings.duration/12)).toFixed(1);
  const pdc=settings.vei<2?0:+(strength*1.15).toFixed(1);
  const lahar=+(strength*(.8+s.rainfall*.035)).toFixed(1);
  return {score,band:score<25?'Low unrest':score<50?'Elevated unrest':score<75?'High unrest':'Intense unrest',low:Math.max(0,score-settings.uncertainty),high:Math.min(100,score+settings.uncertainty),ash,pdc,lahar,preset:shield?'Effusive':caldera?'Caldera':'Explosive',unsupported:/submarine/i.test(v.type)||(v.elevation!==null&&v.elevation<0)};
}
export const actions = [
  {phase:'Prepare',role:'Planning lead',title:'Establish a shared picture',text:'Review observatory bulletins, identify exposed communities using official hazard maps, and agree on accessible communication channels.'},
  {phase:'Prepare',role:'Community liaison',title:'Make readiness practical',text:'Check household contacts, essential medicines, transport needs, animal arrangements, and accessible shelters. Prepare a go-bag.'},
  {phase:'Respond',role:'Incident commander',title:'Rehearse evacuation decisions',text:'Exercise triggers with the responsible authorities. Check official routes and shelter capacity; never use these illustrative envelopes to choose a route.'},
  {phase:'Respond',role:'Public information officer',title:'Reduce ash exposure',text:'Plan indoor shelter, closed windows, protected water supplies, and well-fitting particulate masks when ash exposure cannot be avoided. Coordinate with aviation authorities.'},
  {phase:'Respond',role:'Field coordinator',title:'Keep clear of river valleys',text:'Lahars can occur during or after eruptions. Rehearse rapid movement to higher ground away from channels under local guidance.'},
  {phase:'Recover',role:'Recovery lead',title:'Check toxic gases before re-entry',text:'Coordinate qualified SO₂, CO₂, and oxygen monitoring with local authorities. Avoid low areas and enclosed spaces until cleared. Particulate masks do not protect against gases.'},
  {phase:'Recover',role:'Recovery lead',title:'Coordinate ash cleanup and services',text:'Arrange structural checks before roof access, protect water intakes, and follow local ash collection and disposal guidance. Limit resuspension and prioritize health facilities and essential access.'},
  {phase:'Recover',role:'Field coordinator',title:'Recheck flow-affected access',text:'Confirm official exclusion zones, damaged crossings, and unstable deposits before sending crews. Rain can remobilize ash into lahars after the eruption; lava path sketches are exercise assumptions, not cleared access routes.'},
  {phase:'Recover',role:'Recovery lead',title:'Plan a safe return',text:'Await official clearance. Arrange structural and water checks, careful ash removal, health support, and a review of the response.'}
];
export function parseScenario(raw:unknown,ids:Set<string>):SavedScenario {
  if(!raw||typeof raw!=='object')throw new Error('Choose a valid Ashline JSON scenario.');
  const x=raw as SavedScenario;
  if(x.version!==1||!ids.has(x.volcanoId)||typeof x.name!=='string'||x.name.length>120||typeof x.notes!=='string'||x.notes.length>5000||!x.id||typeof x.id!=='string'||!Number.isFinite(Date.parse(x.created))||!Number.isFinite(Date.parse(x.updated)))throw new Error('Scenario version, volcano, or details are invalid.');
  for(const spec of [...signalSpecs,...settingSpecs]) {
    const group='min' in spec?x.settings:x.signals;
    const val=group?.[spec.key as keyof typeof group] as number;
    if(typeof val!=='number'||!Number.isFinite(val)||val<('min'in spec?spec.min:0)||val>spec.max)throw new Error(`Invalid ${spec.label}. Check the scenario file.`);
  }
  return x;
}
