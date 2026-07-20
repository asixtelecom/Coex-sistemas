"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DraggableFabProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label?: string;
  badge?: number;
  className?: string;
}

export function DraggableFab({ onClick, icon, label, badge, className }: DraggableFabProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const applyTransform = useCallback((x: number, y: number) => {
    btnRef.current?.style.setProperty("transform", `translate(${x}px, ${y}px)`);
  }, []);

  useEffect(() => {
    applyTransform(offset.x, offset.y);
  }, [offset, applyTransform]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        wasDragged.current = true;
      }
      const nx = offsetRef.current.x + dx;
      const ny = offsetRef.current.y + dy;
      applyTransform(nx, ny);
    };

    const handleUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const nx = offsetRef.current.x + (e.clientX - dragStart.current.x);
      const ny = offsetRef.current.y + (e.clientY - dragStart.current.y);
      offsetRef.current = { x: nx, y: ny };
      setOffset({ x: nx, y: ny });
      if (!wasDragged.current) {
        onClick?.();
      }
      wasDragged.current = false;
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [onClick, applyTransform]);

  const handleDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    wasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetRef.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <button
      ref={btnRef}
      onPointerDown={handleDown}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex cursor-grab items-center rounded-full bg-primary text-primary-foreground shadow-lg active:cursor-grabbing hover:shadow-xl active:scale-95 transition-shadow duration-200",
        className,
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        {icon}
      </span>
      {label && (
        <span className="group/fab max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-hover/fab:max-w-[120px] group-hover/fab:opacity-100 group-hover/fab:pr-3">
          {label}
        </span>
      )}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
