import { h, icon, toast } from '../ui/dom.js';
import { mutate } from '../state.js';
import { missionUrl, isStepDone } from '../ui/layout.js';
import { FORMS, formValidated } from '../lib/forms.js';
import { CHECKLISTS, checklistProgress } from '../lib/checklists.js';

function hasCheminementMap(mission){
  const d=mission.macloeMap||{};
  return (Array.isArray(d.route)&&d.route.length>=2)||(Array.isArray(d.polygon)&&d.polygon.length>=3)||(d.start&&d.end);
}
function checklistState(mission){
  let required=0,done=0,touched=false;
  for(const def of CHECKLISTS){
    const st=mission.checklists?.[def.id]||{};
    const p=checklistProgress(def,st);
    required+=p.total;done+=p.done;
    if(Object.keys(st).length)touched=true;
  }
  return {required,done,touched,complete:required>0&&done===required};
}
function statusPill(label,cls=''){
  return h('span',{class:'prep-hub-status '+cls},label);
}

export function renderEtapes({mission}){
  const root=h('main',{class:'screen scroll prep-hub-screen'});

  function draw(){
    const mensExternal=mission.workflow?.mensExternal===true;
    const mensDone=isStepDone(mission,{key:'mens'});
    const macloeDone=formValidated(FORMS.macloe,mission.validation?.macloe);
    const smeppDone=formValidated(FORMS.smepp,mission.validation?.smepp);
    const checks=checklistState(mission);
    const routeMap=hasCheminementMap(mission);

    const open=(route,label)=>h('a',{class:'btn primary block prep-hub-open',href:missionUrl(mission.id,route)},label,icon('arrow',18));

    const card=({n,title,subtitle,status,statusClass='',route,actions=null,iconName='check'})=>
      h('section',{class:'prep-hub-card'},
        h('div',{class:'prep-hub-card-head'},
          h('span',{class:'prep-hub-num'},String(n)),
          h('span',{class:'prep-hub-icon'},icon(iconName,22)),
          h('div',{class:'prep-hub-card-copy'},h('strong',{},title),h('small',{},subtitle)),
          statusPill(status,statusClass)),
        actions||open(route,'Ouvrir'));

    root.replaceChildren(
      h('header',{class:'prep-hub-head'},
        h('button',{class:'icon-btn','aria-label':'Retour à la zone',onclick:()=>{location.hash=missionUrl(mission.id,'lieu');}},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},mission.name),h('h1',{},'Choisir l’étape'))),
      h('div',{class:'body prep-hub-body'},
        h('p',{class:'prep-hub-intro'},'Après la zone de mission, ouvre la partie que tu veux renseigner. L’ordre conseillé reste le même qu’aujourd’hui.'),

        card({
          n:3,title:'MENS',subtitle:'Météo · Espace · NOTAM · SUP AIP',
          status:mensExternal?'Fait ailleurs':mensDone?'Terminé':'Optionnel',
          statusClass:mensExternal||mensDone?'done':'optional',iconName:'sun',
          actions:h('div',{class:'prep-hub-actions two'},
            h('a',{class:'btn primary',href:missionUrl(mission.id,'meteo')},'Ouvrir'),
            h('button',{
              class:'btn ghost',
              onclick:()=>{
                mutate(mission,(m)=>{m.workflow||={};m.workflow.mensExternal=!mensExternal;});
                toast(mensExternal?'MENS à nouveau à réaliser dans l’application':'MENS marqué comme réalisé ailleurs');
                draw();
              }
            },mensExternal?'✓ Fait ailleurs':'Fait ailleurs'))
        }),

        card({
          n:4,title:'MACLOE',
          subtitle:'Mission · Allure · Cheminement · Ligne de débouché · Objectif · Esquive',
          status:macloeDone?'Terminé':'À compléter',statusClass:macloeDone?'done':'todo',
          route:'macloe',iconName:'locate'
        }),

        card({
          n:5,title:'SMEPP',
          subtitle:'Situation · Mission · Exécution · Points particuliers · Place du chef',
          status:smeppDone?'Terminé':'À compléter',statusClass:smeppDone?'done':'todo',
          route:'smepp',iconName:'check'
        }),

        card({
          n:6,title:'Check-lists',
          subtitle:'Avant départ · Sur zone · Décollage · Pannes · Atterrissage · Retour',
          status:checks.complete?'Terminées':checks.touched?'En cours':'Optionnel',
          statusClass:checks.complete?'done':'optional',
          route:'checklists',iconName:'check'
        }),

        h('section',{class:'prep-hub-bonus'},
          h('span',{class:'lbl'},'Outil bonus'),
          h('div',{class:'prep-hub-bonus-row'},
            h('span',{class:'prep-hub-icon'},icon('locate',22)),
            h('div',{class:'prep-hub-card-copy'},
              h('strong',{},'Carte de cheminement'),
              h('small',{},routeMap?'Tracé enregistré · profil altimétrique disponible':'Tracé · polygone · départ/arrivée · profil altimétrique')),
            statusPill(routeMap?'Carte OK':'Bonus',routeMap?'done':'optional')),
          h('a',{class:'btn ghost block',href:missionUrl(mission.id,'cheminement')},routeMap?'Modifier la carte':'Ouvrir la carte',icon('arrow',18))),

        h('a',{class:'cta primary prep-hub-summary',href:missionUrl(mission.id,'fiche')},
          h('span',{},'Voir la synthèse mission'),icon('arrow'))
      )
    );
  }

  draw();
  return {el:root};
}
