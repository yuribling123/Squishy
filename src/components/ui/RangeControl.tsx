// Renders a labeled range slider with an optional value description.
type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  note?: string;
  onChange: (value: number) => void;
  compact?: boolean;
};

export function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  note,
  onChange,
  compact = false,
}: RangeControlProps) {
  return (
    <label className={compact ? "grid gap-2 text-xs tracking-[0.06em] text-ink" : "grid grid-cols-[1fr_auto] gap-x-3.5 gap-y-2 font-serif-cn text-base"}>
      <span>{label}</span>
      {note && <span className="font-sans text-[10px] text-muted">{note}</span>}
      <input
        className={`${note ? "col-span-2" : ""} h-4 w-full cursor-ew-resize accent-olive`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
