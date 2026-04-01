import { useRef, type PointerEventHandler, type WheelEventHandler } from 'react';
import { clamp } from '../lib/dates';

interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface DragState {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  translateX: number;
  translateY: number;
}

export function useSvgViewport() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const translateGroupRef = useRef<SVGGElement | null>(null);
  const scaleGroupRef = useRef<SVGGElement | null>(null);
  const viewportRef = useRef<ViewportState>({ scale: 1, translateX: 0, translateY: 0 });
  const dragStateRef = useRef<DragState | null>(null);

  const applyViewport = (nextViewport: ViewportState) => {
    viewportRef.current = nextViewport;
    translateGroupRef.current?.setAttribute('transform', `translate(${nextViewport.translateX} ${nextViewport.translateY})`);
    scaleGroupRef.current?.setAttribute('transform', `scale(${nextViewport.scale})`);
  };

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svgElement = svgRef.current;
    const matrix = svgElement?.getScreenCTM();
    if (!svgElement || !matrix) {
      return { x: 0, y: 0 };
    }

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  const handleWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault();
    const svgPoint = toSvgPoint(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const currentViewport = viewportRef.current;
    const nextScale = clamp(currentViewport.scale * factor, 0.65, 4);
    if (nextScale === currentViewport.scale) {
      return;
    }

    const contentX = (svgPoint.x - currentViewport.translateX) / currentViewport.scale;
    const contentY = (svgPoint.y - currentViewport.translateY) / currentViewport.scale;

    applyViewport({
      scale: nextScale,
      translateX: svgPoint.x - contentX * nextScale,
      translateY: svgPoint.y - contentY * nextScale,
    });
  };

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toSvgPoint(event.clientX, event.clientY);
    dragStateRef.current = {
      pointerId: event.pointerId,
      pointerX: point.x,
      pointerY: point.y,
      translateX: viewportRef.current.translateX,
      translateY: viewportRef.current.translateY,
    };
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const point = toSvgPoint(event.clientX, event.clientY);
    applyViewport({
      ...viewportRef.current,
      translateX: dragState.translateX + (point.x - dragState.pointerX),
      translateY: dragState.translateY + (point.y - dragState.pointerY),
    });
  };

  const handlePointerUp: PointerEventHandler<SVGSVGElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
  };

  const clearDragState = () => {
    dragStateRef.current = null;
  };

  return {
    svgRef,
    translateGroupRef,
    scaleGroupRef,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearDragState,
  };
}