interface ViewControlsProps {
  visibleSpan: number;
  curvature: number;
  spacing: number;
  onVisibleSpanChange: (years: number) => void;
  onCurvatureChange: (value: number) => void;
  onSpacingChange: (value: number) => void;
}

export function ViewControls(props: ViewControlsProps) {
  const {
    visibleSpan,
    curvature,
    spacing,
    onVisibleSpanChange,
    onCurvatureChange,
    onSpacingChange,
  } = props;

  return (
    <div className="slider-group">
      <label>
        Horizontal zoom: {visibleSpan}y
        <input
          type="range"
          min={1}
          max={300}
          step={1}
          value={visibleSpan}
          onChange={(event) => onVisibleSpanChange(Number(event.target.value))}
        />
      </label>

      <label>
        Curvature: {curvature}y
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={curvature}
          onChange={(event) => onCurvatureChange(Number(event.target.value))}
        />
      </label>

      <label>
        Spacing: {spacing}px
        <input
          type="range"
          min={20}
          max={60}
          step={4}
          value={spacing}
          onChange={(event) => onSpacingChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}