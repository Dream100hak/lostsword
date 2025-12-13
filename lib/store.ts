import { nanoid } from "nanoid";
import { create } from "zustand";

export type ItemType = "card" | "char" | "pet" | "equip";

export interface CanvasItem {
  id: string;
  type: ItemType;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

interface State {
  items: CanvasItem[];
  selectedId: string | null;
  addItem: (type: ItemType, src: string) => void;
  updateItem: (id: string, payload: Partial<CanvasItem>) => void;
  setSelected: (id: string | null) => void;
  removeItem: (id: string) => void;
  removeSelected: () => void;
  bringToFront: (id: string) => void;
}

export const useEditorStore = create<State>((set, get) => ({
  items: [],
  selectedId: null,
  addItem: (type, src) =>
    set((state) => {
      const maxZ = state.items.reduce((acc, cur) => Math.max(acc, cur.zIndex), 0);
      const newItem: CanvasItem = {
        id: nanoid(),
        type,
        src,
        x: 80 + state.items.length * 10,
        y: 80 + state.items.length * 10,
        width: 220,
        height: 300,
        rotation: 0,
        zIndex: maxZ + 1
      };
      return {
        items: [...state.items, newItem],
        selectedId: newItem.id
      };
    }),
  updateItem: (id, payload) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...payload } : item
      )
    })),
  setSelected: (id) => set({ selectedId: id }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId
    })),
  removeSelected: () =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== state.selectedId),
      selectedId: null
    })),
  bringToFront: (id) =>
    set((state) => {
      const maxZ = state.items.reduce((acc, cur) => Math.max(acc, cur.zIndex), 0);
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, zIndex: maxZ + 1 } : item
        )
      };
    })
}));
