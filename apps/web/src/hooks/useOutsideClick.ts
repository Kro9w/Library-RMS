import { useEffect, RefObject } from "react";

type Event = MouseEvent | TouchEvent;

export function useOutsideClick(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: (event: Event) => void
) {
  useEffect(() => {
    const listener = (event: Event) => {
      const target = event.target as Node;
      
      // Normalize to array
      const refList = Array.isArray(refs) ? refs : [refs];

      // Check if clicking inside any of the refs
      const isInside = refList.some(
        (ref) => ref.current && ref.current.contains(target)
      );

      if (isInside) {
        return;
      }

      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [refs, handler]);
}
