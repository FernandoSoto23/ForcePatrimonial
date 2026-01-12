import { useRef, useState } from "react";

export function useDraggable(initial = { x: 20, y: 80 }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    ref.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const onPointerUp = (e) => {
    dragging.current = false;
    ref.current?.releasePointerCapture(e.pointerId);
  };

  return {
    ref,
    pos,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
