# Ashline

Global volcano training studio for emergency teams and local residents. React, Vite, TypeScript. Real catalog metadata, **synthetic monitoring and illustrative models only**.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` creates a static deployable `dist/` directory. `npm test` checks model and catalog integrity. `npm run test:e2e` exercises desktop/mobile UI using installed Google Chrome on macOS; change the executable path in Playwright configuration for other platforms.

## Workflows

Search all 1,214 volcanoes; select a volcano; adjust synthetic conditions; inspect hazard envelopes; build a response plan; save locally, export JSON, or print. Operations and Community share the scenario. Browser-local saves contain settings and notes; clearing browser storage removes them. Export JSON for durable copies. Checklist marks are session-only.

## Scientific limits

Eruptions cannot currently be prevented. This software cannot predict an actual eruption, establish safety, issue an alert, or choose an evacuation route. The unrest score is a weighted educational index, not a probability. Its sensitivity band is not a confidence interval. Hazard envelopes use simple scaling without terrain, atmospheric dispersion, hydrology, exposure data, or scientific validation. Submarine processes and tsunamis are not modeled. Consult the responsible observatory and local authorities for real incidents.

Unrest weighting: seismicity 25%, tremor 25%, uplift 20%, SO₂ 20%, thermal anomaly 10%, normalized to control ranges. Hazard strength is `2^(VEI/2)` times a type factor (effusive 0.7, caldera 1.2, otherwise 1). Ash length scales with wind and square root of duration; pyroclastic radius scales with strength for VEI ≥2; lahar reach scales with strength and rainfall. These formulas are teaching assumptions, not published predictive relationships. Wind direction is the direction **toward which** ash travels, clockwise from north. Every catalog volcano is selectable; unknown types use the generic explosive preset and require expert interpretation.

## Data provenance

Smithsonian Global Volcanism Program Holocene Volcanoes, official GeoServer WFS snapshot retrieved 2026-09-07. All 1,214 returned features are included; count checked against service `totalFeatures`. This is a dated snapshot, not a permanent claim that no other applicable volcano exists. Each record links to its source page. Smithsonian retains rights in its metadata; preserve attribution when redistributing and review source terms for your intended use.

Endpoint: `https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application/json`

Refresh by downloading the endpoint JSON and running `node scripts/catalog.mjs /path/to/response.json`. Refresh rejects incomplete results. Natural Earth 110m land polygons are public domain, obtained from `nvkelso/natural-earth-vector/geojson/ne_110m_land.geojson`. Data and Manrope font are bundled for runtime network independence. Manrope is licensed under SIL OFL; license included with the font.

## Volcano information

The atlas displays each record’s attributed geological summary and snapshot date, with links to the Smithsonian record and weekly reports. General context explains the limitations associated with the volcano’s setting; it does not infer current activity or local hazard levels. Search accepts multiple terms, ignores case and accents, and covers names, countries, regions, types, IDs, and geological summaries. Previous/next controls make every result accessible in pages of 60.

The custom Ashline volcano-and-ash mark lives in `public/ashline.svg` and is shared by the sidebar and browser favicon.

## Geographic runs and mitigation

In **Scenario simulator**, adjust conditions, then use **What this eruption could mean** to enter an optional latitude/longitude, choose mitigation measures, and **Run scenario**. Each run records an immutable snapshot of the volcano metadata, inputs, geometric location overlaps, and selected plan. Change inputs and run again to compare distances and plans. Run comparisons survive navigation within the app but not a reload; **Export runs** downloads the full run bundle. This bundle is an analysis export, not a saved-scenario import file.

The local map uses an azimuthal equidistant projection centered on the volcano's catalog coordinates, with Natural Earth 110m coastlines for approximate context. Great-circle distances and initial bearings place locations, including across the date line. Ash uses the same downwind ellipse for display and overlap checks; pyroclastic and lahar distances remain circular proxies. Latitude and longitude locate the model; elevation and terrain do not alter its footprint. Small islands and fine coastline detail may be absent. No current monitoring, weather, roads, population, or terrain datasets were supplied. Mitigation selection records intended actions and qualitative benefits; it does not calculate risk percentages, casualties, damage, or protection achieved.

## Interactive 3D eruption

The simulator includes a lazy-loaded Three.js/WebGL scene. Drag to orbit, scroll or pinch to zoom, or use the labeled camera buttons. When the canvas has keyboard focus, left/right arrows rotate, +/− zoom, and Home resets the camera. Play/pause, restart, playback speed, and a timeline scrubber control the eruption and settling window; it starts paused and compresses the displayed window to 30 seconds at 1×. Rendering and playback suspend offscreen or when the browser tab is hidden. Scene resources are disposed on navigation.

VEI changes plume size; wind speed/direction bends ash. Geographic elevation terrain loads by default; an explicitly selected procedural preview remains available if elevation data cannot load. Stylized ground flows are disabled on the DEM because they do not model terrain-driven transport. Submarine entries display an explicit unsupported-state explanation. WebGL failure offers recovery while the 2D map and other workflows remain available.


## Geographic elevation terrain

The 3D view loads Mapzen/Tilezen Terrarium elevation tiles from the public AWS terrain dataset, centered on the selected GVP coordinates. Choose a 10, 20, or 40 km square patch; a 257 × 257 grid samples geodesic offsets with bilinear interpolation. Pixel centers and tile boundaries are handled explicitly, including longitude wrapping. RGB decoding is `(R * 256 + G + B / 256) - 32768` meters. Tiles use zoom 12 for 10/20 km patches and zoom 11 for 40 km; displayed mesh spacing is approximately 39/78/156 m, respectively. Tile pixel size is shown separately and is not an accuracy claim. Polar patches beyond Web Mercator coverage and patches needing over 64 tiles are rejected. Missing or invalid samples reject the entire patch; no fabricated elevations fill gaps.

True vertical scale is the default. 2×/3× vertical exaggeration changes display only; clicked elevation and slope use unexaggerated samples. The terrain's display baseline is its lowest sample, while readouts retain original source elevation values. The catalog coordinate anchors the vent; it is not snapped to the DEM maximum. DEM-at-vent and catalog elevations are shown together so differences are visible. Source datum, acquisition date, and quality vary across the composite; newer eruption morphology may be absent. Tint represents elevation rather than surveyed land cover.

Hazard outlines retain their existing kilometer distances at the fixed horizontal scale and clip at patch boundaries. Draping them over a DEM does not turn them into flow paths, inundation zones, or validated hazard predictions. Ash motion remains illustrative. No roads, population, buildings, live weather, or validated terrain-flow solver are included.

Twelve source tiles covering the default Merapi 20 km patch are bundled for offline startup. `public/terrain/manifest.json` records URLs, source raster identifiers, download time, and source modification headers. `python3 scripts/cache-terrain.py` refreshes this bounded cache. Other patches load directly from `https://elevation-tiles-prod.s3.amazonaws.com/terrarium` with four concurrent requests, 15-second tile timeouts, cancellation on selection changes, and a bounded memory cache. Public volcano coordinates determine requested tiles; no user-entered location is sent.

Sources: [AWS terrain dataset](https://registry.opendata.aws/terrain-tiles/), [Terrarium format](https://github.com/tilezen/joerd/blob/master/docs/formats.md). Merapi tiles identify USGS SRTM source `srtm/S08E110.tif`. Full regional provider attribution is bundled in `public/terrain/ATTRIBUTION.md` and linked in the scene. Download dates are not survey dates.


## Ash transport and settling

Geographic terrain enables a simplified Lagrangian tracer model. 1,000 visual tracers represent equal counts of 20, 63, 125, 250, and 1,000 µm spherical grains at 2,300 kg/m³. Terminal speeds solve buoyant weight against drag using fixed air density 1.225 kg/m³, viscosity 1.81e-5 Pa·s, gravity 9.80665 m/s², Schiller–Naumann drag below Reynolds number 1,000, and Cd=0.44 above. Grain classes are illustrative, not a measured grain-size or mass distribution. Counts do not estimate ash thickness, mass loading, or exposure.

User-selected release height (0.5–8 km above the DEM vent) is independent of VEI. A fixed 20 m/s assumed mean column ascent determines the initial downwind offset; trajectories start at column top with a deterministic 180 m source spread. Emission times are uniform over the eruption duration. Constant horizontal wind advects grains while terminal speed lowers altitude in source elevation units. Contact searches advance by at most half a DEM cell horizontally, 25 m vertically, or 60 seconds, split at DEM grid lines and solve the within-cell quadratic clearance for first contact, including grazing ridge intersections. Deposits remain fixed; tracers crossing the patch boundary are counted as outside, never as deposited.

The timeline includes 6, 12, or 24 hours after eruption ends. Fine ash can remain airborne or leave the patch; the model does not infer its eventual deposition beyond available terrain. Play, pause, scrub, restart, and condition changes reproduce deterministic particle histories. Vertical exaggeration changes visual height only, never transport or slope physics.

This is an educational transport approximation, not a validated ashfall forecast. It omits vertical winds, atmospheric layering, turbulence, nonspherical drag, aggregation, rainfall scavenging, resuspension, concentration/mass conservation, and measured emission rates. DEM resolution can miss narrow ridges and recent crater changes. The volumetric plume remains an illustration; its particles are not the settling tracer population.

## Aftermath response map

The simulator and response plan include an interactive geographic map with independently toggleable ashfall, lava path sketches, pyroclastic flow envelopes, lahar screening, and toxic-gas review layers. Drag to pan, use the zoom controls, or focus the map and use arrows, +/−, Home, and Enter to pan, zoom, reset, and inspect its center. Tap a position or inspect a lava path end for coordinates and geometric overlap. In the scenario lab, these selections update the coordinate fields and the location recorded in the next run.

Lava paths are three branching sketches from the vent, with an assumed main heading (default 180°) and reach (default 5 km). They are independent of VEI, wind, and the PDC radius, and are not terrain-routed paths, observations, or cleared access routes. They do not estimate lava inundation, speed, arrival time, or exposure. Gas hatching is a user-selected 2, 5, 10, or 20 km exercise review radius (default 5 km), independent of SO₂ emissions and wind. It is not a dispersion or concentration model and does not account for CO₂ pooling. Layer visibility, camera state, and gas review and lava sketch assumptions are local to each map and are not included in saved scenarios or run exports. Inspection checks hazard envelopes even when hidden; lava exposure is not assessed; absence of geometric overlap does not establish safety. Underwater settings suppress these terrestrial map layers.

Recovery checklist prompts cover qualified gas/oxygen monitoring and official re-entry clearance, ash cleanup and essential services, and reassessment of flow-damaged access and continuing lahar hazards. These remain exercise prompts, not operational response directions.

## Interactive global reference map

The atlas uses the bundled Natural Earth land geometry and GVP catalog offline. Drag to pan, pinch or double-click to zoom, or hold Ctrl/Command while scrolling for pointer-centered zoom (1×–12×). Ordinary scrolling continues down the page. Keyboard arrows pan; +/− zoom; Enter opens volcanoes near the center crosshair; Home resets. Markers retain their screen size while zooming. Nearby overlapping markers open a scrollable selection list rather than choosing an arbitrary volcano.

The map search shares the catalog query. Fit matches frames the current search/country results, Focus selected centers the selected volcano, and Expand map uses the full workspace width while keeping the dossier below it. Filtered-out and off-screen selections are explicit. Grid visibility, visible result counts, pointer coordinates, and hover names support orientation. Coastlines remain approximate at high zoom; this is a reference atlas, not a street or hazard-routing map.

### World landscape rendering

The simulator now stitches a surrounding DEM ring onto the simulation patch and renders a sky/haze landscape without block walls or a display base. Surrounding coverage is three times the simulation width and is visual context only; hazard and ash calculations still use the original patch. The default Merapi 60 km surrounding DEM is bundled; regenerate or extend its cache with `python3 scripts/cache-terrain.py --context`.

Esri World Imagery is requested online as an attributed geographic export and registered using its returned extent. Imagery can contain historical clouds and baked-in shadows; it is not live imagery or a measured 3D building model. Switch Ground surface to Elevation colors for the analytical view. If imagery fails, elevation colors remain available; if surrounding DEM fails, the core patch remains usable with explicit status. No synthetic geography is substituted.
