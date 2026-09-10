import {Suspense} from 'react';
import {ShopView} from '@/components/store/views';
export const metadata={title:'Shop | Jedi’s Store'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><ShopView/></Suspense>}
