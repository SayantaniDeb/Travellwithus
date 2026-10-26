export async function readPlanningResponse(response) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error('The planning server did not return a valid response. Please retry. Your current itinerary has been kept.');
  }
  if (!response.ok || data?.error || data?._routing?.fallback_level === 'failed') {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.error?.message;
    throw new Error(detail || 'Planning is temporarily unavailable. Your current itinerary has been kept.');
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('The planner returned no directions. Please retry. Your current itinerary has been kept.');
  return content;
}
