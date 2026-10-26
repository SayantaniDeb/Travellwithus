export function fareProviders(mode = '') {
  if (/flight|air/i.test(mode)) return [
    ['IndiGo','https://www.goindigo.in/'],['SpiceJet','https://www.spicejet.com/'],['Air India','https://www.airindia.com/'],['Air India Express','https://www.airindiaexpress.com/'],['Other airline',''],
  ];
  if (/bus/i.test(mode)) return [['redBus','https://www.redbus.in/'],['AbhiBus','https://www.abhibus.com/'],['Bus operator',''],['Other','']];
  return [['IRCTC','https://www.irctc.co.in/nget/train-search'],['redRail','https://www.redbus.in/railways'],['Other','']];
}
export function recordedProvider(estimate, mode) {
  const options=fareProviders(mode);
  if (options.some(([name])=>name===estimate?.provider)) return estimate.provider;
  if (estimate?.sourceUrl) {
    try {const host=new URL(estimate.sourceUrl).hostname;const match=options.find(([,url])=>url && new URL(url).hostname===host);if(match)return match[0];} catch {}
  }
  return options[0][0];
}
