import type {Metadata} from 'next';
import './globals.css';
import {StoreProvider} from '@/components/store/provider';
import {StoreShell} from '@/components/store/shell';
import {getStoreData,config} from '@/lib/store/server';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const c=config();return {title:'TURKVANTA — Everyday, elevated.',description:'Thoughtful finds for your home, your style, and your everyday. Discover Turkvanta, a fresh perspective from Ghana.',metadataBase:c.origin?new URL(c.origin):undefined,robots:{index:c.live,follow:c.live},icons:{icon:'/favicon.svg'},openGraph:{title:'TURKVANTA — Everyday, elevated.',description:'Good things. Great everyday. A considered collection of technology, home, style, and essentials.',type:'website'}};}
export default async function RootLayout({children}:{children:React.ReactNode}){const initial=await getStoreData();return <html lang="en"><body><StoreProvider initial={initial}><StoreShell>{children}</StoreShell></StoreProvider></body></html>}
