import { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Plus, Minus, RotateCcw, RotateCw } from 'lucide-react';
import { createEruptionScene, type EruptionFrame } from './eruptionScene';
import { GRAIN_SIZES_UM, terminalFallSpeed, type AshCounts } from './ashSettling';
import { loadTerrain, sampleTerrain, terrainProbe, type TerrainData } from './terrain';
import { loadSurfaceImagery, type SurfaceImagery } from './worldSurface';
import type { ScenarioSettings, SimulationResult, Volcano } from './model';
import './eruption3d.css';

export default function Eruption3D({ volcano, settings, result, onSettings }: { volcano: Volcano; settings: ScenarioSettings; result: SimulationResult; onSettings: (settings: ScenarioSettings) => void }) {
  const [surroundings, setSurroundings] = useState<TerrainData | null>(null);
  const [imagery, setImagery] = useState<SurfaceImagery | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [worldStatus, setWorldStatus] = useState('Loading surrounding landscape…');
  const [imageryStatus, setImageryStatus] = useState('Loading satellite imagery…');
  const [contours, setContours] = useState(false);
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const [terrainError, setTerrainError] = useState(''), [loadingTerrain, setLoadingTerrain] = useState(true);
  const [widthKm, setWidthKm] = useState(20), [exaggeration, setExaggeration] = useState(1);
  const [procedural, setProcedural] = useState(false), [terrainRetry, setTerrainRetry] = useState(0);
  const [probe, setProbe] = useState<ReturnType<typeof terrainProbe>>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const [releaseHeightKm, setReleaseHeightKm] = useState(1.5), [settlingHours, setSettlingHours] = useState(6), [deposits, setDeposits] = useState(true);
  const [ashCounts, setAshCounts] = useState<AshCounts>({ airborne: 0, deposited: 0, outside: 0, pending: 1000 });
  const totalHours = settings.duration + (terrain ? settlingHours : 0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createEruptionScene> | null>(null);
  const [playing, setPlaying] = useState(false), [progress, setProgress] = useState(25), [speed, setSpeed] = useState(1);
  const [ash, setAsh] = useState(true), [flows, setFlows] = useState(true), [footprints, setFootprints] = useState(false);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const current = useRef({ playing, progress, speed, settings, result, ash, flows, footprints, releaseHeightKm, settlingHours, deposits });
  current.current = { playing, progress, speed, settings, result, ash, flows, footprints, releaseHeightKm, settlingHours, deposits };
  const dirty = useRef(true);
  const clock = useRef(25);
  function seek(value: number) { clock.current = value; current.current.progress = value; setProgress(value); dirty.current = true; }
  useEffect(() => {
    const controller = new AbortController();
    setTerrain(null); setTerrainError(''); setProbe(null); setReady(false); setPlaying(false);
    if (result.unsupported || procedural) { setLoadingTerrain(false); return () => controller.abort(); }
    setLoadingTerrain(true);
    loadTerrain(volcano, widthKm, controller.signal).then(data => {
      if (!controller.signal.aborted) { setTerrain(data); setProbe(terrainProbe(data, 0, 0)); setLoadingTerrain(false); }
    }).catch(cause => {
      if (!controller.signal.aborted) { setTerrainError(cause instanceof Error ? cause.message : 'Unable to load geographic terrain.'); setLoadingTerrain(false); controller.abort(); }
    });
    return () => controller.abort();
  }, [volcano.id, widthKm, terrainRetry, procedural, result.unsupported]);
  useEffect(() => {
    setSurroundings(null); setImagery(null);
    if (!terrain) return;
    const controller = new AbortController(); let loadedImagery: SurfaceImagery | null = null;
    setWorldStatus('Loading surrounding landscape…'); setImageryStatus('Loading satellite imagery…');
    async function loadWorld() {
      let coverage = terrain!;
      try {
        coverage = await loadTerrain(volcano, widthKm * 3, controller.signal, true);
        if (controller.signal.aborted) return;
        setSurroundings(coverage); setWorldStatus(`${coverage.widthKm} km surrounding DEM landscape`);
      } catch {
        if (controller.signal.aborted) return;
        setWorldStatus('Surrounding terrain unavailable · showing the simulation patch');
      }
      try {
        loadedImagery = await loadSurfaceImagery(coverage, controller.signal);
        if (controller.signal.aborted) { loadedImagery.bitmap.close(); return; }
        setImagery(loadedImagery); setImageryStatus('Satellite imagery · Esri, Maxar, Earthstar Geographics, and the GIS User Community');
      } catch { if (!controller.signal.aborted) setImageryStatus('Satellite imagery unavailable · elevation colors shown'); }
    }
    void loadWorld();
    return () => { controller.abort(); loadedImagery?.bitmap.close(); };
  }, [terrain]);
  useEffect(() => { dirty.current = true; }, [settings, result, progress, ash, flows, footprints, releaseHeightKm, settlingHours, deposits]);
  useEffect(() => {
    if (!canvas.current || result.unsupported || (!terrain && !procedural)) return;
    const element = canvas.current;
    let scene: ReturnType<typeof createEruptionScene>;
    try { scene = createEruptionScene(element, volcano, terrain, exaggeration); scene.setContours(contours); } catch { setError('3D rendering is unavailable. Enable WebGL in your browser or try another device. The geographic map and scenario results remain available below.'); return; }
    engine.current = scene; setReady(true); setError('');
    let raf = 0, previous = 0, lastUI = 0, lastCounts = 0, visible = true, lost = false;
    clock.current = current.current.progress;
    const markDirty = () => { dirty.current = true; };
    scene.controls.addEventListener('change', markDirty);
    const observer = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; if (width && height) { scene.resize(width, height); dirty.current = true; } }); observer.observe(element);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; previous = 0; dirty.current = true; }); intersection.observe(element);
    const onLost = (event: Event) => { event.preventDefault(); lost = true; setPlaying(false); setReady(false); setError('The 3D graphics connection was interrupted. Reload the 3D view to continue; your scenario settings are unchanged.'); };
    element.addEventListener('webglcontextlost', onLost);
    function tick(timestamp: number) {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden || lost) { previous = 0; return; }
      const state = current.current;
      const delta = previous ? Math.min((timestamp - previous) / 1000, .1) : 0; previous = timestamp;
      let time = clock.current;
      if (state.playing) {
        time = Math.min(100, time + delta * state.speed * 100 / 30);
        if (timestamp - lastUI > 80 || time === 100) { current.current.progress = time; setProgress(time); lastUI = timestamp; }
        clock.current = time; dirty.current = true;
        if (time === 100) { current.current.playing = false; setPlaying(false); }
      } else { time = state.progress; clock.current = time; }
      if (state.playing || dirty.current) {
        const counts = scene.update({ ...state, progress: time / 100 } as EruptionFrame); scene.render();
        if (terrain && (!state.playing || timestamp - lastCounts > 150)) { setAshCounts(counts); lastCounts = timestamp; }
        dirty.current = false;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); intersection.disconnect(); element.removeEventListener('webglcontextlost', onLost); scene.controls.removeEventListener('change', markDirty); scene.dispose(); engine.current = null; };
  }, [volcano.id, retry, result.unsupported, terrain, procedural, exaggeration]);
  useEffect(() => { engine.current?.setWorldSurface(surroundings, imagery, satellite); dirty.current = true; }, [surroundings, imagery, satellite, terrain, exaggeration, retry]);
  useEffect(() => { engine.current?.setContours(contours); dirty.current = true; }, [contours]);
  function cameraAction(action: 'resetCamera' | 'topView' | 'zoom' | 'orbit', value = 1) { const scene = engine.current; if (!scene) return; scene[action](value); dirty.current = true; }
  const eruptionFraction = progress / 100 * totalHours / settings.duration;
  const stage = progress === 100 ? 'Playback complete' : progress === 0 ? 'Before eruption' : eruptionFraction > 1 ? 'Post-eruption settling' : eruptionFraction < .2 ? 'Eruption onset' : eruptionFraction < .75 ? 'Sustained eruption' : 'Late eruption';
  return <section className="eruption-view" aria-labelledby="eruption-heading">
    <div className="eruption-heading"><div><h2 id="eruption-heading">Eruption in 3D</h2><p>{volcano.name} · {result.preset} illustration · {volcano.lat.toFixed(3)}°, {volcano.lon.toFixed(3)}°</p></div><span>Interactive scene</span></div>
    {result.unsupported ? <div className="eruption-fallback"><h3>Underwater eruption not modeled in 3D</h3><p>This catalog entry is submarine or below sea level. The terrestrial scene cannot represent underwater processes or tsunamis. Select a terrestrial volcano to explore the 3D illustration.</p></div> : <>
      <div className="eruption-inputs" aria-label="Live eruption conditions">
        <label><span>Explosivity <output>VEI {settings.vei}</output></span><input type="range" aria-label="3D explosivity (VEI)" min="0" max="8" step="1" value={settings.vei} onChange={event => onSettings({ ...settings, vei: Number(event.target.value) })}/></label>
        <label><span>Wind speed <output>{settings.wind} km/h</output></span><input type="range" aria-label="3D wind speed" min="0" max="120" step="1" value={settings.wind} onChange={event => onSettings({ ...settings, wind: Number(event.target.value) })}/></label>
        <label><span>Wind toward <output>{settings.direction}° from north</output></span><input type="range" aria-label="3D wind direction" min="0" max="359" step="1" value={settings.direction} onChange={event => onSettings({ ...settings, direction: Number(event.target.value) })}/></label>
      </div>
      <div className="terrain-controls">
        <label>Terrain coverage<select aria-label="Terrain coverage" value={widthKm} onChange={event => setWidthKm(Number(event.target.value))}><option value="10">10 × 10 km</option><option value="20">20 × 20 km</option><option value="40">40 × 40 km</option></select></label>
        <label>Vertical scale<select aria-label="Vertical scale" value={exaggeration} onChange={event => setExaggeration(Number(event.target.value))}><option value="1">1× · true scale</option><option value="2">2× · exaggerated</option><option value="3">3× · exaggerated</option></select></label>
        <span>{terrain ? 'Geographic elevation model' : procedural ? 'Procedural preview · no measured terrain' : terrainError ? 'Geographic terrain unavailable' : 'Loading geographic terrain'}</span>
        {procedural && <button className="secondary" onClick={() => setProcedural(false)}>Load geographic terrain</button>}
      </div>
      {terrain && <div className="terrain-summary"><p><strong>{widthKm} × {widthKm} km</strong> centered on catalog coordinates · mesh spacing {terrain.spacingM.toFixed(0)} m · tile pixels ≈{terrain.sourcePixelM.toFixed(0)} m (not accuracy)</p><p>Elevation range {terrain.min.toFixed(0)}–{terrain.max.toFixed(0)} m · DEM at vent {sampleTerrain(terrain, 0, 0)!.toFixed(0)} m · catalog elevation {volcano.elevation === null ? 'unknown' : `${volcano.elevation} m`}</p><p>Historical composite DEM; capture dates and vertical datums vary. Historical imagery may include clouds and baked-in shadows; elevation colors are available in Ground surface. North arrow lies on the terrain.</p></div>}
      {terrain && <div className="world-surface-controls"><label>Ground surface<select aria-label="Ground surface" value={satellite ? 'satellite' : 'elevation'} onChange={event => setSatellite(event.target.value === 'satellite')}><option value="satellite">Satellite imagery</option><option value="elevation">Elevation colors</option></select></label><div><p role="status">{worldStatus}</p><p>{satellite ? imageryStatus : 'Elevation colors · relative to the simulation patch'}</p><a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noreferrer">Imagery sources and credits</a></div></div>}
      {terrain && (!satellite || !imagery) && <div className="terrain-legend" aria-label="Terrain elevation colors"><span>Elevation</span><span>{terrain.min.toFixed(0)} m</span><i aria-hidden="true"/><span>{terrain.max.toFixed(0)} m</span><label><input type="checkbox" checked={contours} onChange={event => setContours(event.target.checked)}/> Contour lines · {Math.max(100, Math.ceil((terrain.max - terrain.min) / 1200) * 100)} m</label></div>}
      {terrain && satellite && imagery && <label className="world-contours"><input type="checkbox" checked={contours} onChange={event => setContours(event.target.checked)}/> Contour lines · {Math.max(100, Math.ceil((terrain.max - terrain.min) / 1200) * 100)} m</label>}
      <div className="eruption-stage">
        <canvas key={retry} ref={canvas} tabIndex={0} onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={event => { if (Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) < 5) { const point = engine.current?.inspect(event.clientX, event.clientY); if (point) { setProbe(point); dirty.current = true; } } }} aria-label={`Interactive 3D eruption at ${volcano.name}. Drag to orbit. Arrow left and right rotate; plus and minus zoom. Home resets the camera.`} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', '+', '=', '-', 'Home'].includes(event.key)) { event.preventDefault(); if (event.key === 'Home') cameraAction('resetCamera'); else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') cameraAction('orbit', event.key === 'ArrowLeft' ? -.15 : .15); else cameraAction('zoom', event.key === '-' ? 1.12 : .88); } }}/>
        {!error && ready && <><div className="scene-status"><strong>{stage}</strong><span>VEI {settings.vei} · wind {settings.wind} km/h toward {settings.direction}°</span></div><div className="scene-hint">{terrain ? 'Click terrain to inspect · drag to orbit · pinch/scroll to zoom' : 'Drag to orbit · pinch/scroll to zoom'}</div><div className="camera-tools" aria-label="3D camera controls"><button aria-label="Rotate camera left" onClick={() => cameraAction('orbit', -.3)}><RotateCcw size={17}/></button><button aria-label="Rotate camera right" onClick={() => cameraAction('orbit', .3)}><RotateCw size={17}/></button><button aria-label="Zoom into 3D view" onClick={() => cameraAction('zoom', .8)}><Plus size={17}/></button><button aria-label="Zoom out of 3D view" onClick={() => cameraAction('zoom', 1.2)}><Minus size={17}/></button><button aria-label="Top view" onClick={() => cameraAction('topView')}><Maximize2 size={17}/></button><button aria-label="Reset 3D camera" title="Landscape view" onClick={() => cameraAction('resetCamera')}><RotateCcw size={17}/></button></div></>}
        {loadingTerrain && <div className="eruption-fallback" role="status"><h3>Loading geographic terrain…</h3><p>Fetching elevation tiles for a {widthKm} km patch around {volcano.name}.</p></div>}
        {terrainError && !procedural && <div className="eruption-fallback" role="status"><h3>Geographic terrain unavailable</h3><p>{terrainError} Check your connection and retry. No procedural terrain has been substituted.</p><button className="secondary" onClick={() => setTerrainRetry(value => value + 1)}>Retry terrain</button> <button className="secondary" onClick={() => setProcedural(true)}>Use procedural preview</button></div>}
        {error && <div className="eruption-fallback" role="status"><h3>3D view unavailable</h3><p>{error}</p><button className="secondary" onClick={() => { setReady(false); setError(''); setRetry(value => value + 1); }}>Reload 3D view</button></div>}
      </div>
      {terrain && <div className="terrain-inspection" aria-live="polite"><strong>Terrain inspection</strong>{probe && <span>{probe.lat.toFixed(5)}°, {probe.lon.toFixed(5)}° · {probe.elevation.toFixed(0)} m elevation · {probe.slope.toFixed(1)}° sampled slope</span>}<button className="text-button" onClick={() => { setProbe(engine.current?.inspectVent() ?? terrainProbe(terrain, 0, 0)); dirty.current = true; }}>Inspect vent</button><span>Click or tap inside the simulation patch to inspect. Surroundings are visual context; slope uses the unexaggerated DEM.</span></div>}
      {terrain && <div className="ash-settling-controls"><label><span>Ash release height above vent <output>{releaseHeightKm.toFixed(1)} km</output></span><input aria-label="Ash release height" type="range" min=".5" max="8" step=".5" value={releaseHeightKm} onChange={event => setReleaseHeightKm(Number(event.target.value))}/></label><label>After eruption<select aria-label="Post-eruption settling duration" value={settlingHours} onChange={event => setSettlingHours(Number(event.target.value))}><option value="6">6 h of settling</option><option value="12">12 h of settling</option><option value="24">24 h of settling</option></select></label></div>}
      <div className="eruption-playback"><button className="primary" disabled={!ready || !!error} onClick={() => { if (progress >= 100) { seek(0); } setPlaying(value => !value); }}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Pause eruption' : progress >= 100 ? 'Replay eruption' : 'Play eruption'}</button><button className="secondary" disabled={!ready || !!error} onClick={() => { setPlaying(false); seek(0); }}>Restart</button><label className="eruption-timeline"><span>Illustrative timeline <output>{(progress / 100 * totalHours).toFixed(1)} / {totalHours} h</output></span><input aria-label="Eruption timeline" type="range" min="0" max="100" step=".1" value={progress} disabled={!ready || !!error} onChange={event => { setPlaying(false); seek(Number(event.target.value)); }}/></label><label className="playback-speed">Speed<select aria-label="Eruption playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div>
      {terrain && <div className="ash-counts" aria-label="Ash tracer counts"><span>Airborne <strong data-testid="ash-airborne">{ashCounts.airborne}</strong></span><span>Deposited <strong data-testid="ash-deposited">{ashCounts.deposited}</strong></span><span>Left terrain patch <strong data-testid="ash-outside">{ashCounts.outside}</strong></span><span>Not yet released <strong>{ashCounts.pending}</strong></span><small>1,000 illustrative tracers · counts are not ash mass or thickness. Eruption ends at {settings.duration} h.</small></div>}
      <div className="eruption-layers" aria-label="3D scene layers"><label><input type="checkbox" checked={ash} onChange={event => setAsh(event.target.checked)}/> Ash plume</label><label><input type="checkbox" disabled={!!terrain} checked={flows && !terrain} onChange={event => setFlows(event.target.checked)}/> {terrain ? 'Hot flows unavailable on DEM' : result.preset === 'Effusive' ? 'Lava & hot flows' : 'Hot flows'}</label>{terrain && <label><input type="checkbox" checked={deposits} onChange={event => setDeposits(event.target.checked)}/> Settled ash</label>}<label><input type="checkbox" checked={footprints} onChange={event => setFootprints(event.target.checked)}/> Hazard outlines</label>{footprints && <span>Ochre: ash · red: pyroclastic · blue: lahar</span>}</div>
    </>}
    {terrain && <details className="terrain-provenance ash-assumptions"><summary>Ash settling assumptions</summary><p>Grains descend at size-dependent terminal speed while constant horizontal wind carries them. Contact with the sampled DEM stops each tracer; deposits persist. Crossing the terrain edge marks a tracer as outside, not deposited or safe. Scrubbing recomputes the same deterministic history.</p><p>Equal visual samples of {GRAIN_SIZES_UM.join(', ')} µm grains; approximate fall speeds {GRAIN_SIZES_UM.map(size => `${size} µm: ${terminalFallSpeed(size).toFixed(2)} m/s`).join(' · ')}. Spherical particles, density 2,300 kg/m³, standard air density 1.225 kg/m³ and viscosity 1.81×10⁻⁵ Pa·s; Schiller–Naumann drag below Reynolds number 1,000, constant drag above.</p><p>Release height is an assumption, not inferred from VEI. A 20 m/s mean column ascent sets the initial downwind offset; tracers begin at column top. Release is uniform during the selected eruption duration. No vertical wind, weather layers, turbulence, aggregation, rainfall scavenging, particle-shape effects, resuspension, or loading calculation. Coarse DEM cells can miss narrow terrain features. Fine ash can remain airborne beyond this playback window.</p></details>}
    {terrain && <details className="terrain-provenance"><summary>Elevation data sources and limits</summary><p>Mapzen / Tilezen terrain tiles, hosted on AWS Open Data. Retrieved {new Date(terrain.retrieved).toLocaleDateString()}; retrieval date is not the survey date. Sampled into a {terrain.size} × {terrain.size} local equidistant grid with bilinear interpolation. Original source resolution and vertical accuracy vary.</p><p>Tile source records: {terrain.sources.join('; ')}</p><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Dataset description</a> · <a href={`${import.meta.env.BASE_URL}terrain/ATTRIBUTION.md`} target="_blank" rel="noreferrer">Full provider attribution</a><p>USGS SRTM / GMTED2010 / 3DEP and other regional providers; full credits linked above. No roads, buildings, live observations, or validated flow routing are included.</p></details>}
    <p className="eruption-limits">{terrain ? `Terrain is sampled from geographic elevation tiles. Simulation coverage is ${widthKm} km across; surrounding terrain is visual context only; vertical exaggeration is ${exaggeration}×. Hazard outlines use model distances in kilometers and are clipped at the patch edge; they do not represent terrain-routed flows. Stylized ground flows are disabled because no validated terrain-flow solver is present. The plume is illustrative; settling uses a simplified particle transport model, not a validated ashfall forecast.` : procedural ? `Procedural terrain based on volcano type, not a measured reconstruction of ${volcano.name}. Plume and flow paths remain illustrative.` : 'No terrain is currently displayed. Load elevation data or explicitly choose a procedural preview.'} Playback compresses the displayed time window into 30 seconds at 1×.</p>

  </section>;
}
