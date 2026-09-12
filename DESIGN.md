---
name: Ashline
description: A mineral field atlas for volcanic-risk training and readiness.
colors:
  ink: "#293d35"
  muted: "#63746b"
  green: "#294e3e"
  accent: "#b84e35"
  border: "#dce3dc"
  mineral: "#f5f7f3"
  paper: "#fff"
  sage: "#e8eee2"
  ash: "#a17b38"
  pyroclastic: "#bd5137"
  lahar: "#487d9a"
typography:
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-1.1px"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 750
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.7
  action:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
rounded:
  control: "5px"
  navigation: "7px"
  panel: "8px"
  atlas: "9px"
spacing:
  compact: "10px"
  inset: "20px"
  generous: "25px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  button-text:
    textColor: "#5e7163"
    padding: "0"
  search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 11px"
  dossier:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.atlas}"
    padding: "22px 20px"
---

# Design System: Ashline

## Overview

**Creative North Star: "Mineral Field Atlas"**

Pale mineral surfaces and forest ink frame a compact working atlas. Geography and measurements carry the visual interest; restrained controls support exploration and preparation. Manrope gives the interface a clear, approachable technical voice.

The system distinguishes real catalog information from synthetic exercises. Training notices, uncertainty statements, units, and source links remain part of the visible interface. Hazard color conveys a named modeled quantity, with text and geometry supporting its meaning.

**Key Characteristics:**

- Pale mineral canvas with white work surfaces and sage summaries.
- Forest text and actions, with restrained vermilion emphasis.
- Compact controls, thin borders, and modestly rounded panels.
- Geographic diagrams, explicit units, and tabular result numerals.

## Colors

The palette resembles pale stone, green field notes, and mineral hazard pigments. The frontmatter records reusable colors from the implemented CSS and diagrams.

### Primary

- **Forest green:** Primary actions and native range/checkbox accents.
- **Vermilion:** Brand punctuation and map selection emphasis. The SVG map uses a closely related vermilion for its selected marker and leader line.

### Secondary

- **Ash ochre, pyroclastic red, and lahar blue:** Consistent keys and schematic boundaries for the three modeled hazards. Use the same meaning in labels and diagrams.

### Neutral

- **Forest ink and muted green:** Main text and supporting explanations.
- **Mineral and paper:** Page canvas and editable work surfaces.
- **Sage:** Selected-volcano dossier and response brief.
- **Soft border:** Panel boundaries, table edges, and separators.

**The Labeled Hazard Rule.** Hazard hues accompany named quantities and diagram geometry; color alone does not explain a result.

## Typography

Manrope is self-hosted as a variable font, with Arial and sans-serif fallbacks. Headings use compact negative tracking; body copy stays open and plain. The large page headline steps down to 28px and then 26px on smaller screens. Section titles are typically 16–17px; the selected volcano has a larger dossier title.

The body token describes the root text and paragraph defaults. Implemented work surfaces often use 11–12px explanatory text and compact 10–12px controls. These are dense desktop patterns, not a mandate to shrink future content. Sliders and hazard metrics use tabular numerals so updates remain easy to compare. Units remain visible beside measurements.

## Layout

Desktop uses a fixed 226px sidebar and a 78px top bar. Main content has 37px horizontal gutters and a 1740px maximum width. Work areas use a broad canvas with a narrower context panel: atlas plus dossier, simulator controls plus results, or checklist plus brief. The catalog uses a bounded scrolling table with a sticky header.

At 1150px the sidebar and gutters tighten. At 850px navigation becomes a horizontal icon strip and the sidebar returns to document flow. At 620px work areas become a single column; simulator results and the response brief precede their supporting controls. Mobile tables scroll within their container. Above 1500px the atlas map and dossier receive more room.

The atlas geology section uses a broad source-summary column and a narrower educational-context column (1.65:1), separated by a 32px gap and framed by horizontal borders. At 620px it stacks with a 25px gap. Catalog pagination places the result range opposite the page controls, then stacks them at the same mobile breakpoint.

Print removes navigation and action controls, stacks the response content, and includes explicit training and model limitations.

## Elevation & Depth

Depth comes from white, mineral, and sage surfaces separated by thin borders. Cards do not cast shadows. The selected audience segment has a small diffuse shadow, recorded in the sidecar. This is a local selected-state treatment, not general panel elevation.

**The Quiet Surface Rule.** Organize work with tonal surfaces and borders before adding elevation.

## Shapes

Controls have gently rounded corners, with slightly larger radii for navigation and work panels. Circular dots indicate map selections and legend categories. Maps clip inside rounded panels. Lucide line icons support labeled actions; schematic hazard shapes are drawn directly in SVG. The custom Ashline SVG mark combines a forest volcano outline and strata with two vermilion ash strokes. The same asset serves the favicon and sidebar brand, where it measures 29px and reduces to 24px at the horizontal-navigation breakpoint.

## Components

- **Buttons:** Forest primary actions, white bordered secondary actions, and compact text actions. Primary controls have a 40px minimum height; secondary controls have a 36px minimum. Hover darkens buttons slightly; keyboard focus uses a visible amber outline. Disabled map controls lower opacity.
- **Navigation:** Icon-and-label rows receive a pale green active fill. The audience selector uses a white selected segment within a muted track. Mobile main navigation retains accessible text while visually showing icons.
- **Inputs:** Search uses a bordered white wrapper and inline icon; country selection stays native. Notes use a pale editable surface and vertical resizing. Range controls display their current value and unit above the track.
- **Training badge and notice:** Muted ochre badges and pale informational strips keep the exercise context visible without competing with the working area. Status notices appear inline and can be dismissed.
- **Dossier and brief:** Sage panels hold selected context, definition-list measurements, source access, and the next action. These complement the larger working canvas.
- **Catalog:** Thin row dividers, a tinted sticky header, pale selected rows, and explicit empty results support catalog scanning. Name buttons provide a keyboard-accessible selection path alongside the map.
- **Sourced geology and context:** An open section with thin horizontal borders holds the selected volcano’s summary, visible Smithsonian provenance and record link. Readable 13px paragraphs are limited to 72 characters per line; source metadata uses muted 11px text and underlined links use 12px text. The adjacent context states its educational scope and separates historical catalog facts from current activity guidance. Missing summaries receive explicit fallback copy.
- **Catalog pagination:** Secondary Previous page and Next page buttons accompany a live result-range status beneath the table. Pages contain up to 60 matches, with boundary controls disabled; search and country changes return to the first page.
- **Brand mark:** Reuse `public/ashline.svg` for the sidebar and favicon. The sidebar image is decorative beside the text wordmark; its forest and vermilion strokes extend the existing palette without introducing a separate icon style for actions.
- **Hazard diagram:** Geographic training footprints use an azimuthal equidistant projection centered on the selected volcano’s catalog coordinates. Approximate coastlines, distance rings, coordinate labels, and a north arrow orient the wind-directed ochre ash ellipse, red pyroclastic radius, and dashed blue lahar distance screen. Numeric keys and limitations remain visible: these are illustrative footprints without terrain or river-channel modeling, not official hazard boundaries.
- **Location check and outcomes:** A sage input strip accepts optional, explicitly labeled latitude and longitude coordinates. Invalid or incomplete coordinates show an inline error and disable Run scenario; valid coordinates reveal distance, bearing, and a location marker, with text when the location falls outside the map view. Open outcome rows pair each named hazard with its consequences, exposure-reduction guidance, and textual overlap state. Overlap means geometry only; outside does not establish safety. Rows collapse from three columns to two at 850px and one at 620px.
- **Mitigation checklist:** Native forest-accented checkboxes pair each measure with its intended effect. The selection count describes the next run’s plan; it does not imply completed protection or quantified risk reduction. Thin separators and open spacing extend the existing working atlas without introducing a new panel style.
- **Run comparison and export:** Run scenario records an immutable snapshot of the volcano, conditions, results, optional location, and selected measures. A bordered, horizontally scrolling table compares runs for the selected volcano with explicit units, overlap text, and plan names; later slider changes leave recorded rows unchanged. An inline status confirms recording, an empty state explains the first step, and Export runs stays disabled until a run exists. Runs last for the session; JSON export preserves them with training-model context.
- **Interactive 3D eruption:** A WebGL scene leads the simulator in a white, thin-bordered panel with 9px corners. Geographic elevation data is the default, centered on the selected volcano’s catalog coordinates. Mineral sky, muted green and stone elevation colors, and gray ash extend the atlas palette; terrain colors describe elevation, not land cover. Scene-adjacent VEI, wind speed, and wind-toward sliders display units and share the scenario settings used by the geographic results. They occupy three columns on desktop; at 620px the direction control spans a second row.
- **3D terrain controls and provenance:** Native selectors offer 10 × 10, 20 × 20, and 40 × 40 km coverage, defaulting to 20 × 20 km, and 1× true vertical scale or explicitly labeled 2×/3× exaggeration. A mineral control strip identifies geographic, loading, unavailable, or procedural terrain state. A pale summary keeps coverage, mesh spacing, approximate source-pixel spacing, elevation range, DEM vent elevation, and catalog elevation visible. Pixel spacing is not accuracy. The north arrow lies on the terrain. An expandable source section names Mapzen / Tilezen terrain tiles on AWS Open Data, retrieval date, tile source records, and provider attribution links. Explain that the 257 × 257 local equidistant mesh uses bilinear interpolation, the DEM is a historical composite with varying capture dates and vertical datums, and retrieval date is not survey date.
- **3D terrain inspection:** Clicking or tapping terrain updates a text row with latitude, longitude, elevation in meters, and sampled slope in degrees. Inspect vent provides a keyboard-accessible measurement action. The row announces updates politely and states that slope uses the unexaggerated DEM. Thin borders and wrapping text keep measurements part of the working surface.
- **3D camera and playback:** Drag orbits the scene and scroll or pinch zooms. Labeled icon buttons provide rotation, zoom, top view, and camera reset; the focusable canvas also accepts left/right arrows, plus/minus, and Home. Playback starts paused at 25% with a visible stage label. Play/Pause, Restart, a scrubbable timeline in scenario hours, and 0.5×–4× speed controls sit below the scene; seeking pauses playback, and completion offers Replay. On geographic terrain, the displayed window includes eruption duration plus the selected after-eruption settling period and identifies post-eruption settling. The full displayed window takes 30 seconds at 1×.
- **3D ash settling:** Geographic terrain exposes an ash-release-height slider from 0.5–8 km above the vent in 0.5 km steps, defaulting to 1.5 km, plus an After eruption selector for 6, 12, or 24 hours of settling, defaulting to 6. Four wrapping count labels show Airborne, Deposited, Left terrain patch, and Not yet released using tabular numerals. Adjacent copy identifies the 1,000 illustrative tracers, states that counts are not ash mass or thickness, and gives the eruption end time. Ash plume and Settled ash checkboxes start on; deposits persist at DEM contact and scrubbing reconstructs the same deterministic history. The expandable assumptions section describes equal visual samples of 20, 63, 125, 250, and 1,000 µm spherical grains, size-dependent terminal fall speeds, constant horizontal wind, and uniform release during the eruption. Release height is an assumption independent of VEI; a 20 m/s mean ascent sets the initial downwind offset. Keep the omitted weather, turbulence, aggregation, scavenging, particle-shape, resuspension, and loading processes explicit. Leaving the patch does not mean deposited or safe; fine ash can remain airborne beyond playback and coarse terrain can miss narrow features. This is a simplified transport illustration, not a validated ashfall forecast.
- **3D hazard layers:** Hazard outlines start off and reveal the ochre/red/blue legend when enabled. On geographic terrain, outlines use model distances in kilometers, clip at the patch edge, and do not represent terrain-routed flows. The Hot flows unavailable on DEM checkbox is visibly disabled and unchecked because no validated terrain-flow solver is present. Stylized hot flows remain available in the procedural preview; its terrain, plume, and flow paths stay explicitly illustrative.
- **3D arrangement and fallback:** The scene is 510px tall on desktop, 440px at 850px, and 390px at 620px. On mobile the camera strip moves to the lower left, its gesture hint sits above it, and the timeline fills a row below the playback buttons. Terrain controls, inspection, and tracer counts wrap with 16px mobile insets. Loading uses an inline status. Elevation failure offers Retry terrain and Use procedural preview and states that no procedural terrain has been substituted; preview requires that explicit action and offers Load geographic terrain to return. The procedural preview uses volcano-type geometry and is not a measured reconstruction. WebGL failure or context loss replaces scene overlays with explanatory text and Reload 3D view; playback is disabled while unavailable, and scenario settings and geographic results remain accessible. Unsupported underwater entries receive a dedicated explanation instead of the terrestrial scene.

Interface updates are immediate. The score track has no animated transition, and reduced-motion preferences disable transitions globally.

## Do's and Don'ts

### Do:

- **Do** use pale surfaces, forest ink, and thin borders to organize work.
- **Do** keep measurements, units, sources, and synthetic-data context visible.
- **Do** pair hazard colors with labels and distinct diagram geometry.
- **Do** preserve visible keyboard focus and a working skip link.

### Don't:

- **Don't** present the training palette or unrest score as an official alert level.
- **Don't** add card shadows as the default form of separation.
- **Don't** turn tiny map metadata or uppercase brand captions into the general text hierarchy.

### Atlas selection and terrain relief

Atlas markers use 5px visible dots with nearest-point hit testing within 24px (32px for touch). Nearby choices include Zoom to nearby, while selection updates the description preview immediately.

Geographic terrain uses a continuous elevation ramp (#527b65, #85957b, #b3ac8a, #8c8479, #dedbd0), with a labeled minimum/maximum legend; these colors encode relative elevation, never land cover. Optional contour lines interpolate the terrain mesh at the displayed meter interval. Directional relief lighting and responsive camera framing reveal slopes without changing measured elevations. True vertical scale remains the default.

### Simulator world landscape

The default 3D scene is a low oblique landscape view, not an elevated terrain slab. Remove base walls and studio floor. Stitch a coarser measured DEM ring, three times the simulation width, to the exact core boundary; the default Merapi view has 20 km simulation coverage and 60 km surrounding context. Surroundings do not extend ash deposition or hazard calculations.

Satellite imagery is the default ground surface when the Esri World Imagery export service is available. Use the returned geographic extent for UV registration, preserve attribution beside the scene, and disclose historical clouds and shadows. Elevation colors remain selectable and are the fallback when imagery fails. Optional contours remain available on both surfaces. Surrounding DEM failure retains the core patch with explicit status; never generate missing geography silently.

Blue sky, horizon haze, directional light, and a lower camera establish landscape depth. Terrain clearance prevents the camera from entering measured ground. Top view, reset, orbit, zoom, and existing inspection controls remain available. Status and gesture text use pale backing for legibility over imagery. Mobile keeps the central peak in view with a wider field of view and 44px camera buttons.
