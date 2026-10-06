// Check-lists opérationnelles drone — V1 issue des fiches terrain.
// Le contenu reste éditable : cette structure alimente le menu et les écrans de validation.

export const CHECKLISTS = [
  {
    id:'usage', title:"Cas d’usage", subtitle:'Rappel rapide des scénarios et distances', tone:'info',
    sections:[
      { title:'Repères', items:[
        ['ouverte','Catégorie ouverte','C0, C1, C2 · DGA selon matériel'],
        ['usage11',"Cas d’usage 1.1",'Vol en vue · jour/nuit · observateur possible'],
        ['usage22',"Cas d’usage 2.2",'Vol en vue · contraintes de distance et de hauteur'],
        ['d30','Distance 30 m','Distance de sécurité selon le cas retenu'],
        ['d50','Distance 50 m','Distance de sécurité selon le cas retenu'],
        ['d120','Distance 120 m','Distance / hauteur à vérifier selon scénario'],
        ['pers','Survol de personnes','Vérifier le régime applicable'],
        ['height','Hauteur maximale','Vérifier la limite applicable au cas d’usage']
      ]}
    ]
  },
  {
    id:'depart', title:'Avant le départ', subtitle:'Préparation matériel et mission', tone:'accent',
    sections:[
      { title:'Mises à jour', items:[
        ['apad_update','APAD à jour','Version / firmware / bases de données'],
        ['rc_update','Radiocommande à jour','Firmware et paramètres'],
        ['app_update','Application opérationnelle','Connexion et fonctionnement'],
        ['calib','Calibration drone','Si besoin']
      ]},
      { title:'Présence', items:[
        ['apad_present','APAD / radiocommande','Présence et état général'],
        ['batt_count','Batteries','Nombre suffisant'],
        ['charger','Chargeur batterie / RC','Présent'],
        ['dropzone','Drop zone','Présente'],
        ['sd','Cartes SD','Présentes et formatées']
      ]},
      { title:'Charge', items:[
        ['rc_charge','Radiocommande','Charge suffisante'],
        ['batt_charge','Batteries','Charge suffisante'],
        ['cut_charge','Coupe-circuit','Charge suffisante si applicable']
      ]},
      { title:'Vérifications matériel', items:[
        ['sensors','Capteurs','État et propreté'],
        ['apad_check','APAD','État général'],
        ['arms','Bras','État / verrouillage'],
        ['cams','Caméras','État et fonctionnement'],
        ['props','Hélices','État et fixation'],
        ['rc_check','Radiocommande','État et fonctionnement'],
        ['parachute','Parachute','Si applicable'],
        ['clean','Nettoyage','Effectué'],
        ['cables','Accessoires et câbles','Complets']
      ]},
      { title:'Enregistrement mission', items:[
        ['gendrone','Gendrone','Demande de mission'],
        ['visualdrone','Visu@ldrone','Préparer / vérifier l’enregistrement']
      ]}
    ]
  },
  {
    id:'zone', title:'Sur zone', subtitle:'Analyse et sécurisation de la zone', tone:'info',
    sections:[
      { title:'Zone', items:[
        ['weather','Météo','Compatible avec le vol'],
        ['environment','Environnement','Vérifié'],
        ['vlos','Vol en vue','Maintenu'],
        ['reco','Reconnaître le terrain','Si nécessaire'],
        ['dz','Zone de décollage','Identifiée et protégée'],
        ['mission_zone','Zone de mission / itinéraire','Définie'],
        ['escape','Zones de dégagement','Identifiées']
      ]},
      { title:'Radiocommande', items:[
        ['rc_state','État RC','Vérifié'],
        ['rc_level','Niveau de charge','Suffisant'],
        ['antennas','Antennes déployées','OK']
      ]},
      { title:'APAD', items:[
        ['drone_dz','Drone sur zone','Présent'],
        ['cam_protect','Protection caméra retirée','OK'],
        ['sd_inserted','Carte SD insérée','Selon mission'],
        ['preflight','Vérification APAD avant vol','Effectuée']
      ]},
      { title:'Batteries', items:[
        ['battery_state','État batterie','Vérifié'],
        ['battery_level','Niveau de charge','Suffisant'],
        ['battery_fixed','Batterie fixée sur APAD','OK']
      ]}
    ]
  },
  {
    id:'takeoff', title:'Décollage', subtitle:'Préparation et décollage', tone:'accent',
    sections:[
      { title:'Préparation', items:[
        ['rc_on','Radiocommande ON','OK'],
        ['flight_mode','Mode de vol','Vérifié'],
        ['apad_dz','APAD sur DZ','OK'],
        ['apad_on','APAD ON','OK'],
        ['led','Feux LED','Vérifiés'],
        ['app','Application','OK'],
        ['status','Statut APAD','OK'],
        ['compass','Étalonnage compas','Si besoin'],
        ['para_armed','Parachute connecté / armé','Si applicable'],
        ['home','Home Point','Vérifié'],
        ['rth_mode','RTH — Home ou RC','Configuré'],
        ['rth_height','Hauteur RTH','Configurée'],
        ['flight_height','Hauteur de vol','Configurée'],
        ['flight_distance','Distance de vol','Définie'],
        ['rc_loss','Perte RC','Comportement configuré']
      ]},
      { title:'Décollage', items:[
        ['safe_distance','Distance de sécurité objets / tiers','Respectée'],
        ['autonomy','Autonomie batteries et GPS','OK'],
        ['motors','Démarrage moteurs','OK'],
        ['takeoff','Décollage','Effectué'],
        ['hover','Test stationnaire et axes','OK'],
        ['gimbal','Test nacelle','OK']
      ]}
    ]
  },
  {
    id:'ari', title:'Pannes – ARI', subtitle:'Analyser · Rejoindre · Informer', tone:'danger',
    sections:[
      { title:'A — Analyser', items:[
        ['failure','Type de panne / alarme','Identifier le message ou comportement'],
        ['reflex','Action réflexe','Appliquer la procédure adaptée'],
        ['urgency','Niveau d’urgence','Évaluer la gravité'],
        ['consequence','Conséquence','Poursuite mission / se poser / RTH / ERP']
      ]},
      { title:'R — Rejoindre', items:[
        ['safety','Sécurité engagée ?','Choisir la conduite adaptée'],
        ['emergency_cut','Coupure moteur d’urgence (CSC)','Si sécurité engagée'],
        ['immediate_land','Atterrissage immédiat','Selon situation'],
        ['parachute_action','Action coupe-circuit / parachute','Si applicable'],
        ['escape_zone','Zone de dégagement','Si sécurité non engagée'],
        ['start_point','Point de départ','Rejoindre si adapté']
      ]},
      { title:'I — Informer', items:[
        ['buddy','Binôme','Informé'],
        ['atc','Contrôle aérien','Informé si nécessaire'],
        ['aircraft','Autres aéronefs','Information / vigilance'],
        ['chief','Chef du dispositif','Informé'],
        ['authority','Autorité','Informée si nécessaire'],
        ['command','Commandement','Informé']
      ]}
    ]
  },
  {
    id:'landing', title:'Atterrissage', subtitle:"Procédure d’atterrissage", tone:'info',
    sections:[
      { title:'Atterrissage', items:[
        ['landing_dz','DZ','Libre'],
        ['land','Atterrissage','Effectué'],
        ['motors_off','Moteurs coupés','OK'],
        ['apad_off','APAD OFF','OK'],
        ['rc_off','Radiocommande OFF','OK'],
        ['parachute_safe','Parachute sécurisé / déconnecté','Si applicable']
      ]}
    ]
  },
  {
    id:'end', title:'Fin de mission', subtitle:'Rangement et vérifications', tone:'info',
    sections:[
      { title:'Fin de mission', items:[
        ['rc_stowed','Radiocommande','Rangée'],
        ['apad_stowed','APAD','Rangé'],
        ['batt_stowed','Batteries','Nombre total rangé'],
        ['accessories','Accessoires et câbles','Complets / rangés'],
        ['dropzone_stowed','Drop zone','Rangée'],
        ['zone_check','Vérification zone','OK']
      ]}
    ]
  },
  {
    id:'return', title:'Au retour', subtitle:'Nettoyage, charge et archivage', tone:'info',
    sections:[
      { title:'Nettoyage', items:[
        ['clean_apad','APAD / radiocommande','Nettoyés'],
        ['clean_batt','Batteries','Nettoyées / contrôlées'],
        ['clean_dz','Drop zone','Nettoyée']
      ]},
      { title:'Charge', items:[
        ['charge_rc','Radiocommande','Mise en charge'],
        ['charge_batt','Batteries','Mises en charge']
      ]},
      { title:'Carte SD', items:[
        ['sd_extract','Extraction / suppression','Effectuée selon procédure']
      ]},
      { title:'Enregistrements Gendrone', items:[
        ['rema','REMA','Renseigné'],
        ['fea','FEA','Si nécessaire']
      ]}
    ]
  }
];

export const checklistById = (id) => CHECKLISTS.find((x)=>x.id===id) || null;

const OPTIONAL_RE = /\b(si besoin|si applicable|selon mission|si nécessaire|selon situation|si sécurité engagée|si sécurité non engagée|si adapté)\b/i;
export const isOptionalChecklistItem = (hint = '') => OPTIONAL_RE.test(String(hint));

export const checklistItems = (def) => def.sections.flatMap((s)=>s.items.map(([id,label,hint])=>({
  id,label,hint,section:s.title,optional:isOptionalChecklistItem(hint)
})));

export const checklistProgress = (def, state={}) => {
  const items=checklistItems(def);
  const required=items.filter((x)=>!x.optional);
  const optional=items.filter((x)=>x.optional);
  const done=required.filter((x)=>state?.[x.id]===true).length;
  const optionalDone=optional.filter((x)=>state?.[x.id]===true).length;
  return {
    done,
    total:required.length,
    pct:required.length?Math.round(done/required.length*100):100,
    optionalDone,
    optionalTotal:optional.length,
    complete:required.length===0 || done===required.length
  };
};
