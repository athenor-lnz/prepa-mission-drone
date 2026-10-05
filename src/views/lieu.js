import { h, icon, toast, copyText } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { formatAll } from '../lib/geo.js';
import { search } from '../services/geocode.js';
import { micButton } from '../ui/dictate.js';
import { openTools } from './outils.js';
import { info as aerodataInfo, analyzeAerodata } from '../services/aerodata.js';

const RADII = [50, 100, 300, 500, 1000];
const TILES = {
  plan: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', max: 19 },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagerie © Esri', max: 19 },
  oaci: {
    url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    attr: 'Carte OACI-VFR © DSNA/SIA · Géoplateforme',
    max: 20, native: 11
  }
};

export function renderLieu({ mission }) {
  const L = globalThis.L;
  const mapEl = h('div', { class: 'map', id: 'map', role: 'application', 'aria-label': 'Carte : touchez pour placer le point' });
  const root = h('main', { class: 'screen lieu' }, mapEl);
  let map; let marker; let circle; let layer; let airOverlay; let mode = 'plan';
  let fmt = 'dms';
  const p = mission.place;
  const hasPoint = () => Number.isFinite(p.lat) && Number.isFinite(p.lon);

  const coordText = h('div', { class: 'mono coord-text' });
  const radiusTag = h('span', { class: 'map-tag' });
  const results = h('ul', { class: 'results', hidden: true });
  const searchMsg = h('p', { class: 'note', 'aria-live': 'polite' });
  const next = ctaButton('Valider · MENS / Météo', () => { location.hash = missionUrl(mission.id, 'meteo'); }, { disabled: !hasPoint() });

  function refresh() {
    if (hasPoint()) {
      const f = formatAll(p.lat, p.lon);
      coordText.textContent = { dd: f.dd, ddm: f.ddm, dms: f.dms, utm: f.utm }[fmt];
      coordText.classList.remove('empty');
    } else { coordText.textContent = 'Aucun point : cherchez une adresse ou touchez la carte.'; coordText.classList.add('empty'); }
    radiusTag.textContent = `Rayon ${p.radiusM} m`;
    next.disabled = !hasPoint();
    for (const b of root.querySelectorAll('.radii button')) b.setAttribute('aria-pressed', String(Number(b.dataset.r) === p.radiusM));
  }

  function setPoint(lat, lon, label, { recenter = true } = {}) {
    mutate(mission, (m) => {
      const moved = m.place.lat !== lat || m.place.lon !== lon;
      m.place.lat = lat; m.place.lon = lon; m.place.label = label;
      if (moved) { // les données dépendantes du lieu ne sont plus valables
        m.mens.meteo = { ...m.mens.meteo, hours: [], slots: [], fetchedAt: null, source: null, manual: false, kp: null, tz: null, forPlace: null };
        m.mens.espace = { ...m.mens.espace, fetchedAt: null, source: null, zones: [], error: null };
      }
    });
    drawMarker(recenter);
    refresh();
    drawAerodataOverlay();
  }

  function drawMarker(recenter) {
    if (!map || !hasPoint()) return;
    const ll = [p.lat, p.lon];
    if (!marker) {
      marker = L.marker(ll, { draggable: true, keyboard: false, icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(map);
      marker.on('dragend', () => { const q = marker.getLatLng(); setPoint(q.lat, q.lng, '', { recenter: false }); });
      circle = L.circle(ll, { radius: p.radiusM, color: getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#2340E8', weight: 3, dashArray: '8 6', fillOpacity: 0.15 }).addTo(map);
    } else { marker.setLatLng(ll); circle.setLatLng(ll); }
    circle.setRadius(p.radiusM);
    if (recenter) fit();
  }

  function fit() {
    if (!map || !circle) return;
    map.fitBounds(circle.getBounds(), { paddingTopLeft: [24, 90], paddingBottomRight: [24, 340], maxZoom: 18, animate: false });
  }

  function setMode(m) {
    mode = m;
    if (layer) map.removeLayer(layer);
    const t = TILES[m];
    layer = L.tileLayer(t.url, { maxZoom: t.max, maxNativeZoom: t.native || t.max, attribution: t.attr, keepBuffer: 4 });
    let warned = false;
    layer.on('tileerror', () => { if (!warned) { warned = true; toast('Fond de carte indisponible (réseau).', 'bad'); } });
    layer.addTo(map);
  }

  async function drawAerodataOverlay() {
    if (!map || !hasPoint()) return;
    if (!airOverlay) airOverlay = L.layerGroup().addTo(map);
    airOverlay.clearLayers();
    try {
      const meta = await aerodataInfo();
      if (!meta) return;
      const r = await analyzeAerodata({ lat:p.lat, lon:p.lon, radiusM:p.radiusM || 500, nearest:3 });
      for (const z of r.zones) {
        if (!z.geometry || z.geometry.type === 'Point') continue;
        const restrictive = ['P','R','D','CTR','D-OTHER'].includes(z.type);
        try {
          L.geoJSON({ type:'Feature', geometry:z.geometry }, { style:{ color:restrictive ? '#B3261E' : '#8A5200', weight:2, fillOpacity:.06, dashArray:z.type==='CTR'?'6 5':null } })
            .bindTooltip([z.type,z.id,z.name].filter(Boolean).join(' · '))
            .addTo(airOverlay);
        } catch {}
      }
      for (const a of r.aerodromes.filter((x)=>x.distanceM <= 30000)) {
        L.circleMarker([a.lat,a.lon],{radius:5,weight:2,fillOpacity:.75})
          .bindTooltip(`${a.icao || ''} ${a.name || ''}`.trim())
          .addTo(airOverlay);
      }
    } catch (e) { console.warn('Overlay SIA local indisponible', e); }
  }

  async function doSearch(q) {
    results.hidden = true; results.replaceChildren(); searchMsg.textContent = '';
    if (q.trim().length < 2) return;
    searchMsg.textContent = 'Recherche…';
    const r = await search(q);
    if (!r.ok) { searchMsg.textContent = `${r.error} Vous pouvez toucher la carte pour placer le point.`; return; }
    if (!r.results.length) { searchMsg.textContent = 'Aucun résultat.'; return; }
    searchMsg.textContent = `Source : ${r.source}`;
    if (r.results.length === 1 && r.source === 'saisie') { setPoint(r.results[0].lat, r.results[0].lon, ''); return; }
    results.hidden = false;
    results.replaceChildren(...r.results.map((x) => h('li', {}, h('button', { class: 'result', onclick: () => { results.hidden = true; input.value = x.label; searchMsg.textContent = `Source : ${r.source}`; setPoint(x.lat, x.lon, x.label); } }, x.label))));
  }

  const input = h('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Adresse ou coordonnées', 'aria-label': 'Adresse ou coordonnées', value: p.label || '' });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(input.value); } });

  const panel = h('section', { class: 'panel' },
    h('div', { class: 'grab' }),
    h('div', { class: 'search' }, icon('search'), input,
      micButton({ label: 'Dicter une adresse', onText: (t) => { input.value = t; doSearch(t); } }),
      h('button', { class: 'icon-btn', 'aria-label': 'Lancer la recherche', onclick: () => doSearch(input.value) }, icon('arrow'))),
    results, searchMsg,
    segmented([{ value: 'dd', label: 'DD' }, { value: 'ddm', label: 'DDM' }, { value: 'dms', label: 'DMS' }, { value: 'utm', label: 'UTM' }], fmt, (v) => { fmt = v; refresh(); for (const b of panel.querySelectorAll('.seg.fmt button')) b.classList.toggle('on', b.dataset.v === v); }, 'Format des coordonnées'),
    h('div', { class: 'coord-box' }, coordText,
      h('button', { class: 'icon-btn tint', 'aria-label': 'Copier les coordonnées', onclick: () => hasPoint() && copyText(coordText.textContent, 'Coordonnées copiées') }, icon('copy'))),
    h('div', { class: 'radii', role: 'group', 'aria-label': 'Rayon de travail' },
      RADII.map((r) => h('button', { 'data-r': r, 'aria-pressed': 'false', onclick: () => { mutate(mission, (m) => { m.place.radiusM = r; }); circle?.setRadius(r); fit(); refresh(); drawAerodataOverlay(); } }, r >= 1000 ? `${r / 1000} km` : `${r} m`))));

  // pastilles format : remplace le composant générique pour garder l'état visuel
  const seg = panel.querySelector('.seg'); seg.classList.add('fmt');
  [...seg.children].forEach((b, i) => { b.dataset.v = ['dd', 'ddm', 'dms', 'utm'][i]; });

  const mapBtns = h('div', { class: 'map-ctl map-stack' },
    h('button', { class: 'icon-btn float', 'aria-label': 'Ma position', onclick: () => {
      if (!navigator.geolocation) return toast('Position indisponible sur cet appareil.', 'bad');
      navigator.geolocation.getCurrentPosition((pos) => setPoint(pos.coords.latitude, pos.coords.longitude, ''), () => toast('Position refusée ou indisponible.', 'bad'), { enableHighAccuracy: true, timeout: 10000 });
    } }, icon('locate')),
    h('button', { class: 'icon-btn float', 'aria-label': 'Zoom avant', onclick: () => map?.zoomIn() }, icon('plus')),
    h('button', { class: 'icon-btn float', 'aria-label': 'Zoom arrière', onclick: () => map?.zoomOut() }, icon('minus')));
  const modeSeg = h('div', { class: 'seg float-seg', role: 'group', 'aria-label': 'Fond de carte' },
    h('button', { class: 'on', onclick: (e) => { setMode('plan'); toggle(e); } }, 'Plan'),
    h('button', { onclick: (e) => { setMode('sat'); toggle(e); } }, 'Satellite'),
    h('button', { onclick: (e) => { setMode('oaci'); toggle(e); } }, 'OACI'));
  const toggle = (e) => { for (const b of modeSeg.children) b.classList.toggle('on', b === e.currentTarget); };

  root.append(
    topbar(mission, 'lieu'),
    h('div', { class: 'dock' }, h('div', { class: 'dock-ctl' }, h('div', { class: 'map-left' }, radiusTag, modeSeg), mapBtns), panel),
    ctaBar(h('button', { class: 'btn tool', 'aria-label': 'Outils : conversions', onclick: () => openTools({ lat: p.lat, lon: p.lon }) }, icon('tools')), next));

  // La carte est créée après l'insertion dans le DOM
  queueMicrotask(() => {
    if (!L) { mapEl.textContent = 'La bibliothèque de carte n\'a pas pu se charger. La saisie par adresse ou coordonnées reste possible.'; mapEl.classList.add('map-fail'); refresh(); return; }
    map = L.map(mapEl, { zoomControl: false, attributionControl: true }).setView(hasPoint() ? [p.lat, p.lon] : [46.6, 2.4], hasPoint() ? 16 : 5);
    map.attributionControl.setPrefix(false);
    setMode(mode);
    airOverlay = L.layerGroup().addTo(map);
    map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, '', { recenter: false }));
    drawMarker(false);
    drawAerodataOverlay();
    setTimeout(() => map.invalidateSize(), 50);
    refresh();
  });
  refresh();
  return { el: root, destroy() { map?.remove(); } };
}
