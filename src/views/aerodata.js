import { h, icon, toast, confirmDialog } from '../ui/dom.js';
import { info, importAerodata, previewAerodataXml, installAerodataCandidate, clearAerodata } from '../services/aerodata.js';

function fmtDate(v){
  if(!v)return 'Non renseignée';
  const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('fr-FR');
}
function dataCard(label,value,sub=''){
  return h('div',{class:'data-stat'},h('span',{class:'lbl'},label),h('strong',{class:'mono'},value),sub?h('small',{},sub):null);
}
export function renderAerodata(){
  const root=h('main',{class:'screen scroll aerodata-screen'});
  let candidate=null;
  let status='';
  let busy=false;

  const draw=async()=>{
    const meta=await info().catch(()=>null);
    const xmlInput=h('input',{type:'file',accept:'.xml,application/xml,text/xml',hidden:true});
    const zipInput=h('input',{type:'file',accept:'.zip,application/zip',hidden:true});

    const setStatus=(v)=>{status=v;const n=root.querySelector('[data-data-status]');if(n)n.textContent=v;};
    xmlInput.addEventListener('change',async()=>{
      const file=xmlInput.files?.[0];if(!file)return;
      busy=true;candidate=null;draw();
      try{
        candidate=await previewAerodataXml(file,{onProgress:setStatus});
        status='Conversion terminée. Vérifie le résumé avant installation.';
      }catch(e){status=e.message;candidate=null;toast(e.message,'bad');}
      busy=false;draw();
    });
    zipInput.addEventListener('change',async()=>{
      const file=zipInput.files?.[0];if(!file)return;
      busy=true;candidate=null;draw();
      try{
        await importAerodata(file,{onProgress:setStatus});
        status='ZIP GeoJSON installé.';
        toast('Données aéronautiques installées');
      }catch(e){status=e.message;toast(e.message,'bad');}
      busy=false;draw();
    });

    root.replaceChildren(
      h('header',{class:'data-head'},
        h('a',{class:'icon-btn check-back','aria-label':'Retour',href:'#/'},icon('back')),
        h('div',{},h('span',{class:'eyebrow'},'Base locale'),h('h1',{},'Données aéronautiques'))),
      h('div',{class:'body aerodata-body'},
        h('section',{class:'card-sec data-current'},
          h('div',{class:'data-section-head'},h('div',{},h('span',{class:'eyebrow'},'Jeu installé'),h('h2',{},meta?'Base active':'Aucune base locale')),meta?h('span',{class:'pill go'},'ACTIVE'):h('span',{class:'pill unknown'},'VIDE')),
          meta?h('div',{class:'data-grid'},
            dataCard('Espaces',String(meta.spaceCount??0)),
            dataCard('Aérodromes',String(meta.aerodromeCount??0)),
            dataCard('Cycle / effet',meta.effective||'—'),
            dataCard('Import',fmtDate(meta.importedAt))
          ):h('p',{class:'note'},'Importe ton ZIP GeoJSON actuel ou un XML SIA/AIXM.'),
          meta?h('p',{class:'note'},`Source : ${meta.source||'locale'}`):null
        ),

        h('section',{class:'card-sec data-import-card'},
          h('span',{class:'eyebrow'},'Nouvelle base'),
          h('h2',{},'Importer un XML SIA / AIXM'),
          h('p',{class:'note'},'La conversion se fait entièrement sur ce téléphone. Rien n’est envoyé vers un serveur. Le jeu actif n’est remplacé qu’après validation.'),
          h('button',{class:'btn primary block',disabled:busy,onclick:()=>xmlInput.click()},icon('plus',20),busy?'Conversion en cours…':'Choisir un fichier XML'),
          xmlInput,
          h('div',{class:'data-status','data-data-status':'1'},status||'Formats : XML AIXM/GML. V1 : espaces aériens polygonaux et points aérodromes.')
        ),

        candidate?h('section',{class:'card-sec data-preview'},
          h('div',{class:'data-section-head'},h('div',{},h('span',{class:'eyebrow'},'Aperçu avant installation'),h('h2',{},candidate.meta.source)),h('span',{class:'pill warn'},'À VALIDER')),
          h('div',{class:'data-grid'},
            dataCard('Espaces convertis',String(candidate.meta.spaceCount),candidate.meta.skippedSpaces?`${candidate.meta.skippedSpaces} ignoré(s)`:''),
            dataCard('Aérodromes',String(candidate.meta.aerodromeCount),candidate.meta.skippedAerodromes?`${candidate.meta.skippedAerodromes} ignoré(s)`:''),
            dataCard('Cycle / effet',candidate.meta.effective||'—'),
            dataCard('Format',candidate.meta.format||'XML')
          ),
          h('div',{class:'banner warn'},icon('warn',20),h('span',{},'Contrôle recommandé : vérifie les nombres et le cycle avant de remplacer la base active.')),
          h('button',{class:'btn primary block',onclick:async()=>{
            try{
              busy=true;draw();
              await installAerodataCandidate(candidate,{onProgress:setStatus});
              candidate=null;status='Nouveau jeu installé et actif.';toast('Nouveau jeu SIA installé');busy=false;draw();
            }catch(e){busy=false;status=e.message;toast(e.message,'bad');draw();}
          }},'Installer ce jeu de données')
        ):null,

        h('section',{class:'card-sec data-legacy'},
          h('span',{class:'eyebrow'},'Compatibilité'),
          h('h2',{},'Importer le ZIP GeoJSON actuel'),
          h('p',{class:'note'},'Conserve la méthode actuelle : espaces.geojson + aerodromes.geojson + index.json.'),
          h('button',{class:'btn ghost block',disabled:busy,onclick:()=>zipInput.click()},'Choisir un ZIP GeoJSON'),zipInput
        ),

        meta?h('button',{class:'btn ghost danger-text block',onclick:async()=>{
          if(await confirmDialog('Supprimer la base locale ?','Les missions restent conservées, mais la cartographie aéronautique locale sera vide.','Supprimer la base')){
            await clearAerodata();candidate=null;status='Base locale supprimée.';draw();
          }
        }},'Supprimer la base aéronautique locale'):null
      )
    );
  };
  draw();
  return {el:root};
}
