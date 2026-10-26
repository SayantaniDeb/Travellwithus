import { useEffect, useId, useRef, useState } from 'react';

export default function DestinationAutocomplete({ value, onChange, id, placesOnly = false, preferredCountry = '', ...inputProps }) {
  const generatedId = useId();
  const inputId = id || `destination-${generatedId}`;
  const listId = `${inputId}-suggestions`;
  const optionRefs = useRef([]);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    setSuggestions([]);
    setActive(-1);
    setFailed(false);
    setLoading(false);
    const query = value.trim();
    if (!query || value === selected) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const base = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${base}/api/destinations?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Suggestions unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) {
          const matches = (data.suggestions || []).filter(place => !placesOnly || place.kind !== 'country');
          const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const term = normalize(query);
          matches.sort((a, b) => Number(normalize(b.name) === term) - Number(normalize(a.name) === term)
            || Number(b.country === preferredCountry) - Number(a.country === preferredCountry)
            || a.name.length - b.name.length);
          setSuggestions(matches);
        }
      } catch (error) {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, selected, placesOnly, preferredCountry]);

  useEffect(() => {
    if (active >= 0) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (suggestion) => {
    setSelected(suggestion.label);
    onChange(suggestion.label);
    setOpen(false);
    setActive(-1);
  };
  const visible = open && Boolean(value.trim()) && value !== selected;
  return (
    <>
      <input {...inputProps} id={inputId} value={value} autoComplete="off" role="combobox"
        aria-label={inputProps['aria-label'] || 'Destination'} aria-autocomplete="list" aria-expanded={visible} aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={event => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            if (suggestions.length) setActive(index => event.key === 'ArrowDown'
              ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
          }
          if (event.key === 'Enter' && visible && active >= 0 && suggestions[active]) {
            event.preventDefault(); choose(suggestions[active]);
          }
        }} />
      {visible && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-2xl">
          <ul id={listId} role="listbox" aria-label="Destination suggestions" className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li ref={element => { optionRefs.current[index] = element; }} id={`${listId}-${index}`} key={suggestion.id} role="option" aria-selected={active === index}
                onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(suggestion)}
                className={`cursor-pointer px-4 py-3 ${active === index ? 'bg-blue-50 text-blue-900' : 'text-gray-900 hover:bg-gray-50'}`}>
                <span className="block text-sm font-semibold">{suggestion.name}</span>
                <span className="block text-xs text-gray-500">{suggestion.kind === 'country' ? 'Country' : suggestion.country}</span>
              </li>
            ))}
          </ul>
          <div role="status" className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
            {loading ? 'Finding places…' : failed ? 'Suggestions unavailable. You can still type any destination.' : suggestions.length ? 'Choose a place or keep typing · Places from GeoNames' : 'No matches yet. You can still use your typed destination.'}
          </div>
        </div>
      )}
    </>
  );
}
