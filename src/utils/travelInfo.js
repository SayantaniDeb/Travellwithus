import { invalidManaliRail } from './journeyLegs.js';
import { travelHours } from './travelSchedule.js';
export function isUsableTravelInfo(info) {
  return Boolean(info && ['from', 'to', 'recommendedMode', 'travelDuration', 'estimatedTicketCost']
    .every(key => typeof info[key] === 'string' && info[key].trim()));
}

export async function requestTravelInfo(callAI, source, destination, currency, mode = '') {
  if (!source.trim()) throw new Error('Enter your starting city to get travel directions.');
  if (mode && !['train', 'bus', 'flight', 'car', 'bike'].includes(mode)) throw new Error('Choose a supported transport mode.');
  const prompt = `Explain how to travel from ${source} to ${destination}, currency ${currency}.
${mode ? `Required main mode: ${mode}. Bike means motorbike. Do not substitute another main mode. If infeasible return {"unavailableReason":"explain why"}.` : ''}
For car or motorbike include routeSummary (highways and major waypoints), distanceKm (numeric approximate one-way distance), road time including rest stops, route cautions and realistic fuel/rest stops in steps. estimatedTicketCost means one-way vehicle fuel and toll costs, not a passenger ticket. Never invent live road conditions. Exclude roads prohibiting motorbikes and require checking local access restrictions.
Manali has no railway station: use an appropriate railhead such as Chandigarh or Joginder Nagar plus road transfer. Never invent a train into Manali.
No verified fare source is connected: set estimatedTicketCost to "Not estimated".
Return ONLY JSON with from, to, fromStation, toStation, recommendedMode, travelDuration, estimatedTicketCost (one-way), durationHours (numeric one-way total including connections), returnDurationHours (numeric if known), tips, and steps (array of strings describing each connection from departure city to final destination, including last-mile transfer).
Use nonempty strings for required fields. Separate train/flight/bus legs from final road transfers. State approximate durations and price estimates, not live schedules or confirmed fares. Never invent a direct service when a connection is needed. If uncertain, explicitly say verification is needed.`;
  let issue = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callAI('openai/gpt-oss-20b', prompt + (attempt ? `\nYour previous response failed validation: ${issue}. Return the exact required flat JSON object, no wrapper. Use a string for estimatedTicketCost, e.g. "INR 2500 (estimate)"; if unknown use "Not estimated". durationHours must be a positive number. steps must contain concrete journey connections.` : ''), 6000, { useCache: false });
    try {
      const parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
      const raw = parsed.travelInfo || parsed.journey || parsed;
      if (typeof raw.unavailableReason === 'string' && raw.unavailableReason.trim()) throw Object.assign(new Error(raw.unavailableReason), { unavailable: true });
      const modeName = mode ? (mode === 'bike' ? 'Motorbike' : mode.charAt(0).toUpperCase() + mode.slice(1)) : raw.recommendedMode;
      const hours = travelHours(raw);
      const cost = raw.estimatedTicketCost;
      const info = {
        ...raw,
        from: typeof raw.from === 'string' && raw.from.trim() ? raw.from : source,
        to: typeof raw.to === 'string' && raw.to.trim() ? raw.to : destination,
        recommendedMode: modeName,
        travelDuration: typeof raw.travelDuration === 'string' && raw.travelDuration.trim() ? raw.travelDuration : hours ? `Approximately ${hours} hours` : '',
        estimatedTicketCost: 'Not estimated',
        steps: Array.isArray(raw.steps) ? raw.steps.filter(step => typeof step === 'string' && step.trim()) : [],
        ...(hours ? { durationHours: hours } : {}),
        ...(mode ? { selectedMode: mode } : {}),
      };
      const missing = [];
      if (!isUsableTravelInfo(info)) missing.push('route, mode or duration');
      if (!hours || !Number.isFinite(hours)) missing.push('positive journey duration in hours');
      if (!info.steps.length) missing.push('journey connection steps');
      if (['car', 'bike'].includes(mode) && (typeof info.routeSummary !== 'string' || !info.routeSummary.trim())) missing.push('road route details');
      if (invalidManaliRail(info)) missing.push('a real railhead and road transfer for Manali');
      if (missing.length) throw new Error(`Missing ${missing.join(', ')}`);
      return info;
    } catch (error) {
      if (error.unavailable) throw error;
      issue = error instanceof SyntaxError ? 'Invalid JSON' : error.message;
    }
  }
  throw new Error(`Could not build usable directions (${issue}). Your current journey is unchanged. Try another mode or check the route on the map.`);
}
