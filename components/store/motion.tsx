'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

// Content stays visible without JavaScript. Motion only enhances elements entering view.
export function StoreMotion({children}: {children: ReactNode}) {
  const root = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const container = root.current;
    if (!container || !window.matchMedia || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<Animation, HTMLElement>();
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    let frame = 0;
    const selector = '.hero-copy > *, .hero-image, .benefits > div, .section-heading, .category-card, .product-card, .editorial-copy > *, .brand-note > *, .about-grid > *, .shop-heading > *';

    function stop() {
      observer?.disconnect();
      mutations?.disconnect();
      cancelAnimationFrame(frame);
      animations.forEach((_, animation) => animation.cancel());
      animations.clear();
    }

    function start() {
      stop();
      if (preference.matches || !container) return;
      const seen = new WeakSet<Element>();
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          observer?.unobserve(target);
          if (preference.matches || target.contains(document.activeElement)) continue;
          const siblings = target.parentElement ? Array.from(target.parentElement.children) : [];
          const delay = Math.min(Math.max(siblings.indexOf(target), 0), 3) * 55;
          const animation = target.animate(
            [{opacity: 0, transform: 'translateY(14px)'}, {opacity: 1, transform: 'translateY(0)'}],
            {duration: 520, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards'},
          );
          animations.set(animation, target);
          animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
        }
      }, {threshold: 0.06});

      function observeNewContent() {
        container?.querySelectorAll(selector).forEach(element => {
          if (seen.has(element)) return;
          seen.add(element);
          observer?.observe(element);
        });
      }
      observeNewContent();
      mutations = new MutationObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(observeNewContent);
      });
      mutations.observe(container, {childList: true, subtree: true});
    }

    function revealFocused(event: FocusEvent) {
      animations.forEach((element, animation) => {
        if (event.target instanceof Node && element.contains(event.target)) animation.cancel();
      });
    }
    start();
    preference.addEventListener('change', start);
    container.addEventListener('focusin', revealFocused);
    return () => {
      stop();
      preference.removeEventListener('change', start);
      container.removeEventListener('focusin', revealFocused);
    };
  }, [pathname]);

  return <main id="main-content" ref={root}>{children}</main>;
}
