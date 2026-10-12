import { lazy, Suspense } from 'react';
const NexyralGuide = lazy(() => import('./NexyralGuide'));
export default function GuideHost(){return <Suspense fallback={null}><NexyralGuide /></Suspense>;}
