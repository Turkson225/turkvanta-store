import {Suspense} from 'react';
import {CartView} from '@/components/store/views';
export const metadata={title:'Cart | Jedi’s Store'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><CartView/></Suspense>}
