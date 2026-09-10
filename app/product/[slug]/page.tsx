import {notFound} from 'next/navigation';
import {ProductView} from '@/components/store/views';
import {getStoreData,config} from '@/lib/store/server';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const data=await getStoreData();const p=data.products.find(p=>p.slug===slug);return {title:p?`${p.name} | Jedi’s Store`:'Product unavailable | Jedi’s Store',description:p?.description,alternates:{canonical:'/product/'+slug}}}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const data=await getStoreData();const p=data.products.find(p=>p.slug===slug&&p.published);if(!p&&data.configured)notFound();return <ProductView initialProduct={p} slug={slug}/>}
