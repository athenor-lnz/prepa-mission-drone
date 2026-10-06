const TILES={
  plan:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap',max:19},
  sat:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Imagerie © Esri',max:19},
  oaci:{url:'https://data.geopf.fr/private/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI&STYLE=normal&TILEMATRIXSET=PM_6_11&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&apikey=ign_scan_ws',attr:'OACI-VFR © DSNA/SIA · Géoplateforme',max:20,native:11,min:6}
};

export function tileConfig(name='sat'){return TILES[name]||TILES.sat;}

export function missionMapItems(mission){
  const m=mission.macloeMap||{};
  const a=m.annotations||{};
  return {
    route:Array.isArray(m.route)?m.route:[],
    missionPoint:Number.isFinite(mission.place?.lat)&&Number.isFinite(mission.place?.lon)?{lat:mission.place.lat,lon:mission.place.lon}:null,
    radiusM:Number(mission.place?.radiusM)||0,
    lLines:Array.isArray(a.L?.lines)?a.L.lines:[],
    eLines:Array.isArray(a.E?.lines)?a.E.lines:[],
    zones:Array.isArray(a.E?.zones)?a.E.zones:[],
    pois:Array.isArray(m.pois)?m.pois:[]
  };
}
function safeLabel(s){return String(s||'').replace(/[<>&"]/g,'').slice(0,80);}
function labelIcon(L,text,color){
  return L.divIcon({
    className:'final-label-icon',
    html:'<span style="--label-color:'+color+'">'+safeLabel(text)+'</span>',
    iconSize:[160,28],iconAnchor:[80,14]
  });
}
export function drawMissionMap(L,map,mission,{labels=true,showRadius=true}={}){
  const group=L.layerGroup().addTo(map);
  const data=missionMapItems(mission);
  const pts=[];
  const addPts=(arr)=>arr?.forEach((p)=>{if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lon))pts.push([p.lat,p.lon]);});

  if(showRadius&&data.missionPoint&&data.radiusM>0){
    L.circle([data.missionPoint.lat,data.missionPoint.lon],{
      radius:data.radiusM,color:'#1976D2',weight:3,dashArray:'8 6',fillColor:'#1976D2',fillOpacity:.04
    }).addTo(group);
  }
  if(data.missionPoint){
    L.circleMarker([data.missionPoint.lat,data.missionPoint.lon],{
      radius:8,color:'#fff',weight:3,fillColor:'#1976D2',fillOpacity:1
    }).bindTooltip('Point mission').addTo(group);
    pts.push([data.missionPoint.lat,data.missionPoint.lon]);
  }
  if(data.route.length>=2){
    L.polyline(data.route.map((p)=>[p.lat,p.lon]),{color:'#1976D2',weight:5,opacity:.95}).addTo(group);
    data.route.forEach((p,i)=>{
      const text=i===0?'D':i===data.route.length-1?'A':String(i+1);
      L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',weight:3,fillColor:'#1976D2',fillOpacity:1})
        .bindTooltip(text,{permanent:false}).addTo(group);
    });
    addPts(data.route);
  }
  const drawLine=(x,kind)=>{
    if(!Array.isArray(x.points)||x.points.length<2)return;
    const color=x.color||'#C2185B';
    L.polyline(x.points.map((p)=>[p.lat,p.lon]),{color,weight:5,opacity:.95}).addTo(group);
    if(labels){
      const p=x.points[Math.floor(x.points.length/2)];
      L.marker([p.lat,p.lon],{interactive:false,icon:labelIcon(L,x.name||kind,color)}).addTo(group);
    }
    addPts(x.points);
  };
  data.lLines.forEach((x)=>drawLine(x,'Ligne de débouché'));
  data.eLines.forEach((x)=>drawLine(x,'Ligne d’esquive'));
  data.zones.forEach((z)=>{
    if(!Array.isArray(z.points)||z.points.length<3)return;
    const color=z.color||'#43A047';
    L.polygon(z.points.map((p)=>[p.lat,p.lon]),{color,weight:3,fillColor:color,fillOpacity:.2}).addTo(group);
    if(labels){
      const p=z.points[Math.floor(z.points.length/2)];
      L.marker([p.lat,p.lon],{interactive:false,icon:labelIcon(L,z.name||'Zone de dégagement',color)}).addTo(group);
    }
    addPts(z.points);
  });
  data.pois.forEach((p)=>{
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return;
    const color=p.color||'#CDB23A';
    const marker=L.circleMarker([p.lat,p.lon],{radius:8,color:'#fff',weight:3,fillColor:color,fillOpacity:1}).addTo(group);
    marker.bindTooltip(p.name||'POI');
    if(labels)L.marker([p.lat,p.lon],{interactive:false,icon:labelIcon(L,p.name||'POI',color)}).addTo(group);
    pts.push([p.lat,p.lon]);
  });
  return {group,bounds:pts.length?L.latLngBounds(pts):null,data};
}
