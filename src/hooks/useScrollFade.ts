import { useRef, useState, useCallback, useEffect } from 'react';

interface ScrollFadeState {
  canScrollUp: boolean;
  canScrollDown: boolean;
}

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<ScrollFadeState>({
    canScrollUp: false,
    canScrollDown: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setState({
      canScrollUp: el.scrollTop > 0,
      canScrollDown: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  return { ref, ...state };
}
