import {Suspense} from 'react';
import {AboutView} from '@/components/store/views';
export const metadata={title:'About | Turkvanta'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><AboutView/></Suspense>}
