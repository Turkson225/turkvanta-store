import {getStoreData,config} from '@/lib/store/server';

// Read the current catalogue at request time, never during deployment builds.
export const dynamic='force-dynamic';

export default async function sitemap(){const c=config();if(!c.live||!c.origin)return [];const d=await getStoreData();return ['','/shop','/about','/contact',...d.products.filter(p=>p.published).map(p=>'/product/'+p.slug)].map(path=>({url:c.origin+path,lastModified:new Date()}))}
