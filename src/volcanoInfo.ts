import type { Volcano } from './model';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Search every token across metadata and the attributed geological description. */
export function searchVolcanoes(volcanoes: Volcano[], query: string, country = ''): Volcano[] {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return volcanoes.filter(v => (!country || v.country === country) && tokens.every(token =>
    normalize([v.name, v.country, v.region, v.type, v.id, v.summary].join(' ')).includes(token)));
}

/** General educational context; never an inferred current status or local hazard assessment. */
export function volcanoContext(v: Volcano): { title: string; text: string } {
  if (/submarine/i.test(v.type) || (v.elevation !== null && v.elevation < 0)) {
    return { title: 'Underwater setting', text: 'Water depth and interaction with seawater strongly influence activity. This training model does not represent underwater processes or tsunamis; use specialist assessments for this setting.' };
  }
  if (/caldera/i.test(v.type)) {
    return { title: 'Caldera setting', text: 'A caldera is a collapse depression. Its presence does not establish the size or likelihood of a future eruption. Activity can occur at different vents; consult mapped deposits and eruption histories.' };
  }
  if (/shield|fissure/i.test(v.type)) {
    return { title: 'Shield and fissure settings', text: 'Lava flows and volcanic gases are important considerations in many shield and fissure eruptions. Explosive activity can also occur. The simulator does not model lava paths or gas exposure.' };
  }
  if (/strato|dome/i.test(v.type)) {
    return { title: 'Steep cones and lava domes', text: 'Explosive activity and dome collapse can produce fast-moving pyroclastic density currents. Loose deposits can feed lahars when water is available. Actual exposure depends on terrain and eruption history.' };
  }
  return { title: 'Interpret the local setting', text: 'Volcano type alone cannot determine future behavior. Review the geological history, vent locations, official hazard maps, and observatory bulletins before designing a local exercise.' };
}
