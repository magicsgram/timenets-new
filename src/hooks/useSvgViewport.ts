import { useRef, useState, type PointerEventHandler, type WheelEventHandler } from 'react';
import { clamp } from '../lib/dates';

interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface DragState {
  pointerX: number;
  pointerY: number;
  translateX: number;
  translateY: number;
}

export function useSvgViewport(width: number, height: number) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({ scale: 1, translateX: 0, translateY: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);

  const toSvgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const handleWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault();
    const svgPoint = toSvgPoint(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = clamp(viewport.scale * factor, 0.65, 4);
    if (nextScale === viewport.scale) {
      return;
    }

    const contentX = (svgPoint.x - viewport.translateX) / viewport.scale;
    const contentY = (svgPoint.y - viewport.translateY) / viewport.scale;

    setViewport({
      scale: nextScale,
      translateX: svgPoint.x - contentX * nextScale,
      translateY: svgPoint.y - contentY * nextScale,
    });
  };

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    const point = toSvgPoint(event.clientX, event.clientY);
    setDragState({
      pointerX: point.x,
      pointerY: point.y,
      translateX: viewport.translateX,
      translateY: viewport.translateY,
    });
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    if (!dragState) {
      return;
    }

    const point = toSvgPoint(event.clientX, event.clientY);
    setViewport((current) => ({
      ...current,
      translateX: dragState.translateX + (point.x - dragState.pointerX),
      translateY: dragState.translateY + (point.y - dragState.pointerY),
    }));
  };

  return {
    svgRef,
    viewport,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    clearDragState: () => setDragState(null),
  };
}