/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback } from "react";
import { Rnd } from "react-rnd";
import type { CanvasItem } from "@/lib/store";

interface Props {
  item: CanvasItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, payload: Partial<CanvasItem>) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
}

export function DraggableImage({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onBringToFront
}: Props) {
  const handleSelect = useCallback(() => {
    onSelect(item.id);
    onBringToFront(item.id);
  }, [item.id, onBringToFront, onSelect]);

  return (
    <Rnd
      bounds="parent"
      default={{
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      }}
      position={{ x: item.x, y: item.y }}
      size={{ width: item.width, height: item.height }}
      onDragStart={handleSelect}
      onDragStop={(_, data) =>
        onUpdate(item.id, {
          x: data.x,
          y: data.y
        })
      }
      onResizeStart={handleSelect}
      onResizeStop={(_, __, ref, ___, position) => {
        onUpdate(item.id, {
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          ...position
        });
      }}
      style={{
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        boxShadow: isSelected
          ? "0 0 0 2px rgba(167, 139, 250, 0.9), 0 10px 35px rgba(0,0,0,0.45)"
          : "0 12px 24px rgba(0,0,0,0.35)",
        borderRadius: "10px",
        overflow: "visible"
      }}
      enableResizing={{
        bottom: true,
        bottomLeft: true,
        bottomRight: true,
        left: true,
        right: true,
        top: true,
        topLeft: true,
        topRight: true
      }}
      minWidth={80}
      minHeight={80}
    >
      <div
        className="relative h-full w-full cursor-move select-none"
        onMouseDown={handleSelect}
      >
        <img
          src={item.src}
          alt={item.type}
          draggable={false}
          className="h-full w-full rounded-md object-cover"
        />
        {isSelected && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg transition hover:scale-105"
            >
              ×
            </button>
            <div className="pointer-events-none absolute -bottom-9 left-1/2 flex w-36 -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs text-white shadow-xl">
              <span className="text-[10px] uppercase tracking-wide text-white/70">
                회전
              </span>
              <input
                type="range"
                min={-180}
                max={180}
                value={item.rotation}
                className="pointer-events-auto h-1 flex-1 cursor-pointer accent-purple-400"
                onChange={(e) =>
                  onUpdate(item.id, { rotation: Number(e.target.value) })
                }
              />
              <span className="w-10 text-right tabular-nums">
                {Math.round(item.rotation)}°
              </span>
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
}
