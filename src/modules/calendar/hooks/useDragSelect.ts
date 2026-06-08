"use client";

import { useState, useCallback, useRef } from "react";

export type DragSelection = {
  start: Date;
  end: Date;
};

type UseDragSelectOptions = {
  onSelect: (selection: DragSelection) => void;
};

export function useDragSelect({ onSelect }: UseDragSelectOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const dragStartRef = useRef<Date | null>(null);

  const handleMouseDown = useCallback((date: Date) => {
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
    dragStartRef.current = date;
  }, []);

  const handleMouseEnter = useCallback((date: Date) => {
    if (!isDragging) return;
    setDragEnd(date);
  }, [isDragging]);

  const handleMouseUp = useCallback((date: Date) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);

    const start = dragStartRef.current;
    const end = date;

    // Normalize so start <= end
    const sorted: DragSelection =
      start <= end ? { start, end } : { start: end, end: start };

    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;

    onSelect(sorted);
  }, [isDragging, onSelect]);

  const handleMouseLeave = useCallback(() => {
    // Cancel drag if mouse leaves the grid entirely
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      dragStartRef.current = null;
    }
  }, [isDragging]);

  // Check if a date is within the current drag selection
  const isInSelection = useCallback((date: Date): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const min = dragStart <= dragEnd ? dragStart : dragEnd;
    const max = dragStart <= dragEnd ? dragEnd : dragStart;
    return date >= min && date <= max;
  }, [isDragging, dragStart, dragEnd]);

  return {
    isDragging,
    dragStart,
    dragEnd,
    isInSelection,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleMouseLeave,
  };
}
