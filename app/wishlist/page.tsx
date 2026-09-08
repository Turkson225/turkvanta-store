import {Suspense} from 'react';
import {WishlistView} from '@/components/store/views';
export const metadata={title:'Wishlist | Turkvanta'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><WishlistView/></Suspense>}
