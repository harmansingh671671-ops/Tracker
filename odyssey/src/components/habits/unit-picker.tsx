"use client";

/**
 * The counted-habit target/amount picker (2026-10-25, owner instruction).
 *
 * Sits inside BOTH habit forms (create + edit) so the two pages cannot drift:
 * preset units — Time, Pages, Glasses, Reps — and a Custom option that splits
 * the amount field into two columns (amount left, unit right).
 *
 * The preset writes its id straight into `Habit.unit`, which doubles as the
 * display label everywhere the card prints value + unit ("0 / 20 pages").
 * A unit that is not a preset id — including an empty field, and including
 * any string a legacy habit was given — renders the custom columns, so
 * editing an existing habit never silently renames its unit.
 */

import { UNIT_PRESETS, isUnitPresetId, timeUnitMinuteFactor } from "@/lib/utils/habit-units";
import { Timer, Pencil } from "lucide-react";
import { useMemo } from "react";

interface UnitPickerProps {
  unit: string;
  targetValue: string;
  onUnitChange: (unit: string) => void;
  onTargetChange: (target: string) => void;
}

const chipBase =
  "flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer border active:scale-95";

export function UnitPicker({ unit, targetValue, onUnitChange, onTargetChange }: UnitPickerProps) {
  const isCustom = !isUnitPresetId(unit);
  // The session behavior hint is derivable from whatever the unit currently
  // holds — a custom "min" or "hours" gets the timer same as the Time preset.
  const isTimer = useMemo(() => timeUnitMinuteFactor(unit) !== null, [unit]);
  const hint = isTimer
    ? "Hold this habit to open the timer"
    : "Hold this habit to count up or down";

  const selectPreset = (id: string) => {
    onUnitChange(id);
    const preset = UNIT_PRESETS.find((p) => p.id === id);
    // Pre-fill the target only when the field is empty: a target the user
    // typed (or the habit already has) must never be overwritten by a chip.
    if (preset && (targetValue === "" || Number.isNaN(Number(targetValue)))) {
      onTargetChange(String(preset.defaultTarget));
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-on-surface-variant font-medium">
        DAILY TARGET &amp; TYPE
      </label>

      <div className="flex gap-1.5 p-1 bg-surface-container-low rounded-2xl border border-outline/10">
        {UNIT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPreset(p.id)}
            className={`${chipBase} ${
              !isCustom && unit === p.id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-transparent border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="text-lg leading-none">{p.emoji}</span>
            <span className="text-[10px] font-bold">{p.label}</span>
          </button>
        ))}
        <button
          type="button"
          // Entering custom mode just clears the preset: custom is ANY value
          // that is not a preset id, so nothing fake is ever written into the
          // field the user is about to type into. Already custom: no-op, a
          // re-click must never clear the text being typed.
          onClick={() => { if (!isCustom) onUnitChange(""); }}
          className={`${chipBase} ${
            isCustom
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-transparent border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
          title="Define your own unit"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-[10px] font-bold">Custom</span>
        </button>
      </div>

      {isCustom && (
        /* Custom mode: the amount field splits into two columns --
           amount on the left, unit type on the right. */
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={targetValue}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder="Amount"
            className="w-1/2 rounded-xl bg-surface-container border border-outline/10 px-3 py-2.5 text-sm text-on-surface"
            aria-label="Daily target amount"
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            placeholder="Type (pages, min...)"
            className="w-1/2 rounded-xl bg-surface-container border border-outline/10 px-3 py-2.5 text-sm text-on-surface"
            aria-label="Unit type"
          />
        </div>
      )}

      {!isCustom && (
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={targetValue}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder={String(UNIT_PRESETS.find((p) => p.id === unit)?.defaultTarget ?? "")}
          className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2.5 text-sm text-on-surface"
          aria-label={`Daily target in ${unit}`}
        />
      )}

      <p className="text-[10px] text-on-surface-variant/70 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {hint}
      </p>
    </div>
  );
}
