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

Print removes navigation and action controls, stacks the response content, and includes explicit training and model limitations.

## Elevation & Depth

Depth comes from white, mineral, and sage surfaces separated by thin borders. Cards do not cast shadows. The selected audience segment has a small diffuse shadow, recorded in the sidecar. This is a local selected-state treatment, not general panel elevation.

**The Quiet Surface Rule.** Organize work with tonal surfaces and borders before adding elevation.

## Shapes

Controls have gently rounded corners, with slightly larger radii for navigation and work panels. Circular dots indicate map selections and legend categories. Maps clip inside rounded panels. Lucide line icons support labeled actions; schematic hazard shapes are drawn directly in SVG.

## Components

- **Buttons:** Forest primary actions, white bordered secondary actions, and compact text actions. Primary controls have a 40px minimum height; secondary controls have a 36px minimum. Hover darkens buttons slightly; keyboard focus uses a visible amber outline. Disabled map controls lower opacity.
- **Navigation:** Icon-and-label rows receive a pale green active fill. The audience selector uses a white selected segment within a muted track. Mobile main navigation retains accessible text while visually showing icons.
- **Inputs:** Search uses a bordered white wrapper and inline icon; country selection stays native. Notes use a pale editable surface and vertical resizing. Range controls display their current value and unit above the track.
- **Training badge and notice:** Muted ochre badges and pale informational strips keep the exercise context visible without competing with the working area. Status notices appear inline and can be dismissed.
- **Dossier and brief:** Sage panels hold selected context, definition-list measurements, source access, and the next action. These complement the larger working canvas.
- **Catalog:** Thin row dividers, a tinted sticky header, pale selected rows, and explicit empty results support catalog scanning. Name buttons provide a keyboard-accessible selection path alongside the map.
- **Hazard diagram:** A gridded schematic with distance rings, a wind-oriented ash ellipse, a red pyroclastic radius, and a dashed blue lahar envelope. Numeric keys and limitations sit below the diagram.

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
