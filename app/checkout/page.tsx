import {Suspense} from 'react';
import {CheckoutView} from '@/components/store/views';
export const metadata={title:'Checkout | Turkvanta'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><CheckoutView/></Suspense>}
