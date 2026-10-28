function parse(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// Repair syntax once, then let the caller validate the complete itinerary schema.
// Never evaluate model output or salvage a truncated partial itinerary.
export async function parsePlanningJson(text, repair) {
  try { return parse(text); } catch {
    if (!repair) throw new Error('The planner returned invalid JSON. Your current itinerary has been kept.');
  }
  const repaired = await repair(text);
  try { return parse(repaired); } catch {
    throw new Error('The planner could not format this itinerary. Please retry. Your current itinerary has been kept.');
  }
}
