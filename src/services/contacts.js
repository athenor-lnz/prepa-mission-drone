const KEY='pmd.aircontacts.v1';

function clean(v,max=300){return typeof v==='string'?v.trim().slice(0,max):'';}
export function listContacts(){
  try{
    const a=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(a)?a.filter(Boolean).map((x)=>({
      id:clean(x.id,80),name:clean(x.name,160),type:clean(x.type,80),zone:clean(x.zone,40).toUpperCase(),
      phone:clean(x.phone,40),frequency:clean(x.frequency,160),notes:clean(x.notes,600)
    })).filter((x)=>x.id&&x.name&&x.phone):[];
  }catch{return[];}
}
function save(items){try{localStorage.setItem(KEY,JSON.stringify(items));}catch{}}
export function addContact(raw){
  const item={
    id:`c_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    name:clean(raw.name,160),type:clean(raw.type,80),zone:clean(raw.zone,40).toUpperCase(),
    phone:clean(raw.phone,40),frequency:clean(raw.frequency,160),notes:clean(raw.notes,600)
  };
  if(!item.name||!item.phone)throw new Error('Nom et téléphone requis.');
  const items=listContacts();items.push(item);save(items);return item;
}
export function removeContact(id){save(listContacts().filter((x)=>x.id!==id));}
export function telHref(phone){
  const raw=String(phone||'').trim();
  let n=raw.replace(/[^\d+]/g,'');
  if(n.startsWith('0'))n='+33'+n.slice(1);
  return `tel:${n}`;
}
export function phonesInText(text=''){
  const re=/(?:\+33\s?(?:\(0\)\s?)?|0)[1-9](?:[ .-]?\d{2}){4}/g;
  return [...new Set(String(text).match(re)||[])];
}
