import type { ReactNode, PointerEvent } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
/** Decorative pointer depth only. Touch, keyboard and reduced-motion layouts remain still. */
export default function DepthSurface({children,className,label}:{children:ReactNode;className:string;label?:string}) {
  const reduced=usePrefersReducedMotion();
  function move(event:PointerEvent<HTMLDivElement>) {
    if(reduced||event.pointerType!=='mouse'||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
    const box=event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--depth-x',`${((event.clientY-box.top)/box.height-.5)*-5}deg`);
    event.currentTarget.style.setProperty('--depth-y',`${((event.clientX-box.left)/box.width-.5)*5}deg`);
  }
  function reset(event:PointerEvent<HTMLDivElement>) {event.currentTarget.style.setProperty('--depth-x','0deg');event.currentTarget.style.setProperty('--depth-y','0deg');}
  return <div className={`depth-surface ${className}`} aria-label={label} onPointerMove={move} onPointerLeave={reset}>{children}</div>;
}
