# 🎨 Styling Rules

## Overview

This project uses **Tailwind CSS** for utility-first styling with a custom dark theme optimized for game asset editing.

---

## 🎨 Theme Configuration

### Color Palette

The project uses a custom dark theme with the following color scheme:

```typescript
colors: {
  canvas: "#0b0b14",      // Dark canvas background
  panel: "#f5f5f7",       // Light panel background
  accent: "#7c3aed"       // Purple accent color
}
```

### Base Theme

- **Background**: `slate-900` / `slate-950` gradients
- **Text**: White with opacity variations (`text-white`, `text-white/80`, `text-white/60`)
- **Borders**: White with low opacity (`border-white/10`, `border-white/20`)
- **Shadows**: Black with opacity (`shadow-black/40`, `shadow-black/50`)

---

## 🎯 Tailwind CSS Usage

### Utility-First Approach

Always prefer Tailwind utility classes over custom CSS:

```tsx
// ✅ Good
<div className="rounded-xl border border-white/10 bg-white/5 p-3">

// ❌ Avoid
<div className="custom-card">
```

### Common Patterns

#### Containers & Cards
```tsx
className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/40"
```

#### Buttons
```tsx
// Primary action
className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"

// Secondary action
className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
```

#### Input Fields
```tsx
className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
```

#### Badges & Labels
```tsx
className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90"
```

---

## 🌈 Color Coding System

### Formation Lanes

Use consistent color gradients for formation lanes:

- **후열 (Back Lane)**: `from-sky-600/70 via-sky-500/60 to-sky-600/70` (Blue)
- **중열 (Mid Lane)**: `from-amber-500/70 via-amber-400/60 to-amber-500/70` (Orange)
- **전열 (Front Lane)**: `from-rose-500/70 via-rose-400/60 to-rose-500/70` (Red)

**Pattern:**
```tsx
className={`bg-gradient-to-br ${colorStyle}`}
```

### Category Colors

Use distinct gradient colors for different categories:

- **Cards**: `from-indigo-500 to-purple-500`
- **Characters**: `from-emerald-500 to-teal-500`
- **Pets**: `from-amber-500 to-orange-500`
- **Equipment**: `from-cyan-500 to-sky-500`

---

## 📐 Spacing & Layout

### Grid Systems

```tsx
// 5-column grid for character slots
className="grid grid-cols-5 gap-4"

// 2-column grid for equip items
className="grid grid-cols-2 gap-3"

// Responsive grid
className="grid grid-cols-1 gap-4 lg:grid-cols-2"
```

### Gap Sizes

- **Small**: `gap-2` (8px) - Tight spacing
- **Medium**: `gap-3` (12px) - Standard spacing
- **Large**: `gap-4` (16px) - Section spacing
- **Extra Large**: `gap-6` (24px) - Major sections

### Padding

- **Small**: `p-2` (8px) - Compact components
- **Medium**: `p-3` (12px) - Standard components
- **Large**: `p-4` (16px) - Containers

---

## 🎭 Visual Effects

### Shadows

```tsx
// Light shadow
className="shadow-lg shadow-black/40"

// Heavy shadow
className="shadow-2xl shadow-black/50"

// Hover shadow
className="hover:shadow-lg hover:shadow-black/40"
```

### Backdrop Blur

```tsx
className="bg-slate-800/80 backdrop-blur"
```

### Transitions

```tsx
// Standard transition
className="transition hover:brightness-110"

// Border transition
className="transition hover:border-white/40"
```

### Hover States

```tsx
// Brightness increase
className="hover:brightness-110"

// Border highlight
className="hover:border-white/40"

// Background change
className="hover:bg-white/20"
```

---

## 📱 Responsive Design

### Breakpoints

- **Mobile**: Default (no prefix)
- **Tablet**: `lg:` (1024px+)

### Responsive Patterns

```tsx
// Stack on mobile, side-by-side on desktop
className="flex flex-col gap-4 lg:flex-row lg:gap-6"

// Single column on mobile, grid on desktop
className="grid grid-cols-1 gap-4 lg:grid-cols-2"
```

---

## 🖼️ Image Styling

### Image Containers

```tsx
// Aspect ratio containers
className="aspect-[3/4] w-full"

// Rounded images
className="rounded-lg object-cover"

// Contained images (preserve aspect ratio)
className="h-full w-full object-contain"
```

### Image Overlays

```tsx
// Gradient overlay
style={{
  backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.4)), url(${src})`,
  backgroundSize: "cover",
  backgroundPosition: "center"
}}
```

---

## 📜 Typography

### Font Sizes

- **Extra Small**: `text-[10px]` or `text-xs` (12px)
- **Small**: `text-sm` (14px)
- **Base**: `text-base` (16px) - Default
- **Large**: `text-lg` (18px)
- **Extra Large**: `text-2xl` (24px)

### Font Weights

- **Normal**: `font-normal` (400)
- **Semibold**: `font-semibold` (600) - Most UI text
- **Bold**: `font-bold` (700) - Headings

### Text Colors

- **Primary**: `text-white`
- **Secondary**: `text-white/80`
- **Tertiary**: `text-white/60`
- **Muted**: `text-white/40`
- **Error**: `text-red-300` / `text-red-200`

### Text Utilities

```tsx
// Truncate long text
className="truncate"

// Uppercase with tracking
className="uppercase tracking-wide"

// Line clamp (multi-line truncate)
className="line-clamp-2"
```

---

## 🎪 Custom CSS Classes

### Global Styles (`app/globals.css`)

Only add custom CSS for:

1. **Scrollbar styling**
```css
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
```

2. **Canvas-specific styles**
```css
.canvas-border {
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.04), transparent 65%);
  border: 1px dashed rgba(255, 255, 255, 0.1);
}
```

3. **Base element overrides**
```css
body {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

---

## 🎯 State-Based Styling

### Conditional Classes

Use template literals for conditional styling:

```tsx
className={`rounded-lg border ${
  isSelected
    ? "border-purple-400 bg-purple-500/30"
    : "border-white/20 bg-white/5"
}`}
```

### Dynamic Styles

Use inline styles for dynamic values:

```tsx
style={{
  transform: `rotate(${rotation}deg)`,
  zIndex: zIndex
}}
```

---

## 🎨 Opacity Levels

Use consistent opacity values:

- **10%**: `white/10` - Subtle borders, backgrounds
- **15%**: `white/15` - Input borders, badges
- **20%**: `white/20` - Hover states, dividers
- **30%**: `white/30` - Active states
- **40%**: `white/40` - Muted text, borders
- **50%**: `white/50` - Disabled states
- **60%**: `white/60` - Secondary text
- **70%**: `white/70` - Tertiary text
- **80%**: `white/80` - Primary text (secondary)
- **100%**: `white` - Primary text

---

## 🎭 Border Styles

### Border Types

```tsx
// Solid border
className="border border-white/10"

// Dashed border (for empty states)
className="border border-dashed border-white/20"

// No border
className="border-0"
```

### Border Radius

- **Small**: `rounded-md` (6px)
- **Medium**: `rounded-lg` (8px)
- **Large**: `rounded-xl` (12px)
- **Extra Large**: `rounded-2xl` (16px)
- **Full**: `rounded-full` (9999px)

---

## ✅ Styling Best Practices

### Do's ✅

- Use Tailwind utility classes primarily
- Maintain consistent spacing and sizing
- Use semantic color names (e.g., `sky-600` for blue)
- Apply opacity for text hierarchy
- Use gradients for visual interest
- Keep custom CSS minimal
- Use responsive utilities for mobile-first design

### Don'ts ❌

- Don't create custom CSS classes unless necessary
- Don't use inline styles for static values
- Don't mix opacity percentages inconsistently
- Don't use arbitrary values (`w-[123px]`) unless necessary
- Don't override Tailwind defaults without reason
- Don't use `!important` in custom CSS

---

## 🎨 Component-Specific Styles

### Toolbar

- Gradient buttons with hover effects
- Divider between button groups
- Backdrop blur for depth

### Slot Components

- Rounded containers with borders
- Dashed borders for empty states
- Image overlays with text labels
- Reset buttons in red

### Formation Components

- Gradient backgrounds by lane
- Grid layouts for slot arrangement
- Visual feedback for selected items
- Empty state indicators

### Library Sidebar

- Scrollable list with custom scrollbar
- Search input with focus states
- Item cards with hover effects
- Category badges

---

## 🔍 Style Review Checklist

When reviewing styling changes:

- [ ] Uses Tailwind utilities (not custom CSS)
- [ ] Consistent spacing and sizing
- [ ] Proper opacity levels for text hierarchy
- [ ] Responsive design considered
- [ ] Hover states implemented
- [ ] Color coding follows conventions
- [ ] Borders and shadows consistent
- [ ] Typography follows size/weight rules
