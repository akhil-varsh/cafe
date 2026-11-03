import {readFileSync,writeFileSync} from 'node:fs';
// Regenerates supabase/seed.sql from src/data/dishes.json (the single source of demo menu data).
// Existing rows keep their cafe-managed price and publication state.
const dishes=JSON.parse(readFileSync('src/data/dishes.json','utf8'));
const q=v=>v===null||v===undefined?'null':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
const arr=a=>`array[${a.map(q).join(',')}]::text[]`;
const cols=['id','name','category','description','price','image','vegetarian','ingredients','allergens','portion','preparation','model','tag','is_new','todays_special','nutrition','cafe_slug','published','sort_order'];
const keep=new Set(['id','price','published','cafe_slug']);
const lines=["insert into public.cafes(slug,name,published) values('savour','The Little Table',true) on conflict(slug) do nothing;"];
dishes.forEach((d,i)=>{const values=[q(d.id),q(d.name),q(d.category),q(d.description),d.price,q(d.image),d.vegetarian,arr(d.ingredients),arr(d.allergens),q(d.portion),q(d.preparation),q(d.model),q(d.tag),d.is_new,d.todays_special,d.nutrition?`${q(JSON.stringify(d.nutrition))}::jsonb`:'null',q('savour'),true,i];
 lines.push(`insert into public.dishes(${cols.join(',')}) values(${values.join(',')}) on conflict(id) do update set ${cols.filter(c=>!keep.has(c)).map(c=>`${c}=excluded.${c}`).join(',')},updated_at=now();`);});
writeFileSync('supabase/seed.sql',lines.join('\n')+'\n');console.log(`seed.sql: ${dishes.length} dishes`);
