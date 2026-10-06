import { h, icon } from '../ui/dom.js';
import { store } from '../state.js';

const FAILURES = {
  camera: {
    title:'Perte caméra',
    icon:'📷',
    symptoms:[
      'Écran noir ou image figée.',
      'Image trouble ou focus impossible.'
    ],
    treatment:[
      'Mouvement du drone : monter ou rapprocher le drone de la radiocommande.',
      'Mouvement du télépilote : s’éloigner des masques et s’orienter vers le drone.'
    ]
  },
  'camera-flight': {
    title:'Caméra + informations de vol',
    icon:'📷',
    symptoms:[
      'Écran noir ou image figée.',
      'Perte des informations liées au vol : vitesse, distance, hauteur…'
    ],
    treatment:[
      'Retour du drone en vue.',
      'RTH.'
    ]
  },
  rc: {
    title:'Perte liaison RC / APAD',
    icon:'📡',
    symptoms:[
      'Message « perte de signal RC ».',
      'Icône de réception du signal (RSSI) rouge ou à zéro.',
      'RTH automatique.',
      'Logiciel grisé ou figé.',
      'Radiocommande inopérante : batterie, choc…'
    ],
    treatment:[
      'Appliquer le comportement programmé : RTH, stationnaire ou posé.'
    ]
  },
  gps: {
    title:'Perte GPS',
    icon:'🛰️',
    symptoms:[
      'Passage en mode dégradé type Vision / OPTI ou ATTI.',
      'Perte de stabilité du drone sur le plan horizontal.',
      'Fonctions avancées hors service.',
      'RTH indisponible.'
    ],
    treatment:[
      'S’éloigner des zones à risque.',
      'Récupérer le drone en marche arrière et en vue.',
      'Poser en manuel dans une zone sécurisée.',
      'Prendre en compte le sens du vent, les personnes et les obstacles.'
    ]
  },
  wind: {
    title:'Alerte vent fort',
    icon:'💨',
    alertOnly:true,
    treatment:[
      'Appliquer la méthode A.R.I. et évaluer le degré d’urgence.',
      'Le support de cours présente cette alerte mais ne précise pas de procédure dédiée supplémentaire.'
    ]
  },
  battery: {
    title:'Batterie faible / critique',
    icon:'🔋',
    alertOnly:true,
    treatment:[
      'Appliquer la méthode A.R.I. et évaluer le degré d’urgence.',
      'Le support de cours présente cette alerte mais ne précise pas de procédure dédiée supplémentaire.'
    ]
  }
};

function header(title, subtitle=''){
  return h('header',{class:'failure-head'},
    h('a',{class:'icon-btn',href:'#/pannes','aria-label':'Retour'},icon('back')),
    h('div',{},subtitle?h('span',{class:'eyebrow'},subtitle):null,h('h1',{},title)));
}

function ariStrip(){
  return h('div',{class:'ari-strip'},
    h('a',{href:'#/pannes/ari/analyser',class:'ari-chip a'},h('strong',{},'A'),h('span',{},'Analyser')),
    h('a',{href:'#/pannes/ari/rejoindre',class:'ari-chip r'},h('strong',{},'R'),h('span',{},'Rejoindre')),
    h('a',{href:'#/pannes/ari/informer',class:'ari-chip i'},h('strong',{},'I'),h('span',{},'Informer'))
  );
}

function zoneDeDegagementCard(){
  const current=store.list()[0];
  const zones=current?.macloeMap?.annotations?.E?.zones||[];
  if(!current||!zones.length)return null;
  return h('section',{class:'failure-zones'},
    h('div',{class:'failure-section-title'},h('span',{},'Zones de dégagement préparées'),h('span',{class:'pill'},String(zones.length))),
    ...zones.map((z)=>h('div',{class:'failure-zone-row'},
      h('span',{class:'failure-zone-dot',style:'--zone:'+ (z.color||'#43A047')}),
      h('div',{},h('strong',{},z.name||'Zone de dégagement'),h('small',{},current.name))
    ))
  );
}

function emergencyView(){
  const el=h('main',{class:'screen scroll failure-screen'});
  const current=store.list()[0];
  el.append(
    header('Mode urgence','A.R.I.'),
    h('div',{class:'body failure-body'},
      h('section',{class:'failure-emergency-banner'},
        h('span',{class:'failure-emergency-icon'},'!'),
        h('div',{},h('strong',{},'Panne ou alerte'),h('span',{},'Action simple · immédiate · méthodique'))),
      h('section',{class:'ari-emergency-step analyser'},
        h('div',{class:'ari-big-letter'},'A'),
        h('div',{},h('h2',{},'Analyser'),h('p',{},'S’éloigner des zones à risque. Action réflexe : monter / descendre / stationnaire / déplacement. Puis évaluer le degré d’urgence.'))),
      h('section',{class:'ari-emergency-step rejoindre'},
        h('div',{class:'ari-big-letter'},'R'),
        h('div',{},h('h2',{},'Rejoindre'),
          h('div',{class:'failure-two-paths'},
            h('div',{class:'safe'},h('strong',{},'Sécurité NON engagée'),h('span',{},'Itinéraire de sécurité → zone de dégagement / point de départ RTH / atterrissage immédiat.')),
            h('div',{class:'danger'},h('strong',{},'Sécurité ENGAGÉE'),h('span',{},'Immédiatement : atterrissage immédiat / coupe-circuit + parachute / coupure moteur d’urgence CSC.'))
          ))),
      zoneDeDegagementCard(),
      current?h('a',{class:'btn ghost block',href:`#/mission/${current.id}/final-map`},'Voir la carte de la mission en cours'):null,
      h('section',{class:'ari-emergency-step informer'},
        h('div',{class:'ari-big-letter'},'I'),
        h('div',{},h('h2',{},'Informer'),h('p',{},'Immédiatement : binôme, contrôle aérien, autres aéronefs, chef du dispositif, commandement, autorité d’emploi…'))),
      h('a',{class:'btn primary block failure-next',href:'#/pannes/ari/informer'},'Voir la liste complète à informer',icon('arrow',18))
    )
  );
  return {el};
}

function ariView(step){
  const el=h('main',{class:'screen scroll failure-screen'});
  const content={
    analyser:{
      title:'Analyser',
      body:h('div',{class:'failure-stack'},
        h('div',{class:'failure-callout blue'},h('strong',{},'Panne ou alerte'),h('span',{},'S’éloigner des zones à risque.')),
        h('section',{class:'failure-card'},
          h('h2',{},'Action réflexe'),
          h('div',{class:'failure-action-grid'},
            ...['Monter','Descendre','Stationnaire','Déplacement'].map((x)=>h('div',{class:'failure-action'},x))),
        h('section',{class:'failure-card'},
          h('h2',{},'Puis analyser'),
          h('p',{},'Analyser l’environnement, la panne ou l’alerte et son degré d’urgence.'),
          h('div',{class:'failure-decision'},
            h('span',{class:'go'},'Poursuivre la mission'),
            h('span',{class:'warn'},'RTH manuel'),
            h('span',{class:'stop'},'Poser')))
      )
    },
    rejoindre:{
      title:'Rejoindre',
      body:h('div',{class:'failure-stack'},
        h('section',{class:'failure-path safe'},
          h('h2',{},'Sécurité NON engagée'),
          h('p',{},'En empruntant un itinéraire de sécurité :'),
          h('ul',{},h('li',{},'Une zone de dégagement'),h('li',{},'Son point de départ RTH'),h('li',{},'Atterrissage immédiat'))),
        h('section',{class:'failure-path danger'},
          h('h2',{},'Sécurité ENGAGÉE'),
          h('p',{},'Immédiatement :'),
          h('ul',{},h('li',{},'Atterrissage immédiat'),h('li',{},'Action sur coupe-circuit et parachute'),h('li',{},'Coupure moteur d’urgence CSC (Combination Stick Command)'))),
        zoneDeDegagementCard())
    },
    informer:{
      title:'Informer',
      body:h('div',{class:'failure-stack'},
        h('section',{class:'failure-path danger'},
          h('h2',{},'Immédiatement'),
          h('ul',{},...[
            'Son binôme','Le service du contrôle aérien','Les autres aéronefs','Le chef du dispositif','Le commandement','L’autorité d’emploi…'
          ].map((x)=>h('li',{},x)))),
        h('section',{class:'failure-path blue'},
          h('h2',{},'A posteriori'),
          h('ul',{},...['Les autorités','Le commandement','GENDRONE / FEA','Le constructeur'].map((x)=>h('li',{},x))))
      )
    }
  }[step]||null;
  if(!content){location.hash='#/pannes';return {el};}
  el.append(header('A.R.I. · '+content.title,'Méthode réflexe'),
    h('div',{class:'body failure-body'},ariStrip(),content.body));
  return {el};
}

function failureDetail(id){
  const d=FAILURES[id];
  const el=h('main',{class:'screen scroll failure-screen'});
  if(!d){location.hash='#/pannes';return {el};}
  el.append(
    header(d.title,d.alertOnly?'Alerte':'Panne'),
    h('div',{class:'body failure-body'},
      h('section',{class:'failure-detail-hero'},
        h('span',{class:'failure-detail-icon'},d.icon),
        h('div',{},h('span',{class:'eyebrow'},d.alertOnly?'Alerte':'Panne'),h('h2',{},d.title))),
      ariStrip(),
      d.symptoms?.length?h('section',{class:'failure-card'},
        h('div',{class:'failure-card-title'},h('span',{class:'failure-symbol danger'},'!'),h('h2',{},'Symptômes')),
        h('ul',{class:'failure-list'},...d.symptoms.map((x)=>h('li',{},x)))):null,
      h('section',{class:'failure-card'},
        h('div',{class:'failure-card-title'},h('span',{class:'failure-symbol blue'},'↻'),h('h2',{},'Traitement')),
        h('div',{class:'failure-treatment'},...d.treatment.map((x,i)=>h('div',{class:'failure-treatment-row'},
          h('span',{class:'failure-step-number'},String(i+1)),h('p',{},x))))),
      d.alertOnly?h('div',{class:'banner warn'},icon('warn',18),h('span',{},'Le support CNIFA ne détaille pas ici une procédure propre à cette alerte. Ne pas ajouter de conduite non prévue par le support.')):null,
      h('a',{class:'btn ghost block',href:'#/pannes/urgence'},'Ouvrir le mode urgence')
    )
  );
  return {el};
}

export function renderPannes({page='',id='' }={}){
  if(page==='urgence')return emergencyView();
  if(page==='ari')return ariView(id);
  if(page==='fiche')return failureDetail(id);

  const el=h('main',{class:'screen scroll failure-screen'});
  el.append(
    h('header',{class:'failure-head'},
      h('a',{class:'icon-btn',href:'#/','aria-label':'Retour'},icon('back')),
      h('div',{},h('span',{class:'eyebrow'},'Télépilote'),h('h1',{},'Pannes & alertes'))),
    h('div',{class:'body failure-body'},
      h('a',{class:'failure-urgent-link',href:'#/pannes/urgence'},
        h('span',{class:'failure-urgent-icon'},'!'),
        h('span',{},h('strong',{},'MODE URGENCE'),h('small',{},'Accès rapide à la procédure A.R.I.')),
        icon('arrow',22)),
      h('section',{class:'failure-section'},
        h('div',{class:'failure-section-title'},h('h2',{},'Méthode réflexe')),
        ariStrip()),
      h('section',{class:'failure-section'},
        h('div',{class:'failure-section-title'},h('h2',{},'Choisir une panne ou une alerte')),
        h('div',{class:'failure-grid'},
          ...Object.entries(FAILURES).map(([key,d])=>h('a',{class:'failure-tile',href:'#/pannes/fiche/'+key},
            h('span',{class:'failure-tile-icon'},d.icon),
            h('strong',{},d.title),
            h('small',{},d.alertOnly?'Alerte':'Panne')))
        ))
    )
  );
  return {el};
}
