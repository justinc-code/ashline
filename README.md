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
