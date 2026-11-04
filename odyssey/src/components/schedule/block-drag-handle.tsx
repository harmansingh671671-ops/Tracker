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
 * the resize, then drag. Scrolling is prevented from that point on: the
 * non-passive `touchmove` listener is installed INSIDE the hold-timer callback
 * so it lands before the first browser scroll frame can fire. A quick swipe over
 * the strip is a normal page scroll (`touch-action: pan-y`) and never resizes —
 * if the finger moves more than ~10 px before the hold completes the press is
 * abandoned.
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
  const docBlockRef = useRef<((e: TouchEvent) => void) | null>(null);
  const [armed, setArmed] = useState(false);
  const [pressed, setPressed] = useState(false);

  const installDocScrollBlock = () => {
    if (docBlockRef.current) return;
    const block = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    docBlockRef.current = block;
  };

  const removeDocScrollBlock = () => {
    if (docBlockRef.current) {
      document.removeEventListener("touchmove", docBlockRef.current);
      docBlockRef.current = null;
    }
  };

  // Never leave a dangling hold timer behind.
  useEffect(() => {
    return () => {
      const p = pressRef.current;
      if (p && p.timer !== null) window.clearTimeout(p.timer);
      removeDocScrollBlock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    removeDocScrollBlock();
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
            /* capture can fail if the gesture already ended */
          }
          // Block scrolling the moment the hold lands, so the first drag frame
          // cannot start a scroll.
          installDocScrollBlock();
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
        className={`mb-1 h-0.5 w-12 rounded-full transition-colors drag-handle-grip ${
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
