import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { ArrowDown, ArrowRight, Check, Crosshair, Expand, Globe2, HelpCircle, MapPin, Minus, Plus, Search, Shrink, X } from 'lucide-react';
import world from './data/world.json';
import type { Volcano } from './model';
import './globalMap.css';

// Operate: extend the Mineral Field Atlas with direct search, familiar map controls,
// regional wayfinding, and a persistent geographic overview. Catalog facts stay intact.
const projection = geoNaturalEarth1().fitExtent([[20, 35], [960, 495]], world as never);
const path = geoPath(projection);
const land = path(world as never) || '';
const grid = path(geoGraticule10()) || '';
const home = { x: 490, y: 265, zoom: 1 };
const regions = [
  { name: 'North America', lon: -110, lat: 40, zoom: 2.8 },
  { name: 'South America', lon: -70, lat: -22, zoom: 3.4 },
  { name: 'Europe', lon: 15, lat: 49, zoom: 4 },
  { name: 'Africa', lon: 25, lat: 0, zoom: 3 },
  { name: 'Asia', lon: 105, lat: 35, zoom: 2.8 },
  { name: 'Oceania', lon: 150, lat: -24, zoom: 3.2 },
].map(region => ({ ...region, point: projection([region.lon, region.lat])! }));
const continentLabels = [
  { name: 'NORTH AMERICA', lon: -108, lat: 45 },
  { name: 'SOUTH AMERICA', lon: -60, lat: -18 },
  { name: 'EUROPE', lon: 22, lat: 52 },
  { name: 'AFRICA', lon: 18, lat: 10 },
  { name: 'ASIA', lon: 86, lat: 44 },
  { name: 'AUSTRALIA', lon: 134, lat: -25 },
].map(label => ({ ...label, point: projection([label.lon, label.lat])! }));
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const coordinates = (lat: number, lon: number) => `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`;

interface Props {
  volcanoes: Volcano[]; selected: Volcano; onSelect: (v: Volcano) => void; onReadDescription: () => void;
  query: string; onQuery: (value: string) => void; expanded: boolean; onExpand: () => void;
  country: string; countries: string[]; onCountry: (value: string) => void; onClearFilters: () => void;
}

export default function GlobalMap({ volcanoes, selected, onSelect, onReadDescription, query, onQuery, expanded, onExpand, country, countries, onCountry, onClearFilters }: Props) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const searchWrap = useRef<HTMLDivElement>(null);
  const previousCountry = useRef(country);
  const [size, setSize] = useState({ width: 640, height: 440 });
  const [camera, setCamera] = useState(home);
  const [showGrid, setShowGrid] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [hover, setHover] = useState<Volcano | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; camera: typeof camera; moved: boolean; distance: number } | null>(null);

  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width && entry.contentRect.height) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Close after the outside click completes. Closing on blur would move the
    // inline phone results before the user's intended button receives its click.
    const dismiss = (event: MouseEvent) => {
      if (!searchWrap.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('click', dismiss);
    return () => document.removeEventListener('click', dismiss);
  }, []);

  const baseScale = Math.min(size.width / 980, size.height / 530);
  const scale = baseScale * camera.zoom;
  const tx = size.width / 2 - camera.x * scale, ty = size.height / 2 - camera.y * scale;
  const points = useMemo(() => volcanoes.map(v => ({ v, p: projection([v.lon, v.lat])! })), [volcanoes]);
  const visible = points.filter(({ p }) => p[0] * scale + tx >= 0 && p[0] * scale + tx <= size.width && p[1] * scale + ty >= 0 && p[1] * scale + ty <= size.height);
  const matches = candidates.map(candidate => volcanoes.find(v => v.id === candidate)).filter((v): v is Volcano => !!v);
  const selectedPoint = points.find(p => p.v.id === selected.id);
  const selectedVisible = visible.some(p => p.v.id === selected.id);
  const filtered = !!(query.trim() || country);
  const suggestions = useMemo(() => {
    const value = normalize(query);
    const rank = (v: Volcano) => normalize(v.name) === value ? 0 : normalize(v.name).startsWith(value) ? 1 : normalize(v.name).includes(value) ? 2 : 3;
    return [...volcanoes].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 8);
  }, [volcanoes, query]);
  const resultsOpen = searchOpen && !!query.trim();
  const activeIndex = searchIndex < suggestions.length ? searchIndex : -1;
  const center = projection.invert?.([camera.x, camera.y]);

  function bound(next: typeof camera) {
    const zoom = Math.max(1, Math.min(12, next.zoom));
    const halfWidth = Math.min(490, size.width / (2 * baseScale * zoom));
    const halfHeight = Math.min(265, size.height / (2 * baseScale * zoom));
    return { x: Math.max(halfWidth, Math.min(980 - halfWidth, next.x)), y: Math.max(halfHeight, Math.min(530 - halfHeight, next.y)), zoom };
  }
  const currentRegion = camera.zoom === 1 ? 'world' : regions.find(region => {
    const target = bound({ x: region.point[0], y: region.point[1], zoom: region.zoom });
    return Math.abs(target.x - camera.x) < .01 && Math.abs(target.y - camera.y) < .01 && target.zoom === camera.zoom;
  })?.name || 'custom';

  function zoomBy(factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    setHover(null);
    setCamera(current => {
      const next = Math.max(1, Math.min(12, current.zoom * factor));
      const oldScale = baseScale * current.zoom;
      return bound({ x: current.x + (anchor.x - size.width / 2) / oldScale * (1 - current.zoom / next), y: current.y + (anchor.y - size.height / 2) / oldScale * (1 - current.zoom / next), zoom: next });
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

  function reset() { setCamera(home); setCandidates([]); setHover(null); }
  function focusVolcano(volcano: Volcano) {
    const point = projection([volcano.lon, volcano.lat])!;
    setCamera(bound({ x: point[0], y: point[1], zoom: 6 }));
    setHover(null);
  }
  function selectResult(volcano: Volcano) {
    onSelect(volcano);
    focusVolcano(volcano);
    setSearchOpen(false);
    setCandidates([]);
    svg.current?.focus({ preventScroll: true });
  }
  function fitMatches(targets = points) {
    if (!targets.length) return;
    const xs = targets.map(p => p.p[0]), ys = targets.map(p => p.p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const fit = Math.min((size.width - 100) / Math.max(20, x1 - x0), (size.height - 100) / Math.max(20, y1 - y0));
    setCamera(bound({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom: fit / baseScale }));
    setHover(null);
  }
  useEffect(() => {
    if (previousCountry.current === country) return;
    previousCountry.current = country;
    fitMatches();
    setCandidates([]);
  }, [country, points]);

  function nearby(x: number, y: number, radius = 24) {
    return visible.map(p => ({ ...p, distance: Math.hypot(p.p[0] * scale + tx - x, p.p[1] * scale + ty - y) })).filter(p => p.distance <= radius).sort((a, b) => a.distance - b.distance);
  }
  function inspect(x: number, y: number, radius = 24) {
    const near = nearby(x, y, radius);
    setCandidates(near.length > 1 ? near.map(p => p.v.id) : []);
    if (near.length) onSelect(near[0].v);
    setHover(null);
  }
  function local(e: { clientX: number; clientY: number }) {
    const rect = svg.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function startGesture() {
    const p = [...pointers.current.values()];
    if (!p.length) { gesture.current = null; return; }
    gesture.current = { x: p.length > 1 ? (p[0].x + p[1].x) / 2 : p[0].x, y: p.length > 1 ? (p[0].y + p[1].y) / 2 : p[0].y, camera, moved: p.length > 1, distance: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 };
  }
  function clearFilters() { onClearFilters(); setSearchOpen(false); reset(); }

  return <>
    <div className="atlas-toolbar">
      <div className="atlas-search-wrap" ref={searchWrap}>
        <div className="atlas-search">
          <Search size={18} aria-hidden="true" />
          <input ref={search} role="combobox" aria-label="Search map volcanoes" aria-autocomplete="list" aria-expanded={resultsOpen} aria-controls={`${id}-results`} aria-activedescendant={resultsOpen && activeIndex >= 0 ? `${id}-result-${activeIndex}` : undefined} autoComplete="off" placeholder="Search volcanoes, countries…" value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={event => { onQuery(event.target.value); setSearchOpen(true); setSearchIndex(-1); setCandidates([]); }}
            onKeyDown={event => {
              if (event.key === 'Tab') setSearchOpen(false);
              else if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); }
              else if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestions.length && query.trim()) {
                event.preventDefault(); setSearchOpen(true);
                const next = event.key === 'ArrowDown' ? (activeIndex + 1) % suggestions.length : (activeIndex <= 0 ? suggestions.length : activeIndex) - 1;
                setSearchIndex(next);
                document.getElementById(`${id}-result-${next}`)?.scrollIntoView({ block: 'nearest' });
              } else if (event.key === 'Enter' && resultsOpen && suggestions.length) { event.preventDefault(); selectResult(suggestions[Math.max(0, activeIndex)]); }
            }} />
          {query && <button aria-label="Clear map search" onClick={() => { onQuery(''); setSearchIndex(-1); search.current?.focus(); }}><X size={16} /></button>}
        </div>
        {resultsOpen && <div className="atlas-search-results">
          <p role="status">{points.length ? `${points.length.toLocaleString()} ${points.length === 1 ? 'match' : 'matches'}${points.length > suggestions.length ? ` · first ${suggestions.length} shown` : ''}` : 'No volcanoes found'}</p>
          <div id={`${id}-results`} role="listbox" aria-label="Matching volcanoes">
            {suggestions.map((volcano, index) => <button key={volcano.id} id={`${id}-result-${index}`} role="option" aria-selected={activeIndex === index} tabIndex={-1} onPointerDown={event => event.preventDefault()} onClick={() => selectResult(volcano)}>
              <MapPin size={16} aria-hidden="true" /><span><strong>{volcano.name}</strong><small>{volcano.country} · {volcano.type}</small></span><ArrowRight size={15} aria-hidden="true" />
            </button>)}
          </div>
          {!points.length && <span className="atlas-search-no-results">Try a name like Merapi, or clear your filters.</span>}
        </div>}
      </div>
      <select className="atlas-country" aria-label="Map country filter" value={country} onChange={event => onCountry(event.target.value)}><option value="">All countries</option>{countries.map(name => <option key={name}>{name}</option>)}</select>
      <button className="secondary atlas-fit" disabled={!points.length} onClick={() => { fitMatches(); setSearchOpen(false); }} title="Show all matching volcanoes"><Crosshair size={16} /> Fit matches</button>
    </div>
    <div className="atlas-viewbar">
      <label className="atlas-region"><Globe2 size={16} aria-hidden="true" /><span className="sr-only">Jump to region</span><select value={currentRegion} onChange={event => {
        if (event.target.value === 'world') reset();
        else { const region = regions.find(item => item.name === event.target.value)!; setCamera(bound({ x: region.point[0], y: region.point[1], zoom: region.zoom })); setCandidates([]); setHover(null); }
      }}><option value="world">World view</option>{regions.map(region => <option key={region.name}>{region.name}</option>)}<option value="custom" disabled>Custom view</option></select></label>
      <div className="atlas-view-actions"><label><input type="checkbox" checked={showGrid} onChange={event => setShowGrid(event.target.checked)} /> Grid</label><button aria-expanded={showHelp} aria-controls={`${id}-guide`} onClick={() => setShowHelp(value => !value)}><HelpCircle size={16} /> Map guide</button></div>
    </div>
    <div className="global-map-stage">
      <svg ref={svg} className={`global-map-canvas${hover ? ' has-marker-hover' : ''}`} viewBox={`0 0 ${size.width} ${size.height}`} role="group" tabIndex={0} aria-label="Interactive global volcano map" aria-describedby={`${id}-help`}
        onDoubleClick={event => { event.preventDefault(); zoomBy(2, local(event)); }}
        onKeyDown={event => {
          const moves: Record<string, [number, number]> = { ArrowLeft: [-45, 0], ArrowRight: [45, 0], ArrowUp: [0, -45], ArrowDown: [0, 45] };
          if (moves[event.key]) { event.preventDefault(); const [x, y] = moves[event.key]; setCamera(current => bound({ ...current, x: current.x + x / scale, y: current.y + y / scale })); setHover(null); }
          else if (['+', '=', '-', 'Home', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
            if (event.key === 'Home') reset();
            else if (event.key === 'Enter') inspect(size.width / 2, size.height / 2);
            else if (event.key === 'Escape') { setCandidates([]); setHover(null); }
            else zoomBy(event.key === '-' ? 1 / 1.5 : 1.5);
          }
        }}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, local(event)); startGesture(); setHover(null);
        }}
        onPointerMove={event => {
          const pos = local(event);
          if (!pointers.current.has(event.pointerId)) { setHover(nearby(pos.x, pos.y)[0]?.v || null); return; }
          pointers.current.set(event.pointerId, pos);
          const current = gesture.current;
          if (!current) return;
          const p = [...pointers.current.values()];
          const mid = p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0];
          const distance = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
          if (Math.hypot(mid.x - current.x, mid.y - current.y) > 4 || distance > 0) current.moved = true;
          if (!current.moved) return;
          const zoom = Math.max(1, Math.min(12, current.camera.zoom * (current.distance ? distance / current.distance : 1)));
          setCamera(bound({ x: current.camera.x + (current.x - size.width / 2) / (baseScale * current.camera.zoom) - (mid.x - size.width / 2) / (baseScale * zoom), y: current.camera.y + (current.y - size.height / 2) / (baseScale * current.camera.zoom) - (mid.y - size.height / 2) / (baseScale * zoom), zoom }));
        }}
        onPointerUp={event => {
          const current = gesture.current, pos = local(event);
          pointers.current.delete(event.pointerId);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (current && !current.moved) inspect(pos.x, pos.y, event.pointerType === 'touch' ? 32 : 24);
          startGesture(); if (gesture.current) gesture.current.moved = true;
        }}
        onPointerCancel={() => { pointers.current.clear(); gesture.current = null; }} onPointerLeave={() => setHover(null)}>
        <rect width={size.width} height={size.height} fill="#e7edeb" />
        <g transform={`translate(${tx},${ty}) scale(${scale})`}><path d={land} fill="#fbfcf8" stroke="#b7c8bc" strokeWidth={.8 / scale} />{showGrid && <path d={grid} fill="none" stroke="#c8d4cd" strokeWidth={.6 / scale} />}</g>
        {camera.zoom < 2 && size.width >= 480 && <g className="atlas-place-labels" aria-hidden="true" pointerEvents="none">{continentLabels.map(label => <text key={label.name} x={label.point[0] * scale + tx} y={label.point[1] * scale + ty} textAnchor="middle">{label.name}</text>)}</g>}
        {visible.filter(point => point.v.id !== selected.id).map(({ v, p }) => <circle key={v.id} data-volcano-id={v.id} cx={p[0] * scale + tx} cy={p[1] * scale + ty} r={hover?.id === v.id ? 7 : size.width < 480 && camera.zoom < 2 ? 3.2 : 4.5} fill={hover?.id === v.id ? '#b84e35' : '#527b65'} stroke="#fbfcf8" strokeWidth="1"><title>{v.name}, {v.country}</title></circle>)}
        {selectedPoint && selectedVisible && <g transform={`translate(${selectedPoint.p[0] * scale + tx},${selectedPoint.p[1] * scale + ty})`} pointerEvents="none"><circle r="12" fill="#b84e3518" stroke="#b84e35" strokeWidth="1.5" /><circle r="5" fill="#b84e35" stroke="white" strokeWidth="1.5" /><text className="atlas-marker-label" y="-20" textAnchor="middle">{selected.name}</text></g>}
        <path className="atlas-center" d={`M${size.width / 2 - 8} ${size.height / 2}h16M${size.width / 2} ${size.height / 2 - 8}v16`} stroke="#294e3e" strokeWidth="1" pointerEvents="none" />
      </svg>
      <div className="atlas-navigation" role="group" aria-label="Map navigation">
        <span className="atlas-north" aria-label="North is up">N<ArrowDown size={15} /></span>
        <div className="atlas-zoom-controls"><button aria-label="Zoom in" title="Zoom in (+)" disabled={camera.zoom >= 12} onClick={() => zoomBy(1.5)}><Plus size={19} /></button><span aria-label="Global map zoom">{camera.zoom.toFixed(1)}×</span><button aria-label="Zoom out" title="Zoom out (−)" disabled={camera.zoom <= 1} onClick={() => zoomBy(1 / 1.5)}><Minus size={19} /></button></div>
        <div className="atlas-view-controls"><button aria-label="Reset map zoom" title="World view (Home)" onClick={reset}><Globe2 size={19} /></button><button aria-label={expanded ? 'Collapse map' : 'Expand map'} title={expanded ? 'Collapse map' : 'Expand map'} aria-pressed={expanded} onClick={onExpand}>{expanded ? <Shrink size={18} /> : <Expand size={18} />}</button></div>
      </div>
      {hover && !matches.length && <div className="atlas-hover" aria-hidden="true"><MapPin size={16} /><div><strong>{hover.name}</strong><span>{hover.country} · Click to explore</span></div></div>}
      {!points.length && <div className="atlas-empty"><Search size={23} /><strong>No matching volcanoes</strong><p>Try another name or remove your filters to explore the world.</p><button className="secondary" onClick={clearFilters}>Clear filters</button></div>}
      {!!matches.length && <section className="atlas-pick-list" aria-label="Nearby volcanoes"><div className="atlas-pick-heading"><strong>{matches.length} nearby volcanoes</strong><button aria-label="Close map selection" onClick={() => { setCandidates([]); svg.current?.focus({ preventScroll: true }); }}><X size={16} /></button></div><p>Choose a volcano to preview.</p><ul>{matches.map(volcano => <li key={volcano.id}><button aria-pressed={volcano.id === selected.id} onClick={() => onSelect(volcano)}><span><strong>{volcano.name}</strong><small>{volcano.country} · {volcano.type}</small></span>{volcano.id === selected.id && <Check size={16} aria-label="Selected" />}</button></li>)}</ul><button className="atlas-nearby-zoom" onClick={() => fitMatches(points.filter(point => candidates.includes(point.v.id)))}><Plus size={15} /> Zoom to nearby</button></section>}
      <button className="atlas-locate" aria-label="Focus selected" disabled={!selectedPoint} title={selectedPoint ? `Center map on ${selected.name}` : 'Selected volcano is outside current filters'} onClick={() => { focusVolcano(selected); setCandidates([]); }}><Crosshair size={17} /><span>Locate {selected.name}</span></button>
      {camera.zoom > 1.05 && size.width >= 480 && <button className="atlas-overview" aria-label="Return to world view" title="Return to world view" onClick={reset}><svg viewBox="0 0 980 530" aria-hidden="true"><path d={land} fill="#fbfcf8" stroke="#a5b8ac" strokeWidth="5" /><rect x={Math.max(0, -tx / scale)} y={Math.max(0, -ty / scale)} width={Math.min(980, size.width / scale)} height={Math.min(530, size.height / scale)} fill="#294e3e15" stroke="#294e3e" strokeWidth="10" /></svg><span>World overview</span></button>}
    </div>
    <div className="atlas-map-summary"><div className="atlas-legend"><span><i /> Volcano</span><span><i className="atlas-selected-key" /> Selected</span></div><span className="atlas-visible-count">{visible.length.toLocaleString()} of {points.length.toLocaleString()} in view</span>{filtered && <button onClick={clearFilters}>Clear filters <X size={13} /></button>}</div>
    <p className="sr-only" role="status">Selected {selected.name}, {selected.country}. Description updated below the map.</p>
    <section className="atlas-description" aria-label={`Description of ${selected.name}`}>
      <div className="atlas-description-heading"><div><h3>{selected.name}</h3><span>{selected.country} · {coordinates(selected.lat, selected.lon)}</span></div><button className="text-button" onClick={onReadDescription}>Read full description <ArrowRight size={15} /></button></div>
      {!selectedPoint && <p className="atlas-selection-note">Outside current filters. <button onClick={clearFilters}>Show all volcanoes</button></p>}
      {selectedPoint && !selectedVisible && <p className="atlas-selection-note">Outside this map view. <button onClick={() => focusVolcano(selected)}>Locate {selected.name}</button></p>}
      <p>{selected.summary?.trim() || 'No geological summary is available in this catalog snapshot. Open the source record below for further information.'}</p>
    </section>
    <div className="atlas-map-footer"><span id={`${id}-help`}>Drag to pan · Pinch or double-click to zoom</span><a href="#volcano-catalog">Browse catalog <ArrowDown size={13} /></a></div>
    {showHelp && <div id={`${id}-guide`} className="atlas-map-help"><strong>Explore the atlas</strong><p>Click or tap a marker to select it. In crowded areas, choose from the nearby list or zoom closer. Search by name, country, region, or catalog number; use arrow keys and Enter to choose a result.</p><p>Drag to pan, pinch or double-click to zoom, or hold Ctrl/⌘ while scrolling. With the map focused: arrow keys pan, +/− zoom, Enter selects near the center, Home returns to the world, and Escape closes nearby choices.</p></div>}
    <div className="map-footer"><span>Natural Earth · approximate coastlines</span><span>{center && coordinates(center[1], center[0])} · map center</span></div>
  </>;
}
