import { h, icon, toast, copyText, sheet } from '../ui/dom.js';
import { topbar, ctaBar, ctaButton, segmented, missionUrl } from '../ui/layout.js';
import { mutate } from '../state.js';
import { formatAll } from '../lib/geo.js';
import { search } from '../services/geocode.js';
import { micButton } from '../ui/dictate.js';
import { openTools } from './outils.js';
import { info as aerodataInfo, analyzeAerodata } from '../services/aerodata.js';

const RADII = [50, 100, 300, 500, 1000, 2000];
const TILES = {
  plan: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', max: 19 },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagerie © Esri', max: 19 },
  oaci: {
    url: 'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws',
    attr: 'Carte OACI-VFR © DSNA/SIA · Géoplateforme',
    max: 20, native: 11, min: 6
  }
};

export function renderLieu({ mission }) {
  const L = globalThis.L;
  const mapEl = h('div', { class: 'map', id: 'map', role: 'application', 'aria-label': 'Carte : touchez pour placer le point' });
  const root = h('main', { class: 'screen lieu' }, mapEl);
  let map; let marker; let circle; let layer; let airOverlay; let mode = 'plan';
  let fmt = 'dms'; let showAerodata = true;
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
      circle = L.circle(ll, { radius: p.radiusM, color: '#2F80ED', fillColor: '#2F80ED', weight: 3, dashArray: '8 6', fillOpacity: 0.12 }).addTo(map);
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
    layer = L.tileLayer(t.url, { minZoom: t.min, maxZoom: t.max, maxNativeZoom: t.native || t.max, attribution: t.attr, keepBuffer: 4 });
    let warned = false;
    layer.on('tileerror', () => { if (!warned) { warned = true; toast('Fond de carte indisponible (réseau).', 'bad'); } });
    layer.addTo(map);
  }

  async function drawAerodataOverlay() {
    if (!map || !hasPoint()) return;
    if (!airOverlay) airOverlay = L.layerGroup().addTo(map);
    airOverlay.clearLayers();
    if (!showAerodata) return;
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

  function locationHelp(message) {
    let sh;
    sh = sheet('Localisation', h('div', { class: 'stack' },
      h('div', { class: 'banner warn' }, icon('warn'), h('span', {}, message)),
      h('p', { class: 'note' }, 'Sur Android, vérifie aussi : Réglages du téléphone → Applications → ton navigateur ou Prépa Mission Drone → Autorisations → Position.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => sh.close() }, 'Fermer'),
        h('button', { class: 'btn primary', onclick: () => { sh.close(); locateMe(); } }, 'Réessayer'))));
  }

  const getPosition = (options) => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

  async function locateMe() {
    if (!globalThis.isSecureContext) {
      locationHelp('La localisation nécessite une connexion HTTPS.');
      return;
    }
    if (!navigator.geolocation) {
      locationHelp('La géolocalisation n’est pas disponible sur cet appareil ou dans ce navigateur.');
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          locationHelp('L’accès à la position est actuellement refusé pour cette application.');
          return;
        }
      }
    } catch { /* certains navigateurs ne permettent pas de lire cet état */ }

    searchMsg.textContent = 'Recherche de votre position…';
    let pos;
    try {
      pos = await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch (firstError) {
      if (firstError?.code === 1) {
        searchMsg.textContent = '';
        locationHelp('L’accès à la position a été refusé.');
        return;
      }
      try {
        pos = await getPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
      } catch (secondError) {
        searchMsg.textContent = '';
        const reason = secondError?.code === 3
          ? 'La recherche de position a expiré. Vérifie que la localisation du téléphone est activée.'
          : 'La position n’a pas pu être déterminée. Vérifie les autorisations et le service de localisation.';
        locationHelp(reason);
        return;
      }
    }

    const accuracy = Math.round(pos.coords.accuracy || 0);
    setPoint(pos.coords.latitude, pos.coords.longitude, 'Ma position');
    searchMsg.textContent = accuracy ? `Position trouvée · précision ± ${accuracy} m` : 'Position trouvée';
    toast(accuracy ? `Position trouvée · ± ${accuracy} m` : 'Position trouvée');
  }

  const input = h('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Adresse ou coordonnées', 'aria-label': 'Adresse ou coordonnées', value: p.label || '' });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(input.value); } });

  function coordinateSheet() {
    let sh;
    const value = h('div', { class: 'coord-sheet-value mono' }, coordText.textContent);
    const picker = segmented(
      [{ value: 'dd', label: 'DD' }, { value: 'ddm', label: 'DDM' }, { value: 'dms', label: 'DMS' }, { value: 'utm', label: 'UTM' }],
      fmt,
      (v) => {
        fmt = v;
        refresh();
        value.textContent = coordText.textContent;
        [...picker.children].forEach((b, i) => b.classList.toggle('on', ['dd','ddm','dms','utm'][i] === v));
      },
      'Format des coordonnées'
    );
    sh = sheet('Coordonnées', h('div', { class: 'stack' },
      picker,
      value,
      h('button', { class: 'btn ghost block', onclick: () => hasPoint() && copyText(coordText.textContent, 'Coordonnées copiées') }, icon('copy'), 'Copier les coordonnées')));
  }

  function layersSheet() {
    let sh;
    const base = (value, label) => h('button', {
      class: mode === value ? 'on' : '',
      'aria-pressed': String(mode === value),
      onclick: () => { setMode(value); sh.close(); layersSheet(); }
    }, label);
    const overlayBtn = h('button', {
      class: showAerodata ? 'check-choice on' : 'check-choice',
      'aria-pressed': String(showAerodata),
      onclick: () => {
        showAerodata = !showAerodata;
        overlayBtn.classList.toggle('on', showAerodata);
        overlayBtn.setAttribute('aria-pressed', String(showAerodata));
        drawAerodataOverlay();
      }
    }, h('span', { class: 'check-dot' }, showAerodata ? icon('check', 16) : ''), h('span', {}, 'Espaces & aérodromes GeoGM / SIA'));
    sh = sheet('Couches cartographiques', h('div', { class: 'stack' },
      h('div', {}, h('span', { class: 'lbl' }, 'Fond de carte'), h('div', { class: 'seg map-base-picker' },
        base('plan', 'Plan'), base('sat', 'Satellite'), base('oaci', 'OACI'))),
      h('div', {}, h('span', { class: 'lbl' }, 'Superpositions'), h('div', { class: 'check-list' }, overlayBtn)),
      h('p', { class: 'note' }, 'Les données aéronautiques locales apparaissent uniquement si le jeu GeoGM / SIA a déjà été importé.')));
  }

  const panel = h('section', { class: 'panel zone-panel' },
    h('div', { class: 'grab' }),
    h('div', { class: 'zone-panel-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, 'Zone de mission'), h('strong', {}, hasPoint() ? 'Point défini' : 'Choisir un point')),
      radiusTag),
    h('div', { class: 'search zone-search' }, icon('search'), input,
      micButton({ label: 'Dicter une adresse', onText: (t) => { input.value = t; doSearch(t); } }),
      h('button', { class: 'icon-btn', 'aria-label': 'Lancer la recherche', onclick: () => doSearch(input.value) }, icon('arrow'))),
    results, searchMsg,
    h('button', { class: 'zone-coordinate', onclick: coordinateSheet, 'aria-label': 'Afficher les coordonnées et changer de format' },
      h('span', { class: 'zone-coordinate-copy' }, h('span', { class: 'lbl' }, 'Coordonnées'), coordText),
      h('span', { class: 'zone-coordinate-format' }, fmt.toUpperCase()),
      icon('arrow', 18)),
    h('div', { class: 'zone-radius-head' }, h('span', { class: 'lbl' }, 'Rayon de mission'), h('span', { class: 'note' }, 'Touchez la carte pour déplacer le point')),
    h('div', { class: 'radii zone-radii', role: 'group', 'aria-label': 'Rayon de travail' },
      RADII.map((r) => h('button', { 'data-r': r, 'aria-pressed': 'false', onclick: () => { mutate(mission, (m) => { m.place.radiusM = r; }); circle?.setRadius(r); fit(); refresh(); drawAerodataOverlay(); } }, r >= 1000 ? `${r / 1000} km` : `${r} m`))));

  const mapBtns = h('div', { class: 'map-ctl map-stack zone-map-tools' },
    h('button', { class: 'icon-btn float', 'aria-label': 'Ma position', onclick: locateMe }, icon('locate')),
    h('button', { class: 'icon-btn float', 'aria-label': 'Couches cartographiques', onclick: layersSheet }, icon('layers')),
    h('button', { class: 'icon-btn float', 'aria-label': 'Zoom avant', onclick: () => map?.zoomIn() }, icon('plus')),
    h('button', { class: 'icon-btn float', 'aria-label': 'Zoom arrière', onclick: () => map?.zoomOut() }, icon('minus')));

  root.append(
    topbar(mission, 'lieu'),
    h('div', { class: 'dock zone-dock' }, h('div', { class: 'dock-ctl zone-dock-ctl' }, mapBtns), panel),
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
