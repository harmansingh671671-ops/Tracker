"use client";

import { useEffect, useRef, useState } from "react";
import { pxPerMinuteToDelta, PX_PER_MINUTE } from "@/lib/utils/block-resize";

/**
 * The bottom-border drag handle for a quick schedule card (`C2` follow-up).
 *
 * Desktop (mouse): press the strip and drag — resize starts immediately in
 * 5-minute steps, live preview in `dragPreview`, store written on release.
 *
 * Mobile (touch): TAP AND HOLD (~250 ms, grip lights up + a small buzz) to arm
 * the resize, then drag. A quick swipe over the strip is a normal page scroll
 * (`touch-action: pan-y`) and never resizes — the press is abandoned the moment
 * the finger moves more than a few px before the hold completes. Once armed, a
 * non-passive `touchmove` `preventDefault` blocks scrolling for the rest of the
 * gesture. This is deliberate: the strip overlaps the block card, so immediate
 * capture would make every scroll that starts on a block edge resize it.
 *
 * Pointer Capture keeps the stream alive when the finger leaves the strip mid
 * drag (the usual case, since cards grow under it). The handle is a dedicated
 * strip, not the card itself, so cards stay normal tap targets.
 */
const HOLD_MS = 250;
const HOLD_TOLERANCE_PX = 10;

interface PressState {
  startY: number;
  startX: number;
  armed: boolean;
  timer: number | null;
  pointerId: number;
}

export function BlockDragHandle({
  onResize,
  onEnd,
  disabled = false,
  step = PX_PER_MINUTE,
  position = "bottom",
}: {
  /** Cumulative minutes since press (can exceed the block's own duration). */
  onResize: (deltaMinutes: number) => void;
  /** Pointer released or lost — commit or roll back happens in the caller. */
  onEnd: () => void;
  disabled?: boolean;
  /** px → minutes factor; tests pass a huge one to skip pixel math. */
  step?: number;
  /** Kept for API compatibility; only the bottom edge is rendered. */
  position?: "top" | "bottom";
}) {
  const pressRef = useRef<PressState | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Once armed on touch, block the page scroll for the rest of the gesture.
  // (`touch-action` is sampled at gesture start, so it cannot be flipped
  // mid-gesture; preventDefault on touchmove is what actually stops the scroll.)
  useEffect(() => {
    if (!armed) return;
    const el = elRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, [armed]);

  // Never leave a dangling hold timer behind.
  useEffect(() => {
    return () => {
      const p = pressRef.current;
      if (p && p.timer !== null) window.clearTimeout(p.timer);
    };
  }, []);

  if (disabled) return null;

  const finishPress = () => {
    const p = pressRef.current;
    if (!p) return;
    if (p.timer !== null) window.clearTimeout(p.timer);
    const wasArmed = p.armed;
    pressRef.current = null;
    setArmed(false);
    setPressed(false);
    if (wasArmed) onEnd();
  };

  return (
    <div
      ref={elRef}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Tap and hold to change duration"
      data-drag-handle
      data-drag-position={position}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.stopPropagation();
        const el = e.currentTarget;

        if (e.pointerType === "mouse") {
          // Desktop: immediate click-drag, as before.
          pressRef.current = {
            startY: e.clientY,
            startX: e.clientX,
            armed: true,
            timer: null,
            pointerId: e.pointerId,
          };
          el.setPointerCapture(e.pointerId);
          e.preventDefault();
          setPressed(true);
          return;
        }

        // Touch / pen: start the hold timer. Do NOT capture or preventDefault
        // yet — a quick swipe must remain a page scroll.
        const timer = window.setTimeout(() => {
          const p = pressRef.current;
          if (!p) return;
          p.armed = true;
          try {
            el.setPointerCapture(p.pointerId);
          } catch {
            /* capture can fail if the gesture already ended; the resize is inert then */
          }
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(10);
          }
          setArmed(true);
        }, HOLD_MS);
        pressRef.current = {
          startY: e.clientY,
          startX: e.clientX,
          armed: false,
          timer,
          pointerId: e.pointerId,
        };
        setPressed(true);
      }}
      onPointerMove={(e) => {
        const p = pressRef.current;
        if (!p) return;
        if (!p.armed) {
          // Moved before the hold completed — this is a scroll, not a resize.
          if (
            Math.abs(e.clientY - p.startY) > HOLD_TOLERANCE_PX ||
            Math.abs(e.clientX - p.startX) > HOLD_TOLERANCE_PX
          ) {
            if (p.timer !== null) window.clearTimeout(p.timer);
            pressRef.current = null;
            setPressed(false);
          }
          return;
        }
        onResize(pxPerMinuteToDelta(e.clientY - p.startY, step));
      }}
      onPointerUp={finishPress}
      onPointerCancel={finishPress}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-x-0 bottom-0 z-30 h-6 cursor-ns-resize touch-pan-y flex items-end justify-center group/drag"
    >
      <span
        className={`mb-0.5 h-1 w-6 rounded-full transition-colors drag-handle-grip ${
          armed
            ? "bg-primary"
            : pressed
              ? "bg-primary/40"
              : "bg-outline/30 group-hover/drag:bg-primary/60"
        }`}
      />
    </div>
  );
}
