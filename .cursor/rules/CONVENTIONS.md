# 📋 Coding Conventions

## Overview

This document outlines coding conventions, naming patterns, and best practices for the LostSword Editor project.

---

## 🔤 Naming Conventions

### Files & Directories

- **Components**: PascalCase (`Toolbar.tsx`, `DraggableImage.tsx`)
- **Utilities**: camelCase (`store.ts`, `utils.ts`)
- **Data files**: camelCase (`cards.json`, `chars.json`)
- **Directories**: lowercase (`components/`, `lib/`, `data/`)

### Variables & Functions

- **Variables**: camelCase (`charSlots`, `formationPick`, `slotTarget`)
- **Functions**: camelCase (`handleSave`, `assignFormation`, `resetSlot`)
- **Constants**: camelCase or UPPER_SNAKE_CASE (`initialCharSlots`, `MAX_SLOTS`)
- **Types/Interfaces**: PascalCase (`ItemType`, `LibraryItem`, `EquipKind`)

### React Components

- **Component names**: PascalCase (`Toolbar`, `DraggableImage`)
- **Props interfaces**: PascalCase with `Props` suffix (`ToolbarProps`)

### State Variables

- **State**: camelCase (`picker`, `search`, `charSlots`)
- **Setters**: `set` prefix (`setPicker`, `setSearch`, `setCharSlots`)

---

## 📝 TypeScript Conventions

### Type Definitions

```typescript
// ✅ Good - Use type aliases for unions
type ItemType = "card" | "char" | "pet" | "equip";
type EquipKind = "weapon" | "armor" | "helmet" | "roon" | "other";

// ✅ Good - Use interfaces for objects
interface LibraryItem {
  id: string;
  name: string;
  src: string;
}

// ✅ Good - Props interfaces
interface ToolbarProps {
  onPick: (type: ItemType) => void;
  onSave: () => void;
}
```

### Type Annotations

- **Explicit types** for function parameters
- **Return types** for exported functions
- **Generic types** for reusable functions
- **Type imports** with `type` keyword

```typescript
// ✅ Good
import type { ItemType } from "@/lib/store";

// ✅ Good - Explicit return type
const handleSave = async (): Promise<void> => {
  // ...
};

// ✅ Good - Generic type
const filterAvailable = (list: LibraryItem[], type: ItemType): LibraryItem[] => {
  // ...
};
```

### Strict Mode

- Always use TypeScript strict mode
- Never use `any` type (use `unknown` if needed)
- Define types for all function parameters
- Use type guards for runtime checks

---

## ⚛️ React Patterns

### Component Structure

```typescript
// ✅ Good - Component structure
"use client";

import { useState, useMemo } from "react";
import type { ItemType } from "@/lib/store";

interface ComponentProps {
  // props definition
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState();
  const memoized = useMemo(() => {}, []);

  // Handlers
  const handleAction = () => {
    // ...
  };

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Render
  return (
    // JSX
  );
}
```

### Hooks Usage

- **useState**: For component-local state
- **useMemo**: For expensive computations
- **useRef**: For DOM references and stable values
- **useEffect**: Minimize usage, prefer event handlers
- **useCallback**: For memoized callbacks (when needed)

### Event Handlers

```typescript
// ✅ Good - Inline arrow functions for simple handlers
<button onClick={() => setPicker("card")}>카드 추가</button>

// ✅ Good - Named functions for complex logic
const handleSelectToSlot = (item: LibraryItem) => {
  if (!slotTarget) return;
  // complex logic...
};

<button onClick={() => handleSelectToSlot(entry)}>Select</button>
```

### Conditional Rendering

```typescript
// ✅ Good - Ternary for two states
{slot.char ? (
  <img src={slot.char.src} alt={slot.char.name} />
) : (
  <span>캐릭터 선택</span>
)}

// ✅ Good - Logical AND for optional rendering
{isSelected && (
  <button onClick={handleDelete}>×</button>
)}

// ✅ Good - Early return for null
if (!picker || !slotTarget) return null;
```

---

## 📦 Import Organization

### Import Order

1. React and Next.js imports
2. Third-party library imports
3. Internal component imports
4. Type imports (with `type` keyword)
5. Data imports (JSON files)
6. Relative imports (if any)

```typescript
// ✅ Good - Organized imports
import { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import { Toolbar } from "@/components/Toolbar";
import type { ItemType } from "@/lib/store";
import cards from "@/data/cards.json";
import chars from "@/data/chars.json";
```

### Path Aliases

- Always use `@/` prefix for internal imports
- Never use relative paths (`../`) for internal imports

```typescript
// ✅ Good
import { Toolbar } from "@/components/Toolbar";
import type { ItemType } from "@/lib/store";

// ❌ Avoid
import { Toolbar } from "../components/Toolbar";
```

---

## 🎯 State Management Patterns

### Local State Updates

```typescript
// ✅ Good - Functional updates for arrays
setCharSlots((prev) => {
  const next = [...prev];
  next[index] = newValue;
  return next;
});

// ✅ Good - Functional updates for objects
setCharSlots((prev) => ({
  ...prev,
  [index]: { ...prev[index], char: newChar }
}));
```

### State Initialization

```typescript
// ✅ Good - useMemo for expensive initializations
const initialCharSlots = useMemo(
  () => Array.from({ length: 5 }, (_, idx) => ({
    id: `slot-${idx + 1}`,
    char: null,
    // ...
  })),
  []
);
```

---

## 🎨 JSX Conventions

### Attributes

- Use double quotes for string attributes
- Use camelCase for event handlers (`onClick`, `onChange`)
- Use `className` (not `class`)
- Use `htmlFor` (not `for`)

### Self-Closing Tags

```typescript
// ✅ Good
<img src={src} alt={name} className="..." />
<br />
<input type="text" value={value} onChange={handleChange} />

// ❌ Avoid
<img src={src} alt={name} className="..."></img>
```

### Conditional Classes

```typescript
// ✅ Good - Template literals
className={`rounded-lg border ${
  isSelected ? "border-purple-400" : "border-white/20"
}`}

// ✅ Good - Conditional class names library (if needed)
import classNames from "classnames";
className={classNames("base-class", {
  "active-class": isActive,
  "disabled-class": isDisabled
})}
```

---

## 💬 Comments & Documentation

### Comments

- Use Korean for user-facing comments
- Use English for technical comments
- Explain "why" not "what"
- Keep comments concise

```typescript
// ✅ Good - Explains why
// 글로벌 Delete/Backspace 단축키는 비활성화해 입력 시 스크롤 점프를 방지합니다.
useEffect(() => {}, []);

// ✅ Good - Explains complex logic
// 0-1 후열(파랑), 2-3 중열(주황), 4-5 전열(빨강)
const [formationSlots, setFormationSlots] = useState<(LibraryItem | null)[]>([
  null, null, null, null, null, null
]);
```

### Function Documentation

```typescript
// ✅ Good - JSDoc for complex functions
/**
 * Assigns a character to a formation slot with lane restrictions.
 * @param index - Slot index (0-5)
 * @param item - Character item to assign (null to clear)
 */
const assignFormation = (index: number, item: LibraryItem | null) => {
  // ...
};
```

---

## 🔧 Code Organization

### Function Order

1. State declarations
2. Memoized values
3. Event handlers
4. Effects
5. Render helpers
6. Return statement

### Component Size

- Keep components under 300 lines
- Extract sub-components when needed
- Use internal function components for organization
- Split large files into multiple components

---

## 🎯 Best Practices

### Do's ✅

- Use TypeScript for all code
- Follow consistent naming conventions
- Use path aliases (`@/`) for imports
- Memoize expensive computations
- Use functional state updates
- Keep components focused and small
- Use early returns for null checks
- Extract reusable logic into functions
- Use descriptive variable names
- Comment complex logic

### Don'ts ❌

- Don't use `any` type
- Don't mutate state directly
- Don't use relative imports for internal files
- Don't create deeply nested components
- Don't ignore TypeScript errors
- Don't use `var` (use `const` or `let`)
- Don't create circular dependencies
- Don't store derived state
- Don't use inline styles for static values
- Don't create overly complex conditionals

---

## 🧪 Error Handling

### Null Checks

```typescript
// ✅ Good - Early return
if (!canvasRef.current) return;

// ✅ Good - Optional chaining
const charName = slot.char?.name;

// ✅ Good - Nullish coalescing
const displayName = slot.char?.name ?? "캐릭터 선택";
```

### Type Guards

```typescript
// ✅ Good - Type guard
const isLibraryItem = (item: LibraryItem | null): item is LibraryItem => {
  return item !== null;
};

// Usage
if (isLibraryItem(pet)) {
  // TypeScript knows pet is LibraryItem here
}
```

---

## 📊 Data Structures

### Consistent Data Shape

All JSON data files follow the same structure:

```typescript
interface LibraryItem {
  id: string;      // Unique identifier
  name: string;    // Display name (Korean)
  src: string;     // Image path
}
```

### Array Patterns

```typescript
// ✅ Good - Filter and map
const availableChars = chars.filter(char => !usedIds.has(char.id));

// ✅ Good - Find index
const existingIdx = prev.findIndex((s) => s?.id === item.id);

// ✅ Good - Array transformation
const equipWithType = equips.map((eq) => ({
  ...eq,
  kind: getEquipKind(eq.src)
}));
```

---

## 🔍 Code Review Checklist

When reviewing code:

- [ ] Follows naming conventions
- [ ] Uses TypeScript properly (no `any`)
- [ ] Imports are organized correctly
- [ ] State updates are immutable
- [ ] Components are properly structured
- [ ] No unnecessary re-renders
- [ ] Comments explain complex logic
- [ ] Error handling is appropriate
- [ ] Code is readable and maintainable
- [ ] Follows project patterns

---

## 🎓 Learning Resources

### TypeScript

- Use TypeScript handbook for type system
- Prefer type inference when possible
- Use type guards for runtime checks

### React

- Follow React best practices
- Use hooks correctly
- Optimize re-renders

### Next.js

- Follow App Router conventions
- Use Server Components when possible
- Mark Client Components explicitly
