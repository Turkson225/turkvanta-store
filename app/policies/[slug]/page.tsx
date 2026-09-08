import {PolicyView} from '@/components/store/views';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!['shipping','returns','faq','privacy','terms'].includes(slug))notFound();return <PolicyView slug={slug}/>;}
