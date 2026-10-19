"use client";

import React, { useEffect, useRef, useState } from "react";
import { logWarn } from "@/lib/utils/logger";
import { type ScheduleBlock } from "@/lib/db";
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";
import { hourFromSlot, hourSlotFromPoint, setHourHighlight } from "@/lib/utils/planner-hour-hit";
import {
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface TimelineSlotData {
  hour: number;
  startTime: string;
  endTime: string;
  category: string;
  title: string;
  isCustom: boolean;
  status: string;
  block: ScheduleBlock | null;
}

interface TimelineHourSlotProps {
  slot: TimelineSlotData;
  isPastHour: boolean;
  isCurrent: boolean;
  isFutureHour: boolean;
  isRecentlySaved: boolean;
  selectedDate: string;
  todayStr: string;
  options?: {
    isInsideGroup?: boolean;
    groupType?: string;
    expandToggle?: { isExpanded: boolean; onToggle: () => void };
  };
  onOpenHour: (hour: number, block: ScheduleBlock | null, endHour: number) => void;
  onToggleStatus: (
    e: React.MouseEvent,
    hour: number,
    block: ScheduleBlock | null,
    status?: string
  ) => void;
  onShowHint: (msg: string) => void;
  onMoveBlock?: (block: ScheduleBlock, toHour: number) => void;
}

/**
 * How long a finger has to rest on a block before it owns the gesture. Below
 * this, a moving finger is scrolling the day and must not move anything.
 */
const HOLD_TO_DRAG_MS = 450;

/** The movement that turns a press into a page scroll rather than a grab. */
const DRAG_SLOP_PX = 10;

export function TimelineHourSlot({
  slot,
  isPastHour,
  isCurrent,
  isFutureHour,
  isRecentlySaved,
  selectedDate,
  todayStr,
  options,
  onOpenHour,
  onToggleStatus,
  onShowHint,
  onMoveBlock,
}: TimelineHourSlotProps) {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const justDraggedRef = useRef(false);
  const dragStateRef = useRef<{ startX: number; startY: number; hour: number; moved: boolean; armed: boolean; prevTargetEl: HTMLElement | null; isSwipe: boolean; isDrag: boolean; dx: number } | null>(null);
  const grabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<number | null>(null);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostGrabRef = useRef({ x: 0, y: 0 });

  // The card that follows the finger during a drag. It is a clone of the real
  // card, so it carries the exact theme and category styling this slot already
  // renders, and it is positioned by writing to the DOM directly -- a pointer
  // move must not re-render the whole planner.
  const placeGhost = (clientX: number, clientY: number) => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.style.transform = `translate3d(${clientX - ghostGrabRef.current.x}px, ${
      clientY - ghostGrabRef.current.y
    }px, 0)`;
  };

  const showGhost = (clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root || typeof document === "undefined" || ghostRef.current) return;
    const rect = root.getBoundingClientRect();
    // Grab point within the card, so it does not jump under the finger.
    ghostGrabRef.current = { x: clientX - rect.left, y: clientY - rect.top };
    const ghost = root.cloneNode(true) as HTMLDivElement;
    // The clone must not be a drop target: the hit test below walks `[data-hour]`.
    ghost.removeAttribute("data-hour");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.position = "fixed";
    ghost.style.left = "0";
    ghost.style.top = "0";
    ghost.style.width = `${rect.width}px`;
    ghost.style.margin = "0";
    ghost.style.zIndex = "60";
    ghost.style.pointerEvents = "none";
    ghost.style.transition = "none";
    ghost.classList.remove("scale-95", "opacity-50");
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    placeGhost(clientX, clientY);
  };

  const hideGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const cancelGrab = () => {
    if (grabTimerRef.current) {
      clearTimeout(grabTimerRef.current);
      grabTimerRef.current = null;
    }
  };

  // A finger that rested on the block without moving now owns the gesture: the
  // page would otherwise scroll out from under it. The grab is announced before
  // the first move, because after 450 ms of stillness the user gets no other
  // signal that the block came loose.
  const armGrab = () => {
    grabTimerRef.current = null;
    const ds = dragStateRef.current;
    if (!ds || ds.armed || ds.moved) return;
    ds.armed = true;
    justDraggedRef.current = true;
    setIsDragging(true);
  };

  // A drag can also end by this slot unmounting (a re-read repaints the rail),
  // which never reaches `onPointerUp`: the ghost and the landing ring would both
  // be left behind.
  useEffect(() => {
    return () => {
      if (grabTimerRef.current) clearTimeout(grabTimerRef.current);
      ghostRef.current?.remove();
      ghostRef.current = null;
      setHourHighlight(dragStateRef.current?.prevTargetEl ?? null, false);
    };
  }, []);

  // While the block is grabbed the page must not take the gesture back and
  // scroll instead. The card allows vertical panning (`touch-pan-y` below) so a
  // finger that is only passing over it still scrolls the day, which means the
  // scroll has to be vetoed here -- and only a non-passive listener may do that.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const vetoScroll = (e: TouchEvent) => {
      if (dragStateRef.current?.armed) e.preventDefault();
    };
    el.addEventListener("touchmove", vetoScroll, { passive: false });
    return () => el.removeEventListener("touchmove", vetoScroll);
  }, []);

  const cat = getPlannerCatStyle(slot.category, slot.isCustom);
  const CatIcon = cat.Icon;

  const handleSlotClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    // Edit is now opened by a right-to-left swipe, not a tap -- and the swipe
    // only counts after the block has been grabbed by holding it. See onPointerDown.
    return;
    if (isPastHour) {
      if (isLongPressTriggeredRef.current) {
        isLongPressTriggeredRef.current = false;
        return;
      }
      onShowHint("Tap & hold to edit past hours");
      return;
    }
    onOpenHour(slot.hour, slot.block, slot.hour + 1);
  };

  const handleTouchStart = () => {
    return;
    if (!isPastHour) return;
    isLongPressTriggeredRef.current = false;
    // long-press edit disabled
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof window !== "undefined" && window.getSelection) {
        try {
          window.getSelection()?.removeAllRanges();
        } catch (e) {
          logWarn("page", "could not clear text selection", e);
        }
      }
      try {
        if (typeof window !== "undefined" && navigator?.vibrate) {
          navigator.vibrate(40);
        }
      } catch (e) {
        logWarn("page", "browser call failed: window.getSelection", e);
      }
      onOpenHour(slot.hour, slot.block, slot.hour + 1);
    }, 450);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseDown = () => {
    return;
    if (!isPastHour) return;
    isLongPressTriggeredRef.current = false;
    // long-press edit disabled
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof window !== "undefined" && window.getSelection) {
        try {
          window.getSelection()?.removeAllRanges();
        } catch (e) {
          logWarn("page", "could not clear text selection", e);
        }
      }
      onOpenHour(slot.hour, slot.block, slot.hour + 1);
    }, 450);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (slot.isCustom) {
    return (
      <div
        ref={rootRef}
        key={`slot-${slot.hour}`}
        data-hour={slot.hour}
        onClick={handleSlotClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!slot.block) return;
          // The card's own controls are their own gesture: a press on the tick,
          // the cross or the sleep chevron must never start a block move.
          if ((e.target as Element | null)?.closest?.("button, a, input, select, textarea")) return;
          const isMouse = e.pointerType === "mouse";
          cancelGrab();
          dragStateRef.current = { startX: e.clientX, startY: e.clientY, hour: slot.hour, moved: false, armed: isMouse, prevTargetEl: null, isSwipe: false, isDrag: false, dx: 0 };
          // Mouse has no scroll to fight, so its drag stays instant; a finger has
          // to hold first and only then takes the gesture away from the page.
          if (!isMouse) grabTimerRef.current = setTimeout(armGrab, HOLD_TO_DRAG_MS);
        }}
        onPointerMove={(e) => {
          const ds = dragStateRef.current;
          if (!ds || !slot.block) return;
          const dx = e.clientX - ds.startX;
          const dy = e.clientY - ds.startY;
          if (!ds.moved && Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
          if (!ds.moved) {
            // Not grabbed: the finger is only passing over the block, so the
            // gesture is the page's. Drop it and let the scroll run.
            if (!ds.armed) {
              cancelGrab();
              dragStateRef.current = null;
              return;
            }
            ds.moved = true;
            justDraggedRef.current = true;
            cancelGrab();
            setIsDragging(true);
            ds.isSwipe = Math.abs(dx) > Math.abs(dy);
            ds.isDrag = !ds.isSwipe;
            ds.dx = dx;
            try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { void err; }
            if (ds.isDrag) showGhost(e.clientX, e.clientY);
          }
          ds.dx = e.clientX - ds.startX;
          if (ds.isDrag) placeGhost(e.clientX, e.clientY);
          if (ds.isSwipe && rootRef.current) {
            rootRef.current.style.transition = "none";
            rootRef.current.style.transform = `translateX(${ds.dx}px)`;
          }
          e.preventDefault();
          if (ds.isDrag && onMoveBlock) {
            const targetEl = hourSlotFromPoint(e.clientX, e.clientY);
            const h = hourFromSlot(targetEl);
            if (targetEl !== ds.prevTargetEl) {
              // Off the rail entirely: the ring comes off rather than staying on an
              // hour the release would not use.
              setHourHighlight(ds.prevTargetEl, false);
              setHourHighlight(targetEl, true);
              ds.prevTargetEl = targetEl;
            }
            if (h !== null && h !== dragTarget) setDragTarget(h);
          }
        }}
        onPointerUp={() => {
          const ds = dragStateRef.current;
          cancelGrab();
          hideGhost();
          if (ds?.prevTargetEl) setHourHighlight(ds.prevTargetEl, false);
          const wasMoved = !!ds?.moved;
          if (wasMoved) {
            justDraggedRef.current = true;
            setTimeout(() => { justDraggedRef.current = false; }, 100);
            if (ds?.isSwipe && rootRef.current) {
              rootRef.current.style.transition = "transform 0.18s ease";
              rootRef.current.style.transform = ds.dx < 0 ? "translateX(-18px)" : "translateX(0)";
              setTimeout(() => {
                if (rootRef.current) {
                  rootRef.current.style.transition = "";
                  rootRef.current.style.transform = "";
                }
              }, 180);
              if (ds.dx < 0) {
                setTimeout(() => onOpenHour(slot.hour, slot.block, slot.hour + 1), 120);
              }
            } else if (ds?.isDrag && ds.hour !== null && dragTarget !== null && dragTarget !== ds.hour && onMoveBlock && slot.block) {
              onMoveBlock(slot.block, dragTarget);
              if (rootRef.current) {
                rootRef.current.style.transition = "";
                rootRef.current.style.transform = "";
              }
            }
          } else if (ds?.armed) {
            // Grabbed but never moved: nothing to drop, and the tap that follows
            // a grab must not be swallowed by it.
            setTimeout(() => {
              justDraggedRef.current = false;
            }, 0);
          }
          dragStateRef.current = null;
          setIsDragging(false);
          setDragTarget(null);
        }}
        onPointerCancel={() => {
          const ds = dragStateRef.current;
          cancelGrab();
          hideGhost();
          if (ds?.prevTargetEl) setHourHighlight(ds.prevTargetEl, false);
          dragStateRef.current = null;
          setIsDragging(false);
          setDragTarget(null);
        }}
        className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none touch-pan-y transition-all duration-200 active:scale-[0.99] border border-l-4 ${cat.leftBorder} ${cat.cardBorder} ${isDragging ? "opacity-50 scale-95" : ""} ${
          options?.isInsideGroup
            ? "bg-surface-container-lowest/80 hover:bg-surface-container-lowest dark:bg-surface-container-high/60 dark:hover:bg-surface-container-high"
            : cat.cardBg
        } my-1 shadow-sm ${
          isRecentlySaved
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low relative z-20"
            : isCurrent
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.22)] bg-surface-container-low relative z-20"
            : ""
        }`}
      >
        {/* Structured Left Spine Time Stamp */}
        <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
          <span
            className={`text-xs font-mono font-bold leading-tight ${
              isCurrent ? "text-primary font-extrabold" : "text-on-surface"
            }`}
          >
            {String(slot.hour).padStart(2, "0")}:00
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
            {String((slot.hour + 1) % 24 === 0 ? 24 : slot.hour + 1).padStart(2, "0")}:00
          </span>
        </div>

        {/* Structured Node Glyph on Rail */}
        <div className="relative shrink-0">
          {isCurrent && (
            <span className="absolute -inset-1 rounded-2xl bg-primary/20 animate-pulse pointer-events-none" />
          )}
          <div
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg} shadow-inner`}
          >
            <CatIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-semibold truncate ${
                isCurrent ? "text-on-surface font-bold" : "text-on-surface"
              }`}
            >
              {slot.title || cat.label}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono">
            <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
            {slot.block?.description && (
              <>
                <span className="text-on-surface-variant/30">•</span>
                <span className="text-on-surface-variant truncate">
                  {slot.block.description}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Status: 3-State Toggle & Expand Chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {options?.expandToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                options.expandToggle!.onToggle();
              }}
              aria-label={
                options.expandToggle.isExpanded
                  ? "Collapse sleep hours"
                  : "Expand sleep hours"
              }
              title={
                options.expandToggle.isExpanded
                  ? "Collapse sleep hours"
                  : "Expand sleep hours"
              }
              className="w-7 h-7 rounded-full bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 flex items-center justify-center text-indigo-600 hover:text-on-surface dark:border-indigo-500/25 dark:text-indigo-300 transition-all cursor-pointer"
            >
              {options.expandToggle.isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {slot.status === "completed" ? (
            <button
              type="button"
              onClick={(e) => onToggleStatus(e, slot.hour, slot.block, slot.status)}
              title="Completed ✓ (tap to mark missed)"
              className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500/15 active:scale-95 transition-all cursor-pointer dark:text-emerald-400"
            >
              <CheckCircle2 className="w-5 h-5 shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
            </button>
          ) : slot.status === "missed" ? (
            <button
              type="button"
              onClick={(e) => onToggleStatus(e, slot.hour, slot.block, slot.status)}
              title="Missed ✕ (tap to reset to unreviewed)"
              className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer dark:text-rose-400"
            >
              <XCircle className="w-5 h-5 shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
            </button>
          ) : isFutureHour ? (
            <button
              type="button"
              onClick={(e) => onToggleStatus(e, slot.hour, slot.block, slot.status)}
              title={
                selectedDate > todayStr
                  ? "Future day (cannot review yet)"
                  : "Future hour (cannot review yet)"
              }
              className="w-7 h-7 rounded-full border border-outline/[0.08] text-on-surface-variant/20 flex items-center justify-center opacity-30 cursor-not-allowed"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => onToggleStatus(e, slot.hour, slot.block, slot.status)}
              title="Unreviewed (tap to mark completed)"
              className="w-7 h-7 rounded-full border border-outline/25 hover:border-emerald-500 hover:text-emerald-600 text-on-surface-variant/50 flex items-center justify-center transition-colors cursor-pointer dark:border-outline/20 dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:text-on-surface-variant/40"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Open / Unscheduled Slot
  return (
    <div
      key={`slot-${slot.hour}`}
        data-hour={slot.hour}
      onClick={handleSlotClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} my-0.5 ${
        isRecentlySaved
          ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low relative z-20"
          : isCurrent
          ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.22)] bg-surface-container-low relative z-20"
          : ""
      }`}
    >
      <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
        <span
          className={`text-xs font-mono font-bold leading-tight ${
            isCurrent ? "text-primary font-bold" : "text-on-surface-variant/50"
          }`}
        >
          {String(slot.hour).padStart(2, "0")}:00
        </span>
      </div>

      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}
      >
        <CatIcon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-mono text-on-surface-variant/40 italic">
          {isPastHour ? "Passed Slot" : "Empty Slot"}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-mono text-on-surface-variant/35">
            {isPastHour ? "Hold to schedule past" : "Tap to schedule focus"}
          </span>
        </div>
      </div>
    </div>
  );
}
