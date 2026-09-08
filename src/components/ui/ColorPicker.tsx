// Renders an accessible set of selectable color swatches.
type ColorPickerProps = {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ label, colors, value, onChange }: ColorPickerProps) {
  return (
    <fieldset className="mb-7 border-0 p-0 text-[11px] tracking-[0.13em] text-muted">
      <legend className="mb-3.5">{label}</legend>
      <div className="flex gap-3.5">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${color}`}
            aria-pressed={value === color}
            className={`h-8.5 w-8.5 cursor-pointer rounded-full border-[3px] border-[#f8f3eb] shadow-[0_0_0_1px_rgba(46,39,31,0.16)] transition hover:scale-105 hover:shadow-[0_0_0_2px_#28251f] ${value === color ? "scale-105 shadow-[0_0_0_2px_#28251f]" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </fieldset>
  );
}
