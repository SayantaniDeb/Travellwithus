export function cleanLocationName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim();
  return /^(unknown(?: location)?|undefined|null|n\/a)$/i.test(name) ? '' : name;
}
