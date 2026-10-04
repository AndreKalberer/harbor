(function exposeCardArtwork(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborCardArtwork = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCardArtwork() {
  const symbols = {
    Listen: '<circle cx="0" cy="0" r="125" fill="#171225"/><circle r="98"/><circle r="74"/><circle r="48"/><circle r="28" fill="currentColor" stroke="none"/><circle r="7" fill="#171225" stroke="none"/><path d="M105 -155h52v153l-35 26" stroke-width="12"/><circle cx="114" cy="31" r="13" fill="currentColor"/>',
    Read: '<path d="M-145 -105q75 -32 145 8q70 -40 145 -8v210q-75 -32 -145 8q-70 -40 -145 -8Z" fill="#171225" stroke-width="9"/><path d="M0 -97v210M-116 -60q48 -13 85 4M-116 -19q48 -13 85 4M-116 22q48 -13 85 4M31 -56q48 -17 85 -4M31 -15q48 -17 85 -4M31 26q48 -17 85 -4" stroke-width="7"/><path d="M-100 -138l-25 -27M100 -138l25 -27M0 -145v-35" stroke-width="8"/>',
    Play: '<path d="M-96 -65q-41 0 -59 66l-17 72q-10 56 35 47l65 -48h144l65 48q45 9 35 -47l-17 -72q-18 -66 -59 -66Z" fill="#171225" stroke-width="9"/><path d="M-91 -20v67M-124 14h66" stroke-width="13"/><circle cx="100" cy="-8" r="13" fill="currentColor"/><circle cx="69" cy="25" r="13" fill="currentColor"/><circle cx="128" cy="25" r="13" fill="currentColor"/><circle cx="100" cy="57" r="13" fill="currentColor"/><path d="M-18 40h12M10 40h12M0 -65v-33q0 -36 35 -36h22" stroke-width="7"/>',
    Watch: '<rect x="-150" y="-104" width="300" height="190" rx="25" fill="#171225" stroke-width="9"/><path d="M-27 -55l88 47l-88 47Z" fill="currentColor" stroke="none"/><path d="M-62 125h124M0 86v39M-44 -155l44 45l49 -49" stroke-width="9"/>',
    Sports: '<circle r="131" fill="#171225" stroke-width="9"/><path d="M-131 0h262M0 -131v262M-90 -96q180 96 0 192M90 -96q-180 96 0 192" stroke-width="8"/>',
    News: '<circle r="124" fill="#171225" stroke-width="8"/><ellipse rx="59" ry="124" stroke-width="7"/><path d="M-124 0h248M-108 -60h216M-108 60h216" stroke-width="7"/>'
  };
  function svg(item, icon) {
    const name = String(item.domain || item.name || 'Harbor');
    let hash = 0;
    for (const letter of name) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
    const base = { Watch: 270, Listen: 305, Read: 32, Play: 215 }[item.category] || 270;
    const hue = (base + hash % 55) % 360;
    const accent = `hsl(${hue},80%,77%)`;
    const category = item.type === 'live' ? (/sport/i.test(name) ? 'Sports' : 'News') : item.category;
    const symbol = symbols[category] || symbols.Watch;
    const center = icon
      ? `<circle r="129" fill="#fff" fill-opacity=".94"/><image href="data:image/png;base64,${icon}" x="-80" y="-80" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>`
      : symbol;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="hsl(${hue},42%,27%)"/><stop offset="1" stop-color="#100e20"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".32"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><path fill="url(#bg)" d="M0 0h800v800H0z"/><circle cx="430" cy="345" r="370" fill="url(#glow)"/><g fill="none" stroke="${accent}" opacity=".13" stroke-width="2"><circle cx="400" cy="400" r="205"/><circle cx="400" cy="400" r="245"/><circle cx="400" cy="400" r="335"/><path d="M-100 680L680 -100M120 900L900 120"/></g><g transform="translate(650 670) scale(.85)" color="${accent}" fill="none" stroke="currentColor" opacity=".13">${symbol}</g><g transform="translate(400 390)" color="${accent}" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" stroke-width="3">${center}</g><g fill="${accent}" opacity=".6"><circle cx="174" cy="245" r="5"/><circle cx="630" cy="530" r="7"/><path d="M592 218h22v4h-22zM601 209h4v22h-4z"/></g></svg>`;
  }
  return Object.freeze({ svg, fallback: item => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(item)) });
});
