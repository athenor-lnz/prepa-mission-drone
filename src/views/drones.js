import { h, icon } from '../ui/dom.js';

const DRONES=[
  {
    id:'neo',name:'DJI Neo',image:'https://shop.theclub.com.hk/media/catalog/product/cache/3f2912b10d0df07b005f8dcd4558e949/p/d/pd-36912_2.jpg',
    source:'https://www.dji.com/neo',
    specs:[
      ['Poids / classe','135 g · C0'],['Autonomie','18 min'],['Résistance au vent','28 km/h'],['Vitesse','21 / 28 / 58 km/h · N / S / Manuel'],
      ['Portée de fonctionnement','50 m'],['Zoom','Non'],['Étanche','Non'],['Thermique','Non']
    ]
  },
  {
    id:'avata-2',name:'DJI Avata 2',image:'https://i5.walmartimages.com/asr/57179345-4db6-473e-bf6f-53b571e0ccb6.b1b3d7ef40585b382f797091e0ab7534.jpeg?odnBg=FFFFFF&odnHeight=2000&odnWidth=2000',
    source:'https://www.dji.com/avata-2',
    specs:[
      ['Poids / classe','377 g · C1'],['Autonomie','23 min'],['Résistance au vent','38 km/h'],['Vitesse','29 / 57 / 97 km/h · N / S / Manuel'],
      ['Élongation en vue','100 m'],['Zoom','Non'],['Étanche','Non'],['Thermique','Non']
    ]
  },
  {
    id:'mavic-2',name:'DJI Mavic 2',image:'https://api.everse.in/storage/538938ce05c5f63978d58412fd14e6ca/DJI-Mavic-2-Enterprise-Advanced-Drone-camera.webp',
    source:'https://www.dji.com/mavic-2-enterprise-advanced',
    specs:[
      ['Poids / classe','909 g · C2'],['Autonomie','31 min'],['Résistance au vent','36 km/h'],['Vitesse','50 / 72 km/h · P / S'],
      ['Élongation en vue','230 m'],['Zoom','Variable selon modèles'],['Étanche','Non'],['Thermique','Enterprise Advanced'],
      ['Accessoires','Beacon · Speaker · Spotlight · RTK'],['Modèles','Enterprise · Advanced · Dual · Pro · Zoom']
    ]
  },
  {
    id:'mavic-3',name:'DJI Mavic 3',image:'https://www.djistoreturkiye.com/img/products/dji-mavic-3t-3_23.11.2022_f150b26.webp',
    source:'https://enterprise.dji.com/mavic-3-enterprise',
    specs:[
      ['Poids / classe','920 g · C2'],['Autonomie','46 min'],['Résistance au vent','43 km/h'],['Vitesse','54 / 76 km/h · P / S'],
      ['Élongation en vue','250 m'],['Zoom optique / numérique','×7 / ×56'],['Étanche','Non'],['Thermique','M3T'],
      ['Accessoires','Beacon · Speaker · Spotlight · RTK'],['Modèles','M3 Pro · M3E · M3T']
    ]
  },
  {
    id:'matrice-4',name:'DJI Matrice 4',image:'https://defpoint.ua/image/cache/catalog/kvadrokoptery/13475/kvadrokopter-dji-matrice-4t-1-1700x1700.jpg',
    source:'https://www.dji.com/matrice-4-series',
    specs:[
      ['Poids / classe','1 200 g · C2'],['Autonomie','49 min'],['Résistance au vent','43 km/h'],['Vitesse','54 / 76 km/h · P / S'],
      ['Élongation en vue','300 m'],['Zoom optique / numérique','×16 / ×112'],['Étanche','Non'],['Télémètre laser','1 800 m'],
      ['Thermique','M4T'],['Accessoires','Speaker AS1 · Spotlight AL1 · RTK intégré'],['Modèles','M4E · M4T']
    ]
  },
  {
    id:'mini-2',name:'DJI Mavic Mini 2',image:'https://i5.walmartimages.com/seo/DJI-Mini-2-Ultralight-Foldable-Drone-Quadcopter-3-Axis-Gimbal-4K-Camera-12MP-Photo-31-Mins-Flight-Time-OcuSync-2-0-10km-HD-Video-Transmission-QuickSh_7d56effc-46d4-4022-aa31-6514c6c34c34.1a0c1b00427b2d7cc49506b0cf653cb2.jpeg?odnBg=FFFFFF&odnHeight=768&odnWidth=768',
    source:'https://www.dji.com/mini-2',
    specs:[
      ['Poids / classe','249 g · C0'],['Autonomie','31 min'],['Résistance au vent','39 km/h'],['Vitesse','36 / 58 km/h · P / S'],
      ['Élongation en vue','160 m'],['Zoom','—'],['Étanche','Non'],['Thermique','Non'],['Accessoires','Cage de protection des hélices'],['Modèles','Mini 2 · Mini 2 SE']
    ]
  },
  {
    id:'mini-4',name:'DJI Mavic Mini 4',image:'https://djistoresverige.se/cdn/shop/files/DJIMini4Pro-2_5c6939c4-d5b7-4c13-92e2-a75c834adf1c.jpg?format=webp&v=1749197910&width=1080',
    source:'https://www.dji.com/mini-4-pro',
    specs:[
      ['Poids / classe','249 g · C0'],['Autonomie','34 min'],['Résistance au vent','39 km/h'],['Vitesse','43 / 58 km/h · P / S'],
      ['Élongation en vue','160 m'],['Zoom optique / numérique','Numérique ×4'],['Étanche','Non'],['Thermique','Non'],
      ['Accessoires','Cage de protection des hélices'],['Modèles','Mini 4 · Mini 4 Pro']
    ]
  },
  {
    id:'matrice-30',name:'DJI Matrice 30',image:'https://images.squarespace-cdn.com/content/v1/624cf3e05b54c2278195d5e3/1707290959516-7BPI9PRPM8M212SO2P7I/dji-m30t-web-4-tr.png',
    source:'https://www.dji.com/matrice-30',
    specs:[
      ['Poids / classe','3 770 g · C2'],['Autonomie','41 min'],['Résistance au vent','54 km/h'],['Vitesse','61 / 83 km/h · P / S'],
      ['Élongation en vue','430 m'],['Zoom optique / numérique','×16 / ×200'],['Étanche','Oui'],['Thermique','M30T'],
      ['Télémètre laser','1 200 m'],['Accessoires','Beacon · Speaker · Spotlight · RTK'],['Modèles','M30 · M30T']
    ]
  },
  {
    id:'matrice-300',name:'DJI Matrice 300',image:'https://www.buzzflyer.co.uk/Images/Products/4031/p4031_02_CJOGF.jpg',
    source:'https://www.dji.com/matrice-300',
    specs:[
      ['Poids / classe','6 300 g sans optique · C3'],['Autonomie','55 min'],['Résistance au vent','54 km/h'],['Vitesse','61 / 83 km/h · P / S'],
      ['Élongation en vue','570 m'],['Zoom optique / numérique','Selon optique'],['Étanche','Oui'],['Thermique','Oui'],['Accessoires','Nombreux accessoires']
    ],
    accessories:[
      ['DJI Zenmuse Z30',[
        ['Poids','556 g'],['Zoom optique / numérique','×30 / ×6 (×180)'],['Mémoire','Carte SD'],['Résolution photo','2,13 MP'],['Résolution vidéo','FHD 1920×1080'],['Thermique','Non'],['Télémètre laser','Non']
      ]],
      ['DJI Zenmuse H20T',[
        ['Poids','828 g'],['Zoom optique hybride','×30 à ×200'],['Mémoire','Carte SD'],['Résolution photo','20 MP'],['Résolution vidéo','4K'],['Thermique','Oui'],['Télémètre laser','1 200 m']
      ]],
      ['DJI Wingsland Z15 Gimbal',[
        ['Poids','500 g'],['Puissance','40 W'],['Système','LED'],['Portée','150 m']
      ]]
    ]
  }
];

const spec=(d,label)=>d.specs.find((x)=>x[0]===label)?.[1]||'—';

function fallbackImage(e){
  e.currentTarget.onerror=null;
  e.currentTarget.src='icons/drone-logo.svg?v=11';
  e.currentTarget.classList.add('fallback');
}
function quickStat(label,value){return h('div',{class:'drone-quick-stat'},h('span',{},label),h('strong',{},value));}
function card(d){
  return h('a',{class:'drone-catalog-card',href:'#/drones/'+d.id},
    h('div',{class:'drone-photo-wrap'},h('img',{class:'drone-photo',src:d.image,alt:d.name,loading:'lazy',referrerpolicy:'no-referrer',onerror:fallbackImage})),
    h('div',{class:'drone-card-body'},
      h('div',{class:'drone-card-title'},h('div',{},h('span',{class:'eyebrow'},'Drone'),h('h2',{},d.name)),icon('arrow',22)),
      h('div',{class:'drone-quick-grid'},
        quickStat('Poids',spec(d,'Poids / classe').split('·')[0].trim()),
        quickStat('Classe',spec(d,'Poids / classe').split('·')[1]?.trim()||'—'),
        quickStat('Autonomie',spec(d,'Autonomie')),
        quickStat('Vent',spec(d,'Résistance au vent')))
    ));
}
function specTable(rows){
  return h('div',{class:'drone-spec-list'},...rows.map(([k,v])=>h('div',{class:'drone-spec-row'},h('span',{},k),h('strong',{},v))));
}
export function renderDrones({id=null}={}){
  const root=h('main',{class:'screen scroll drone-library'});
  const d=id?DRONES.find((x)=>x.id===id):null;
  if(id&&!d){
    location.hash='#/drones';return {el:root};
  }
  if(!d){
    let query='';
    const list=h('div',{class:'drone-catalog-grid'},...DRONES.map(card));
    const search=h('input',{
      type:'search',placeholder:'Rechercher un drone…','aria-label':'Rechercher un drone',
      oninput:(e)=>{
        query=e.target.value.trim().toLowerCase();
        list.replaceChildren(...DRONES.filter((x)=>x.name.toLowerCase().includes(query)).map(card));
      }
    });
    root.replaceChildren(
      h('header',{class:'drone-library-head'},
        h('a',{class:'icon-btn',href:'#/','aria-label':'Retour'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},'Bibliothèque technique'),h('h1',{},'Drones'))),
      h('div',{class:'body drone-library-body'},
        h('p',{class:'drone-library-intro'},'Caractéristiques techniques des drones de la flotte de référence. Touchez un modèle pour ouvrir sa fiche complète.'),
        search,
        list
      )
    );
    return {el:root};
  }
  root.replaceChildren(
    h('header',{class:'drone-library-head'},
      h('a',{class:'icon-btn',href:'#/drones','aria-label':'Retour'},icon('back')),
      h('div',{},h('span',{class:'eyebrow'},'Fiche drone'),h('h1',{},d.name))),
    h('div',{class:'body drone-detail-body'},
      h('section',{class:'drone-hero'},
        h('img',{src:d.image,alt:d.name,referrerpolicy:'no-referrer',onerror:fallbackImage}),
        h('div',{class:'drone-hero-title'},h('h2',{},d.name),h('span',{class:'pill'},spec(d,'Poids / classe')))),
      h('section',{class:'drone-detail-highlights'},
        quickStat('Autonomie',spec(d,'Autonomie')),
        quickStat('Vent max',spec(d,'Résistance au vent')),
        quickStat('Élongation',spec(d,'Élongation en vue')!=='—'?spec(d,'Élongation en vue'):spec(d,'Portée de fonctionnement')),
        quickStat('Thermique',spec(d,'Thermique'))),
      h('section',{class:'card-sec drone-spec-card'},
        h('h2',{},'Caractéristiques'),
        specTable(d.specs)),
      d.accessories?.length?h('section',{class:'card-sec drone-accessories'},
        h('h2',{},'Accessoires Matrice 300'),
        ...d.accessories.map(([name,rows])=>h('article',{class:'drone-accessory'},
          h('h3',{},name),specTable(rows)
        ))):null,
      h('a',{class:'btn ghost block drone-source-link',href:d.source,target:'_blank',rel:'noopener noreferrer'},'Voir la page constructeur ↗')
    )
  );
  return {el:root};
}
