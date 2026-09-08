import {config} from '@/lib/store/server';
export default function robots(){const c=config();return {rules:{userAgent:'*',allow:c.live?'/':undefined,disallow:c.live?['/account','/admin','/checkout','/cart','/api/']:'/'},sitemap:c.origin+'/sitemap.xml'}}
