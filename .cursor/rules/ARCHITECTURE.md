# 🏗️ Architecture Rules

## Project Overview

**LostSword Editor** is a Next.js 14 web application for composing game assets (characters, cards, pets, equipment) onto a canvas and managing formations.

---

## 📁 Directory Structure

### Core Directories

- **`app/`** - Next.js App Router pages and layouts
  - Use `layout.tsx` for root layout with metadata
  - Use `page.tsx` for main page components
  - Keep `globals.css` for global styles and Tailwind imports

- **`components/`** - Reusable React components
  - Export components as named exports
  - Keep components focused and single-purpose
  - Use TypeScript interfaces for props

- **`lib/`** - Utilities and state management
  - Store Zustand stores here
  - Keep utility functions organized
  - Export types and interfaces

- **`data/`** - Static JSON data files
  - One file per data type (cards, chars, equip, pets)
  - Maintain consistent structure: `{ id, name, src }`
  - Use descriptive file names matching the data type

- **`Img/`** - Local image assets (development)
  - Organize by category: `card/`, `character/`, `equip/`, `pet/`
  - Use Korean filenames matching game asset names

- **`public/`** - Static public assets
  - Use for production-ready assets
  - Reference via `/assets/` paths

---

## 🎯 Framework & Libraries

### Core Stack

- **Next.js 14.2.5** - App Router architecture
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety
- **Tailwind CSS 3.4.10** - Utility-first styling

### State Management

- **Zustand 4.5.5** - Global state management
  - Define stores in `lib/store.ts`
  - Use for shared application state
  - Prefer local state (`useState`) for component-specific state

### UI Libraries

- **react-rnd 10.4.12** - Drag and resize functionality
- **html2canvas 1.4.1** - Canvas to PNG export
- **classnames 2.5.1** - Conditional class names

---

## 🔄 State Management Patterns

### Local State (`useState`)

Use for:
- Component-specific UI state (modals, toggles, form inputs)
- Temporary selections (picker, search query)
- Slot assignments and formations

**Example:**
```typescript
const [picker, setPicker] = useState<ItemType | null>(null);
const [search, setSearch] = useState("");
```

### Global State (Zustand)

Use for:
- Shared application state across components
- Canvas items and selections
- Editor-wide settings

**Pattern:**
```typescript
interface State {
  items: CanvasItem[];
  selectedId: string | null;
  addItem: (type: ItemType, src: string) => void;
  // ... other actions
}

export const useEditorStore = create<State>((set, get) => ({
  // ... implementation
}));
```

### Memoization

- Use `useMemo` for expensive computations
- Memoize filtered/transformed data arrays
- Memoize library data structures

**Example:**
```typescript
const libraries = useMemo<Record<ItemType, LibraryItem[]>>(
  () => ({ card: cards, char: chars, pet: pets, equip: equips }),
  []
);
```

---

## 🧩 Component Architecture

### Component Organization

1. **Page Components** (`app/page.tsx`)
   - Main application logic
   - Can contain sub-components as internal functions
   - Handle data fetching and state coordination

2. **Reusable Components** (`components/`)
   - Self-contained, reusable UI elements
   - Accept props via TypeScript interfaces
   - Use "use client" directive when needed

3. **Layout Components** (`app/layout.tsx`)
   - Root layout with metadata
   - Global providers and wrappers
   - Font and theme configuration

### Component Patterns

- **Function Components** - Always use functional components with hooks
- **Client Components** - Mark with `"use client"` when using hooks or browser APIs
- **Server Components** - Default for layouts and static pages

---

## 📊 Data Flow

### Data Loading

1. **Static JSON** → Imported at build time
2. **Memoization** → Transformed data cached with `useMemo`
3. **Filtering** → Applied on-demand based on user input
4. **Rendering** → Displayed in UI components

### State Updates

1. **User Action** → Event handler triggered
2. **State Update** → `setState` or Zustand action called
3. **Re-render** → React updates affected components
4. **Side Effects** → `useEffect` for cleanup or sync

---

## 🎨 Slot System Architecture

### Character Slots

- **5 slots** total
- Each slot contains:
  - `char`: Character item
  - `card`: Card item
  - `equips`: Object with `weapon`, `armor`, `helmet`, `roon`

### Pet Slots

- **3 slots** total
- Simple array of pet items

### Formation Slots

- **Character Formation**: 6 slots (2 per lane: back/mid/front)
- **Pet Formation**: 3 slots (1 per lane)
- Lane-based color coding (blue/orange/red)

### Slot Management Rules

- Prevent duplicates: Filter used items from library
- Allow replacement: Same item can replace itself
- Reset functionality: Clear individual slots or all slots

---

## 🔧 Type Definitions

### Core Types

```typescript
type ItemType = "card" | "char" | "pet" | "equip";
type EquipKind = "weapon" | "armor" | "helmet" | "roon" | "other";

interface LibraryItem {
  id: string;
  name: string;
  src: string;
}
```

### Type Safety Rules

- Always define types for function parameters
- Use interfaces for object shapes
- Prefer union types for fixed sets of values
- Export shared types from `lib/store.ts`

---

## 🚀 Performance Considerations

### Optimization Strategies

1. **Memoization**
   - Memoize expensive computations
   - Cache filtered/transformed arrays
   - Prevent unnecessary re-renders

2. **Code Splitting**
   - Next.js automatic code splitting
   - Lazy load heavy components if needed

3. **Image Optimization**
   - Use Next.js Image component when possible
   - Consider lazy loading for large lists

4. **State Updates**
   - Batch related state updates
   - Use functional updates for arrays/objects
   - Avoid unnecessary state dependencies

---

## 📝 File Organization Rules

### Naming Conventions

- **Components**: PascalCase (`Toolbar.tsx`, `DraggableImage.tsx`)
- **Utilities**: camelCase (`store.ts`, `utils.ts`)
- **Types**: PascalCase interfaces/types
- **Constants**: UPPER_SNAKE_CASE or camelCase

### Import Organization

1. React and Next.js imports
2. Third-party library imports
3. Internal component imports
4. Type imports (with `type` keyword)
5. Data imports (JSON files)

**Example:**
```typescript
import { useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { Toolbar } from "@/components/Toolbar";
import type { ItemType } from "@/lib/store";
import cards from "@/data/cards.json";
```

---

## 🎯 Best Practices

### Do's ✅

- Keep components focused and single-purpose
- Use TypeScript for all new code
- Memoize expensive computations
- Extract reusable logic into custom hooks
- Use path aliases (`@/`) for imports
- Maintain consistent data structures

### Don'ts ❌

- Don't mix server and client components unnecessarily
- Don't create deeply nested component structures
- Don't store derived state (compute on render)
- Don't mutate state directly (use immutable updates)
- Don't ignore TypeScript errors
- Don't create circular dependencies

---

## 🔍 Code Review Checklist

When reviewing architecture changes:

- [ ] Types are properly defined
- [ ] State management is appropriate (local vs global)
- [ ] Components are properly organized
- [ ] Performance optimizations are considered
- [ ] Data flow is clear and logical
- [ ] No unnecessary re-renders
- [ ] Imports are organized correctly
- [ ] File structure follows conventions
