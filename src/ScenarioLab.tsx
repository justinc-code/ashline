import { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { GeographicHazardMap } from './HazardMap';
export { GeographicHazardMap } from './HazardMap';
import { type MonitoringSignals, type ScenarioSettings, type SimulationResult, type Volcano } from './model';
import { assessLocation, mitigationMeasures, parseLocation, type ScenarioRun } from './geography';

interface Props { volcano: Volcano; settings: ScenarioSettings; signals: MonitoringSignals; result: SimulationResult; runs: ScenarioRun[]; onRun: (run: ScenarioRun) => void }
export default function ScenarioLab({ volcano, settings, signals, result, runs, onRun }: Props) {
  const [lat, setLat] = useState(''), [lon, setLon] = useState('');
  const [measures, setMeasures] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const location = parseLocation(lat, lon);
  const invalid = (lat !== '' || lon !== '') && !location;
  const impact = location ? assessLocation(volcano, location, result, settings.direction) : null;
  const localRuns = runs.filter(run => run.volcano.id === volcano.id);
  function record() {
    onRun({ id: crypto.randomUUID(), created: new Date().toISOString(), volcano: { ...volcano }, settings: { ...settings }, signals: { ...signals }, result: { ...result }, location, measures: [...measures] });
    setMessage(`Run ${localRuns.length + 1} recorded for ${volcano.name}. Change conditions to compare another run.`);
  }
  function exportRuns() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, model: 'Ashline illustrative training model; no forecast or quantified risk reduction', runs: localRuns }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `ashline-runs-${volcano.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const hazards = [
    { title: 'Ash fall', affected: impact?.ash, description: `An illustrative plume reaches ${result.ash} km toward ${settings.direction}° over the ${settings.duration}-hour scenario. Ash may disrupt breathing, visibility, water supplies, transport, and aviation. Thickness and arrival time are not calculated.`, action: 'Prepare indoor shelter and protected water. Coordinate transport and aviation decisions with official advisories.' },
    { title: 'Pyroclastic flows', affected: impact?.pdc, description: result.pdc > 0 ? `The model draws a ${result.pdc} km radius for fast, hot flows. Real flows follow terrain and can extend beyond this envelope.` : 'This low-VEI preset draws no pyroclastic envelope. That does not rule out pyroclastic flows at this volcano.', action: 'Plan early evacuation under official guidance. Indoor shelter and masks do not provide protection from pyroclastic flows.' },
    { title: 'Lava flows', affected: undefined, description: 'The map sketches assumed lava paths from the vent with an editable heading and reach. Lava motion depends on terrain, effusion rate, cooling, and viscosity; none are modeled by these sketches.', action: 'Use official lava-flow maps and exclusion zones to plan access. Keep crews away from active flows and unstable new deposits until authorities clear re-entry.' },
    { title: 'Toxic gases', affected: undefined, description: 'SO₂ can irritate airways; CO₂ can displace oxygen in low areas. The hatched map area is an adjustable exercise assumption, not a concentration or dispersion forecast.', action: 'Require qualified gas monitoring and official clearance before re-entry. Avoid depressions and enclosed areas. Particulate masks do not protect against gases.' },
    { title: 'Lahars', affected: impact?.lahar, description: `Rainfall of ${signals.rainfall} mm/day gives a ${result.lahar} km reach proxy. The dashed ring is a distance screen, not an inundation zone; water, sediment, and river channels determine actual paths.`, action: 'Use official lahar maps to identify channels and practice reaching higher ground away from them.' },
  ];
  return <section className="scenario-lab" aria-labelledby="outcomes-heading">
    <div className="lab-heading"><div><h2 id="outcomes-heading">What this eruption could mean</h2><p>Scenario outcomes for {volcano.name}, {volcano.country}. Geography locates the footprints; terrain does not shape them.</p></div><button className="primary" onClick={record} disabled={!!invalid}><Play size={15}/> Run scenario</button></div>
    <div className="location-check"><div><h3>Check a location</h3><p>Tap the map or enter coordinates to compare a home or facility with illustrative footprints. Optional.</p></div><label>Latitude<input type="number" min="-90" max="90" step="any" placeholder="−7.54" value={lat} onChange={e => setLat(e.target.value)} aria-invalid={!!invalid} /></label><label>Longitude<input type="number" min="-180" max="180" step="any" placeholder="110.45" value={lon} onChange={e => setLon(e.target.value)} aria-invalid={!!invalid}/></label>{(lat || lon) && <button className="text-button" onClick={() => { setLat(''); setLon(''); }}>Clear location</button>}</div>
    {invalid && <p className="location-error" role="alert">Enter both coordinates: latitude −90 to 90, longitude −180 to 180.</p>}
    {impact && <div className="location-result"><p><strong>{impact.distance.toFixed(1)} km from the volcano · bearing {impact.bearing.toFixed(0)}°</strong></p><p>{result.unsupported ? 'This location cannot be assessed for underwater hazards with this model.' : 'Inside means geometric overlap only. Outside does not establish safety. Lahar overlap requires channel and terrain checks.'}</p></div>}
    <GeographicHazardMap volcano={volcano} result={result} direction={settings.direction} location={location} onLocation={point => { setLat(String(point.lat)); setLon(String(point.lon)); }}/>
    <div className="outcome-list">{hazards.map(hazard => <article key={hazard.title}><div><h3>{hazard.title}</h3>{impact && !result.unsupported && <span className="overlap-label">{hazard.affected === undefined ? hazard.title === 'Lava flows' ? 'Lava exposure not assessed' : 'Concentration not assessed' : hazard.affected ? 'Inside illustrative envelope' : 'Outside illustrative envelope'}</span>}</div><p>{hazard.description}</p><p><strong>Reduce exposure:</strong> {hazard.action}</p></article>)}</div>
    <div className="mitigation-plan"><h3>Build a mitigation plan</h3><p>Eruptions cannot currently be prevented. These measures can reduce exposure and improve readiness; this model does not estimate casualties, damage, or percentage risk reduction.</p>{mitigationMeasures.map(measure => <label key={measure.id}><input type="checkbox" checked={measures.includes(measure.id)} onChange={e => setMeasures(e.target.checked ? [...measures, measure.id] : measures.filter(id => id !== measure.id))}/><span><strong>{measure.title}</strong><span>{measure.effect}</span></span></label>)}<p>{measures.length} of {mitigationMeasures.length} measures included in the next run. Selection records a plan, not completed protection.</p></div>
    <div className="run-heading"><div><h3>Compare simulation runs</h3><p>Snapshots stay unchanged as sliders move. Session only; export to keep them.</p></div><button className="secondary" onClick={exportRuns} disabled={!localRuns.length}><Download size={15}/> Export runs</button></div>
    {message && <p role="status" className="run-message">{message}</p>}
    {localRuns.length ? <div className="run-table"><table><caption>Runs for {volcano.name}. Distances in km; no probabilities implied.</caption><thead><tr><th>Run</th><th>Conditions</th><th>Ash / PDC / lahar</th><th>Location overlap</th><th>Plan</th></tr></thead><tbody>{localRuns.map((run, index) => { const check = run.location ? assessLocation(run.volcano, run.location, run.result, run.settings.direction) : null; return <tr key={run.id}><td>Run {index + 1}</td><td>VEI {run.settings.vei} · {run.settings.duration} h<br/>{run.settings.wind} km/h toward {run.settings.direction}°<br/>Rain {run.signals.rainfall} mm/day</td><td>{run.result.ash} / {run.result.pdc} / {run.result.lahar}</td><td>{run.result.unsupported ? 'Unsupported setting' : check ? ['ash', 'pdc', 'lahar'].filter(key => check[key as 'ash' | 'pdc' | 'lahar']).join(', ') || 'No overlap; safety unknown' : 'No location entered'}{run.location && <small>{run.location.lat}°, {run.location.lon}°</small>}</td><td>{run.measures.length ? mitigationMeasures.filter(m => run.measures.includes(m.id)).map(m => <small key={m.id}>{m.title}</small>) : 'No measures selected'}</td></tr>; })}</tbody></table></div> : <p className="run-empty">No runs yet. Set conditions, choose your plan, then run the scenario.</p>}
  </section>;
}
