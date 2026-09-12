import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { Crosshair, Expand, Minus, Plus, RotateCcw, Search, Shrink, X } from 'lucide-react';
import world from './data/world.json';
import type { Volcano } from './model';

const projection = geoNaturalEarth1().fitExtent([[20, 35], [960, 495]], world as never);
const path = geoPath(projection);
const land = path(world as never) || '';
const grid = path(geoGraticule10()) || '';
interface Props {
  volcanoes: Volcano[]; selected: Volcano; onSelect: (v: Volcano) => void; onReadDescription: () => void;
  query: string; onQuery: (value: string) => void; expanded: boolean; onExpand: () => void;
}
export default function GlobalMap({ volcanoes, selected, onSelect, onReadDescription, query, onQuery, expanded, onExpand }: Props) {
  const help = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 640, height: 400 });
  const [camera, setCamera] = useState({ x: 490, y: 265, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [hover, setHover] = useState<Volcano | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string>('');
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; camera: typeof camera; moved: boolean; distance: number } | null>(null);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const scale = Math.min(size.width / 980, size.height / 530) * camera.zoom;
  const tx = size.width / 2 - camera.x * scale, ty = size.height / 2 - camera.y * scale;
  const points = useMemo(() => volcanoes.map(v => ({ v, p: projection([v.lon, v.lat])! })), [volcanoes]);
  const visible = points.filter(({ p }) => p[0] * scale + tx >= 0 && p[0] * scale + tx <= size.width && p[1] * scale + ty >= 0 && p[1] * scale + ty <= size.height);
  const matches = candidates.map(id => volcanoes.find(v => v.id === id)).filter((v): v is Volcano => !!v);
  const selectedPoint = points.find(p => p.v.id === selected.id);
  const selectedVisible = visible.some(p => p.v.id === selected.id);
  const bound = (c: typeof camera) => ({ x: Math.max(0, Math.min(980, c.x)), y: Math.max(0, Math.min(530, c.y)), zoom: Math.max(1, Math.min(12, c.zoom)) });
  function zoomBy(factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    setCamera(c => {
      const next = Math.max(1, Math.min(12, c.zoom * factor));
      const oldScale = Math.min(size.width / 980, size.height / 530) * c.zoom;
      return bound({ x: c.x + (anchor.x - size.width / 2) / oldScale * (1 - c.zoom / next), y: c.y + (anchor.y - size.height / 2) / oldScale * (1 - c.zoom / next), zoom: next });
    });
  }
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * .003), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [size.width, size.height]);
  function reset() { setCamera({ x: 490, y: 265, zoom: 1 }); setCandidates([]); setHover(null); }
  function focusSelected() { if (selectedPoint) setCamera({ x: selectedPoint.p[0], y: selectedPoint.p[1], zoom: 6 }); }
  function fitMatches(targets = points) {
    if (!targets.length) return;
    const xs = targets.map(p => p.p[0]), ys = targets.map(p => p.p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const fit = Math.min((size.width - 60) / Math.max(20, x1 - x0), (size.height - 60) / Math.max(20, y1 - y0));
    setCamera(bound({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom: fit / Math.min(size.width / 980, size.height / 530) }));
  }
  function nearby(x: number, y: number, radius = 24) {
    return visible.map(p => ({ ...p, distance: Math.hypot(p.p[0] * scale + tx - x, p.p[1] * scale + ty - y) })).filter(p => p.distance <= radius).sort((a, b) => a.distance - b.distance);
  }
  function inspect(x: number, y: number, radius = 24) {
    const near = nearby(x, y, radius);
    setCandidates(near.length > 1 ? near.map(p => p.v.id) : []);
    if (near.length) onSelect(near[0].v);
    setHover(null);
  }
  function local(e: { clientX: number; clientY: number }) { const r = svg.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function startGesture() {
    const p = [...pointers.current.values()];
    if (!p.length) { gesture.current = null; return; }
    gesture.current = { x: p.length > 1 ? (p[0].x + p[1].x) / 2 : p[0].x, y: p.length > 1 ? (p[0].y + p[1].y) / 2 : p[0].y, camera, moved: p.length > 1, distance: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 };
  }
  return <>
    <div className="atlas-toolbar"><label className="atlas-search"><Search size={16}/><input aria-label="Search map volcanoes" placeholder="Find a volcano or region…" value={query} onChange={e => onQuery(e.target.value)}/>{query && <button aria-label="Clear map search" onClick={() => onQuery('')}><X size={15}/></button>}</label><button className="secondary" disabled={!points.length} onClick={() => fitMatches()}>Fit matches</button><button className="secondary" aria-label={expanded ? 'Collapse map' : 'Expand map'} aria-pressed={expanded} onClick={onExpand}>{expanded ? <Shrink size={16}/> : <Expand size={16}/>}</button></div>
    <div className="atlas-navigation"><div><button className="secondary" aria-label="Zoom in" disabled={camera.zoom >= 12} onClick={() => zoomBy(1.5)}><Plus size={16}/></button><button className="secondary" aria-label="Zoom out" disabled={camera.zoom <= 1} onClick={() => zoomBy(1 / 1.5)}><Minus size={16}/></button><button className="secondary" aria-label="Reset map zoom" onClick={reset}><RotateCcw size={16}/></button><button className="secondary" disabled={!selectedPoint} onClick={focusSelected}><Crosshair size={16}/> Focus selected</button></div><span aria-label="Global map zoom">{camera.zoom.toFixed(1)}×</span></div>
    <div className="global-map-stage">
      <svg ref={svg} className={`global-map-canvas${hover ? " has-marker-hover" : ""}`} viewBox={`0 0 ${size.width} ${size.height}`} role="group" tabIndex={0} aria-label="Interactive global volcano map" aria-describedby={help}
        onDoubleClick={e => { e.preventDefault(); zoomBy(2, local(e)); }}
        onKeyDown={e => {
          const moves: Record<string, [number, number]> = { ArrowLeft: [-45, 0], ArrowRight: [45, 0], ArrowUp: [0, -45], ArrowDown: [0, 45] };
          if (moves[e.key]) { e.preventDefault(); const [x, y] = moves[e.key]; setCamera(c => bound({ ...c, x: c.x + x / scale, y: c.y + y / scale })); }
          else if (['+', '=', '-', 'Home', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); if (e.key === 'Home') reset(); else if (e.key === 'Enter') inspect(size.width / 2, size.height / 2); else if (e.key === 'Escape') setCandidates([]); else zoomBy(e.key === '-' ? 1 / 1.5 : 1.5); }
        }}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, local(e)); startGesture(); setHover(null); }}
        onPointerMove={e => {
          const pos = local(e);
          if (!pointers.current.has(e.pointerId)) { setHover(nearby(pos.x, pos.y)[0]?.v || null); const c = projection.invert?.([(pos.x - tx) / scale, (pos.y - ty) / scale]); setCursor(c && Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180 ? `${c[1].toFixed(2)}°, ${c[0].toFixed(2)}°` : ''); return; }
          pointers.current.set(e.pointerId, pos); const g = gesture.current; if (!g) return;
          const p = [...pointers.current.values()]; const mid = p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0];
          const distance = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
          if (Math.hypot(mid.x - g.x, mid.y - g.y) > 4 || distance > 0) g.moved = true;
          if (!g.moved) return;
          const z = Math.max(1, Math.min(12, g.camera.zoom * (g.distance ? distance / g.distance : 1)));
          const base = Math.min(size.width / 980, size.height / 530);
          setCamera(bound({ x: g.camera.x + (g.x - size.width / 2) / (base * g.camera.zoom) - (mid.x - size.width / 2) / (base * z), y: g.camera.y + (g.y - size.height / 2) / (base * g.camera.zoom) - (mid.y - size.height / 2) / (base * z), zoom: z }));
        }}
        onPointerUp={e => { const g = gesture.current; const pos = local(e); pointers.current.delete(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (g && !g.moved) inspect(pos.x, pos.y, e.pointerType === 'touch' ? 32 : 24); startGesture(); if (gesture.current) gesture.current.moved = true; }}
        onPointerCancel={() => { pointers.current.clear(); gesture.current = null; }} onPointerLeave={() => { setHover(null); setCursor(''); }}>
        <rect width={size.width} height={size.height} fill="#e7edeb"/>
        <g transform={`translate(${tx},${ty}) scale(${scale})`}><path d={land} fill="#fbfcf8" stroke="#b7c8bc" strokeWidth={.8 / scale}/>{showGrid && <path d={grid} fill="none" stroke="#c8d4cd" strokeWidth={.6 / scale}/>}</g>
        {visible.filter(p => p.v.id !== selected.id).map(({ v, p }) => <circle key={v.id} data-volcano-id={v.id} cx={p[0] * scale + tx} cy={p[1] * scale + ty} r={hover?.id === v.id ? 7 : 5} fill={hover?.id === v.id ? '#b84e35' : '#527b65'} stroke="#fff" strokeWidth=".8"><title>{v.name}, {v.country}</title></circle>)}
        {selectedPoint && selectedVisible && <g transform={`translate(${selectedPoint.p[0] * scale + tx},${selectedPoint.p[1] * scale + ty})`}><circle r="12" fill="#b84e3518" stroke="#b84e35" strokeWidth="1.5"/><circle r="5" fill="#b84e35" stroke="white" strokeWidth="1.5"/></g>}
        <path className="atlas-center" d={`M${size.width / 2 - 8} ${size.height / 2}h16M${size.width / 2} ${size.height / 2 - 8}v16`} stroke="#294e3e" strokeWidth="1" pointerEvents="none"/>
      </svg>
      {hover && <div className="atlas-hover" aria-hidden="true"><strong>{hover.name}</strong><span>{hover.country} · {hover.type}</span></div>}
      {!points.length && <div className="atlas-empty">No matching volcanoes. Clear search or change the country filter below.</div>}
    </div>
    <div className="atlas-map-summary"><span><i/> Holocene volcano <i className="atlas-selected-key"/> Selected</span><label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)}/> Grid</label></div>
    <p className="sr-only" role="status">Selected {selected.name}, {selected.country}. Description updated below the map.</p>
    <p className="atlas-selection"><strong>{selected.name}</strong> · {selected.country}{!selectedPoint ? ' · outside current filters' : !selectedVisible ? ' · outside map view' : ''}<span>{visible.length.toLocaleString()} of {points.length.toLocaleString()} matches in view{cursor && ` · ${cursor}`}</span></p>
    <section className="atlas-description" aria-label={`Description of ${selected.name}`}>
      <h3>{selected.name}</h3>
      <p>{selected.summary?.trim() || 'No geological summary is available in this catalog snapshot. Open the source record below for further information.'}</p>
      <button className="secondary" onClick={onReadDescription}>Read full description</button>
    </section>
    {!!matches.length && <div className="atlas-pick-list"><div><strong>{matches.length === 1 ? 'Selected volcano' : `${matches.length} nearby volcanoes · choose another`}</strong><button aria-label="Close map selection" onClick={() => setCandidates([])}><X size={16}/></button></div><button className="secondary" onClick={() => fitMatches(points.filter(p => candidates.includes(p.v.id)))}>Zoom to nearby</button><ul>{matches.map(v => <li key={v.id}><button aria-pressed={v.id === selected.id} onClick={() => onSelect(v)}><strong>{v.name}{v.id === selected.id && " · Selected"}</strong><span>{v.country} · {v.type}</span></button></li>)}</ul></div>}
    <p id={help} className="atlas-map-help">Drag to pan · pinch or double-click to zoom · Ctrl/⌘ + scroll to zoom. Click or tap a marker to select and preview its description. In clusters, the nearest volcano is selected; choose a neighbor from the list. Keyboard: arrows pan, +/− zoom, Enter selects near center, Home resets. Search also filters the catalog below.</p>
    <div className="map-footer"><span>GLOBAL REFERENCE MAP</span><span>Natural Earth · approximate coastlines</span></div>
  </>;
}
