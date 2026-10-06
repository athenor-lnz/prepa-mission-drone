import { h, icon } from '../ui/dom.js';
import { mutate } from '../state.js';
import { CHECKLISTS, checklistById, checklistProgress, isOptionalChecklistItem } from '../lib/checklists.js';
import { missionUrl } from '../ui/layout.js';

const checklistUrl = (missionId,id='') => `#/mission/${missionId}/checklists${id?'/'+id:''}`;

function head(mission,title,back){
  return h('header',{class:'check-head'},
    h('button',{class:'icon-btn check-back','aria-label':'Retour',onclick:()=>{location.hash=back;}},icon('back')),
    h('div',{class:'check-head-copy'},h('span',{class:'eyebrow'},mission.name),h('h1',{},title))
  );
}

function stateOf(mission,id){
  return mission.checklists?.[id] || {};
}

export function renderChecklists({mission}){
  const root=h('main',{class:'screen scroll checklist-screen'});
  const draw=()=>{
    root.replaceChildren(
      head(mission,'Check-lists opérationnelles',missionUrl(mission.id,'fiche')),
      h('div',{class:'body checklist-body'},
        h('p',{class:'check-intro'},'Valide chaque point au fil de la mission. L’avancement est enregistré dans cette mission.'),
        h('div',{class:'check-menu'},
          CHECKLISTS.map((def)=>{
            const p=checklistProgress(def,stateOf(mission,def.id));
            return h('a',{class:`check-card tone-${def.tone}`,href:checklistUrl(mission.id,def.id)},
              h('div',{class:'check-card-icon'},def.id==='ari'?icon('warn',24):def.id==='zone'?icon('locate',24):icon('check',24)),
              h('div',{class:'check-card-copy'},
                h('strong',{},def.title),
                h('span',{},def.subtitle),
                h('div',{class:'check-progress'},h('i',{style:`width:${p.pct}%`}))),
              h('div',{class:'check-card-count mono'},`${p.done}/${p.total}`, p.optionalTotal ? h('small',{},` + ${p.optionalTotal} facult.`) : null),
              icon('arrow',18));
          })
        )
      )
    );
  };
  draw();
  return {el:root};
}

export function renderChecklistDetail({mission, checklistId}){
  const def=checklistById(checklistId);
  if(!def) return renderChecklists({mission});
  const root=h('main',{class:`screen scroll checklist-screen detail tone-${def.tone}`});
  const draw=()=>{
    const state=stateOf(mission,def.id);
    const p=checklistProgress(def,state);
    const toggle=(id)=>{
      mutate(mission,(m)=>{
        m.checklists ||= {};
        m.checklists[def.id] ||= {};
        m.checklists[def.id][id] = !m.checklists[def.id][id];
      });
      draw();
    };
    root.replaceChildren(
      head(mission,def.title,checklistUrl(mission.id)),
      h('div',{class:'body checklist-body'},
        h('div',{class:'check-detail-summary'},
          h('div',{},h('span',{class:'eyebrow'},def.subtitle),h('strong',{class:'check-detail-title'},def.title)),
          h('div',{class:'check-ring mono','aria-label':`${p.done} sur ${p.total} obligatoires`},`${p.done}/${p.total}`)),
        def.sections.map((sec,si)=>{
          const required = sec.items.filter(([, , hint])=>!isOptionalChecklistItem(hint));
          const requiredDone = required.filter(([id])=>state[id]===true).length;
          return h('section',{class:'check-section'},
            h('div',{class:'check-section-title'},h('span',{},`${si+1}. ${sec.title}`),
              h('span',{class:'mono small'},`${requiredDone}/${required.length}`)),
            sec.items.map(([id,label,hint])=>{
              const done=state[id]===true;
              const optional=isOptionalChecklistItem(hint);
              return h('button',{class:`check-row ${done?'done':''} ${optional?'optional':''}`,'aria-pressed':String(done),onclick:()=>toggle(id)},
                h('span',{class:'check-circle'},done?icon('check',17):''),
                h('span',{class:'check-row-copy'},
                  h('span',{class:'check-row-title'},h('strong',{},label),optional?h('em',{class:'optional-badge'},'Facultatif'):null),
                  hint?h('small',{},hint):null),
                done?h('span',{class:'check-ok'},'OK'):null);
            })
          );
        }),
        h('div',{class:'check-footer-actions'},
          h('a',{class:'btn ghost',href:checklistUrl(mission.id)},'Toutes les check-lists'),
          h('button',{class:'btn primary',disabled:!p.complete,onclick:()=>{location.hash=checklistUrl(mission.id);}},p.complete?'✓ Obligatoires validés':'Valider les points obligatoires')
        )
      )
    );
  };
  draw();
  return {el:root};
}
