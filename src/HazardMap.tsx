import { useId, useMemo, useRef, useState } from 'react';
import { geoAzimuthalEquidistant, geoPath } from 'd3-geo';
import { Crosshair, Minus, Plus, RotateCcw } from 'lucide-react';
import world from './data/world.json';
import { type SimulationResult, type Volcano } from './model';
import { assessLocation, destination, earthRadius, relativeLocation, type Location } from './geography';

interface Props {
  volcano: Volcano; result: SimulationResult; direction: number;
  location?: Location | null; onLocation?: (location: Location) => void;
}
const layerNames = { ash: 'Ashfall', flow: 'Lava flow paths', pdc: 'Pyroclastic flows', gas: 'Toxic gases', lahar: 'Lahars' };

export function GeographicHazardMap(props: Props) {
  return <HazardMap key={props.volcano.id} {...props}/>;
}
function HazardMap({ volcano, result, direction, location, onLocation }: Props) {
  const id = useId();
  const [layers, setLayers] = useState({ ash: true, flow: true, pdc: true, gas: true, lahar: true });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<Location | null>(null);
  const [gasRadius, setGasRadius] = useState(5);
  const [lavaReach, setLavaReach] = useState(5);
  const [lavaBearing, setLavaBearing] = useState(180);
  const lavaPaths = useMemo(() => [-25, 0, 25].map((offset, index) => ({
    name: ['Left branch', 'Main path', 'Right branch'][index],
    points: Array.from({ length: 25 }, (_, step) => {
      const t = step / 24;
      return destination(volcano, lavaReach * t, lavaBearing + offset * t + Math.sin(t * Math.PI * 2) * 7);
    }),
  })), [volcano, lavaReach, lavaBearing]);
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const extent = Math.max(result.ash * 1.15, result.lahar * 1.2, result.pdc * 1.2, gasRadius * 1.3, lavaReach * 1.3, 10);
  const scale = 165 / extent * zoom;
  const cx = 300 + pan.x, cy = 210 + pan.y;
  const projection = useMemo(() => geoAzimuthalEquidistant().rotate([-volcano.lon, -volcano.lat]).translate([cx, cy]).scale(earthRadius * scale).clipAngle(179).clipExtent([[0, 0], [600, 420]]), [volcano.lon, volcano.lat, cx, cy, scale]);
  const coast = useMemo(() => geoPath(projection)(world as never) || '', [projection]);
  const selected = location === undefined ? picked : location;
  const point = selected ? relativeLocation(volcano, selected) : null;
  const check = selected ? assessLocation(volcano, selected, result, direction) : null;
  const px = cx + (point?.east || 0) * scale, py = cy - (point?.north || 0) * scale;
  const visible = point && px > 15 && px < 585 && py > 15 && py < 390;
  function pick(next: Location) { setPicked(next); onLocation?.(next); }
  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function changeZoom(amount: number) { setZoom(z => Math.max(.5, Math.min(8, z * amount))); }
  function screenPoint(svg: SVGSVGElement, x: number, y: number) {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(x, y).matrixTransform(matrix.inverse()) : null;
  }
  if (result.unsupported) return <div className="hazard-map-unavailable"><strong>Terrestrial hazard map unavailable</strong><p>This underwater setting requires a different model. Ashfall, flow and gas footprints cannot be assessed here.</p></div>;
  return <div className="interactive-hazard-map">
    <div className="hazard-layer-controls" role="group" aria-label="Map hazard layers">
      {(Object.keys(layerNames) as (keyof typeof layers)[]).map(key => <label key={key} className={`layer-${key}`}><input type="checkbox" checked={layers[key]} onChange={e => setLayers({ ...layers, [key]: e.target.checked })}/><i/>{layerNames[key]}</label>)}
    </div>
    <div className="hazard-map-tools"><div role="group" aria-label="Hazard map navigation">
      <button className="secondary" aria-label="Zoom into hazard map" disabled={zoom >= 8} onClick={() => changeZoom(1.5)}><Plus size={16}/></button>
      <button className="secondary" aria-label="Zoom out of hazard map" disabled={zoom <= .5} onClick={() => changeZoom(1 / 1.5)}><Minus size={16}/></button>
      <button className="secondary" aria-label="Reset hazard map" onClick={reset}><RotateCcw size={16}/></button>
      <button className="secondary" onClick={() => { pick(volcano); setPan({ x: 0, y: 0 }); }}><Crosshair size={16}/> Inspect vent</button>
    </div><span aria-label="Hazard map zoom">{zoom.toFixed(1)}×</span></div>
    <svg className="hazard-map interactive-map" viewBox="0 0 600 420" role="group" tabIndex={0} aria-label={`Interactive hazard map for ${volcano.name}`} aria-describedby={`${id}-help`}
      onKeyDown={e => {
        const shifts: Record<string, [number, number]> = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] };
        if (shifts[e.key]) { e.preventDefault(); const [x, y] = shifts[e.key]; setPan(p => ({ x: p.x + x, y: p.y + y })); }
        else if (['+', '=', '-', 'Home', 'Enter'].includes(e.key)) {
          e.preventDefault(); if (e.key === 'Home') reset(); else if (e.key === 'Enter') { const p = projection.invert?.([300, 210]); if (p) pick({ lon: p[0], lat: p[1] }); } else changeZoom(e.key === '-' ? 1 / 1.5 : 1.5);
        }
      }}
      onPointerDown={e => { if (e.button !== 0 || drag.current) return; const p = screenPoint(e.currentTarget, e.clientX, e.clientY); if (!p) return; drag.current = { id: e.pointerId, x: p.x, y: p.y, panX: pan.x, panY: pan.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const p = screenPoint(e.currentTarget, e.clientX, e.clientY); if (!p) return; const x = p.x - d.x, y = p.y - d.y; if (Math.hypot(x, y) > 5) d.moved = true; if (d.moved) setPan({ x: d.panX + x, y: d.panY + y }); }}
      onPointerUp={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); if (!d.moved) { const p = screenPoint(e.currentTarget, e.clientX, e.clientY); const loc = p && projection.invert?.([p.x, p.y]); if (loc && loc.every(Number.isFinite)) pick({ lon: loc[0], lat: loc[1] }); } }}
      onPointerCancel={() => { drag.current = null; }}>
      <defs><marker id={`${id}-lava-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b84e35"/></marker><pattern id={`${id}-gas`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#716294" strokeWidth="1" opacity=".4"/></pattern></defs>
      <rect width="600" height="420" fill="#e7edeb"/><path d={coast} fill="#fbfcf8" stroke="#b7c8bc"/>
      {[.5, 1].map(f => <g key={f}><circle cx={cx} cy={cy} r={extent * scale * f} fill="none" stroke="#b7c8bc" strokeDasharray="3 5"/></g>)}
      <path d={`M${cx} 0V420M0 ${cy}H600`} stroke="#b7c8bc" strokeWidth=".6"/>
      {layers.ash && <ellipse data-layer="ash" cx={cx} cy={cy - result.ash * scale / 2} rx={result.ash * scale * .22} ry={result.ash * scale / 2} transform={`rotate(${direction} ${cx} ${cy})`} fill="#bd8c4040" stroke="#a17b38" strokeWidth="2"/>}
      {layers.gas && <g data-layer="gas"><circle cx={cx} cy={cy} r={gasRadius * scale} fill={`url(#${id}-gas)`} stroke="#716294" strokeDasharray="2 4" strokeWidth="2"/></g>}
      {layers.lahar && <circle data-layer="lahar" cx={cx} cy={cy} r={result.lahar * scale} fill="none" stroke="#487d9a" strokeDasharray="7 5" strokeWidth="2"/>}
      {layers.pdc && <circle data-layer="pdc" cx={cx} cy={cy} r={result.pdc * scale} fill="#c7533615" stroke="#bd5137" strokeWidth="2"/>}
      {layers.flow && <g data-layer="flow">{lavaPaths.map(route => {
        const d = route.points.map((loc, i) => { const p = relativeLocation(volcano, loc); return `${i ? 'L' : 'M'}${cx + p.east * scale},${cy - p.north * scale}`; }).join(' ');
        return <g key={route.name}><path d={d} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"/><path data-lava-path={route.name} d={d} fill="none" stroke="#b84e35" strokeWidth="3" strokeLinecap="round" markerEnd={`url(#${id}-lava-arrow)`}><title>{route.name} · assumed lava path</title></path></g>;
      })}</g>}
      <path d={`M${cx - 10} ${cy + 7}l10-20 10 20z`} fill="#294a3b" stroke="#fff"/>
      {visible && <g transform={`translate(${px},${py})`}><circle r="6" fill="#293d35" stroke="white" strokeWidth="2"/><path d="M-12 0H12M0-12V12" stroke="#293d35"/></g>}
      <g className="map-annotations" pointerEvents="none"><rect x="12" y="12" width="210" height="27" rx="4" fill="#fbfcf8"/><text x="22" y="30" fontSize="12" fill="#456453">{volcano.name} · vent</text><text x="554" y="29" fontSize="14" fill="#456453">N ↑</text>
      <rect x="12" y="370" width="154" height="40" rx="4" fill="#fbfcf8"/><path d="M24 380v6h100v-6" fill="none" stroke="#456453"/><text x="24" y="402" fontSize="12" fill="#456453">{(100 / scale).toFixed(1)} km</text></g>
    </svg>
    <p id={`${id}-help`} className="hazard-map-help">Drag to pan · tap to inspect. Keyboard: arrows pan, +/− zoom, Enter inspects center, Home resets. Approximate coastline; no roads or terrain routing.</p>
    {layers.flow && <div className="flow-checkpoints"><strong>Lava flow path sketch</strong><span>Arrows show three assumed lava branches from the vent. Choose a heading and reach for your exercise; these are not terrain-routed predictions or observed lava fronts. Line width does not represent inundation width.</span>
      <div className="lava-path-controls"><label>Assumed lava heading <select value={lavaBearing} onChange={e => setLavaBearing(Number(e.target.value))}>{[0, 45, 90, 135, 180, 225, 270, 315].map(b => <option key={b} value={b}>{b}° · {({0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'} as Record<number, string>)[b]}</option>)}</select></label><label>Assumed lava reach <select value={lavaReach} onChange={e => setLavaReach(Number(e.target.value))}>{[1, 2, 5, 10, 20].map(km => <option key={km} value={km}>{km} km</option>)}</select></label></div>
      <div>{lavaPaths.map(route => <button key={route.name} className="secondary" onClick={() => { const next = route.points[route.points.length - 1]; pick(next); const p = relativeLocation(volcano, next); setPan({ x: -p.east * scale, y: p.north * scale }); }}>Inspect {route.name.toLowerCase()} end</button>)}</div>
      <span>Lava paths are independent of wind and the pyroclastic flow radius. No lava speed, arrival time, or exposure is calculated. Use official lava maps and access restrictions for recovery.</span>
    </div>}
    {layers.gas && <div className="gas-screen"><label>Gas screening radius <select value={gasRadius} onChange={e => setGasRadius(Number(e.target.value))}><option value={2}>2 km</option><option value={5}>5 km</option><option value={10}>10 km</option><option value={20}>20 km</option></select></label><p>Exercise assumption only. Hatching marks a review area, not measured SO₂ / CO₂, a plume prediction, or a safe boundary. Gas concentration and terrain pooling are not modeled.</p></div>}
    <div className="map-inspection" aria-live="polite">{selected && check ? <><strong>Inspection · {selected.lat.toFixed(4)}°, {selected.lon.toFixed(4)}°</strong><p>{check.distance.toFixed(1)} km from vent · bearing {check.bearing.toFixed(0)}°{!visible && ' · outside map view'}</p><p>Ashfall: {check.ash ? 'overlap' : 'no overlap'} · PDC: {check.pdc ? 'overlap' : 'no overlap'} · Lahar: {check.lahar ? 'overlap' : 'no overlap'} · Gas review: {check.distance <= gasRadius ? 'inside' : 'outside'} {gasRadius} km assumption.</p><p>Lava exposure not assessed. Envelope checks include hidden layers. Geometric overlap only; outside does not establish safety.</p></> : <><strong>Inspect a response location</strong><p>Select a map position or lava path end to review hazard overlap.</p></>}</div>
  </div>;
}
