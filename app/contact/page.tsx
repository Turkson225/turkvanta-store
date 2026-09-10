import {Suspense} from 'react';
import {ContactView} from '@/components/store/views';
export const metadata={title:'Contact | Jedi’s Store'};
export default function Page(){return <Suspense fallback={<div className="wrap inner-page">Loading your collection…</div>}><ContactView/></Suspense>}
