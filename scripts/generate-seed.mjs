import {writeFileSync} from 'node:fs';
import {products} from '../lib/store/catalog.ts';
const q=v=>v===null||v===undefined?'null':typeof v==='boolean'||typeof v==='number'?String(v):"'"+(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")+"'";
const fields=['id','slug','name','category','price','image','description','colors','stock','published','featured','badge','specs'];
let sql="-- SAMPLE CATALOG ONLY. Do not run against a trading store.\nbegin;\ndo $$begin if exists(select 1 from public.orders) then raise exception 'Demo seed is disabled when orders exist';end if;end$$;\n";
for(const p of products){sql+=`insert into public.products(${fields.join(',')}) values(${fields.map(k=>q(p[k])).join(',')}) on conflict(id) do nothing;\n`;for(const opt of p.colors)sql+=`insert into public.variants(product_id,option,stock) values(${q(p.id)},${q(opt)},${p.stock}) on conflict(product_id,option) do nothing;\n`;}
sql+='commit;\n';writeFileSync('supabase/seed.sql',sql);console.log(`Wrote ${products.length} sample products with variants.`);
