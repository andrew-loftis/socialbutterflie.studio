# Mobile UI Reference Guide

## Layout Comparison

### Desktop Layout (1280px+)
```
┌─────────────────────────────────────────────────────────┐
│ [SB]  │ Header: Content Calendar              [New Post]│
│   🗓   │                                                  │
│   📊  │ ┌──────────────────────┐  ┌────────────────┐   │
│   ⚙️  │ │                      │  │   Accounts     │   │
│       │ │    Calendar Grid     │  ├────────────────┤   │
│   👤  │ │                      │  │ AI Assistant   │   │
│       │ │                      │  ├────────────────┤   │
│       │ └──────────────────────┘  │   Frame.io     │   │
│       │                            └────────────────┘   │
└─────────────────────────────────────────────────────────┘
 80px │            Main Content        │   360px Sidebar
      └────────────────────────────────┘
```

### Mobile Layout (≤768px)
```
┌───────────────────────────────┐
│ [SB] Social Butterflie    [☰] │ ← Top Header (fixed)
├───────────────────────────────┤
│                               │
│  Content Calendar             │
│  [Connected] [IG][FB]         │
│                               │
│ ┌───────────────────────────┐ │
│ │   Calendar Grid           │ │
│ │                           │ │
│ │   [Events displayed here] │ │
│ │                           │ │
│ └───────────────────────────┘ │
│                               │
│                          [+]  │ ← FAB (Floating)
│                       [↑]     │ ← Scroll Top
├───────────────────────────────┤
│ [SB] 🗓  📊  ⚙️  👤           │ ← Bottom Nav (fixed)
└───────────────────────────────┘
```

### Mobile with Drawer Open
```
┌───────────────────────────────┐
│ [SB] Social Butterflie    [☰] │
├─────────────────┬─────────────┤
│                 │Quick Access │
│   (Overlay)     │    [×]      │
│                 ├─────────────┤
│                 │             │
│                 │ Accounts    │
│                 │ • Instagram │
│                 │ • Facebook  │
│                 │             │
│                 │ AI Assistant│
│                 │             │
│                 │ Frame.io    │
│                 │             │
│                 │             │
├─────────────────┴─────────────┤
│ 🗓  📊  ⚙️  👤                │
└───────────────────────────────┘
        ← Swipe right to close
```

## Component Transformations

### Navigation Rail
**Desktop → Mobile Transform**
```
Desktop (Vertical Left):        Mobile (Horizontal Bottom):
┌──────┐                        ┌──────────────────────────┐
│ [SB] │                        │[SB] 🗓 📊 ⚙️ 👤         │
│  🗓  │            →           └──────────────────────────┘
│  📊  │                        Bottom: 0, Height: 72px
│  ⚙️  │                        Justify: space-around
│  👤  │
└──────┘
Left: 0, Width: 80px
```

### New Post Button
**Desktop → Mobile Transform**
```
Desktop (Regular Button):       Mobile (Floating FAB):
┌─────────────────┐            
│ [+] New Post    │                         ┌─────┐
└─────────────────┘             →           │ [+] │ ← 60x60 circle
Top bar, inline                             └─────┘
                                            Fixed bottom-right
                                            Above bottom nav
```

### Modal Dialogs
**Desktop → Mobile Transform**
```
Desktop (Centered):             Mobile (Bottom Sheet):
     ┌──────────┐              ┌─────────────────────┐
     │          │              │                     │
     │  Modal   │   →          │      Content        │
     │          │              │   (slides up)       │
     └──────────┘              └─────────────────────┘
   Centered, 720px             Full width, 92vh max
   Backdrop overlay            Rounded top corners
```

## Touch Targets

### Minimum Sizes (Mobile)
```
Element Type          Desktop    Mobile     Notes
─────────────────────────────────────────────────────
Navigation Item       48x48      48x48      OK
Button                ~40px      44x44      Increased
Icon Button           36x36      44x44      Increased
Calendar Event        auto       touch-opt  Min 44px
Input Field           auto       48px min   Full width
FAB                   N/A        60x60      Prominent
```

## Spacing System

### Padding Scale
```
Component             Desktop      Mobile
─────────────────────────────────────────
Main Surface          40px         16px
Glass Panel           24px         20px
Top Bar               28px         18px
Form Elements         14px         12px
Modal                 32px         24px
Drawer Body           20px         20px
```

## Z-Index Hierarchy
```
Layer                 Z-Index     Purpose
────────────────────────────────────────────
Base Content          1           Default flow
Bottom Navigation     1000        Always visible
Mobile Header         999         Below nav, above content
Floating Actions      900         Above content, below nav
Mobile Drawer         1100        Above navigation
Drawer Overlay        1050        Between nav and drawer
Modals                60          Standard overlay
```

## Breakpoint Details

### Media Query Strategy
```css
/* Very Small Mobile */
@media (max-width: 380px) {
  - Icon-only buttons
  - Minimal padding
  - Horizontal scroll chips
}

/* Mobile */
@media (max-width: 768px) {
  - Bottom navigation
  - Stacked layout
  - Mobile drawer
  - FAB button
}

/* Landscape Mobile */
@media (max-width: 768px) and (orientation: landscape) {
  - Reduced nav height (64px)
  - Compact spacing
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  - Slim sidebar (72px)
  - Single column content
}

/* Desktop Small */
@media (min-width: 1025px) and (max-width: 1279px) {
  - Standard sidebar (80px)
  - Single column content
}

/* Desktop Large */
@media (min-width: 1280px) {
  - Two-column layout
  - Full features visible
}
```

## Color Palette (Dark Theme)

### Background Colors
```css
--bg-base:           #05070d     /* Deepest background */
--glass-panel:       rgba(12,16,26,0.86) /* Panels */
--nav-background:    rgba(9,12,21,0.96)  /* Navigation */
--drawer-background: rgba(14,20,36,0.98) /* Mobile drawer */
```

### Interactive Colors
```css
--accent:           #5b7cff     /* Primary actions */
--accent-strong:    #6c5ce7     /* Hover states */
--text-primary:     #eff3fb     /* Main text */
--text-muted:       #7e8799     /* Secondary text */
--glass-border:     rgba(124,144,196,0.25) /* Borders */
```

### Platform Colors
```css
Instagram:  #e1306c
Facebook:   #1877f2
YouTube:    #ff0000
TikTok:     #010101
```

## Animation Timings

### Transition Speeds
```css
--transition: 150ms ease          /* Default interactions */
Drawer Open:  300ms ease-out      /* Slide animations */
Modal Open:   300ms ease-out      /* Bottom sheet */
Scroll:       smooth              /* Native scroll */
FAB Tap:      scale(0.95) 100ms   /* Press feedback */
```

## Gesture Support

### Implemented Gestures
```
Gesture              Action                Platform
──────────────────────────────────────────────────
Tap                  Activate              All
Long Press           Context menu          Planned
Swipe Right          Close drawer          Mobile
Swipe Left           -                     Reserved
Swipe Up (drawer)    Scroll content        Mobile
Pinch Zoom           Zoom UI               All
Double Tap           Select text           All (no zoom)
Pull Down            Refresh (planned)     Mobile
```

## Safe Area Handling

### iPhone Notch Support
```css
/* Top safe area (for notch/Dynamic Island) */
padding-top: max(12px, env(safe-area-inset-top));

/* Bottom safe area (for home indicator) */
padding-bottom: max(8px, env(safe-area-inset-bottom));

/* Sides (for edge gestures) */
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### Applied To
- Mobile header top padding
- Bottom navigation bottom padding
- Drawer header top padding
- Drawer body bottom padding
- Main content top padding

## Performance Optimizations

### CSS Performance
```css
/* GPU acceleration for animations */
transform: translateX(0);
will-change: transform;

/* Efficient scrolling */
-webkit-overflow-scrolling: touch;
overscroll-behavior-y: contain;

/* Backdrop filter optimization */
backdrop-filter: blur(32px);  /* High DPI */
backdrop-filter: blur(24px);  /* Standard */
```

### JavaScript Performance
```javascript
// Passive event listeners
{ passive: true }

// Debounced scroll
throttle(handleScroll, 150)

// RAF for animations
requestAnimationFrame(callback)
```

## Accessibility Features

### Keyboard Navigation
- Tab order preserved on mobile
- Focus visible on keyboard use
- Skip to content link
- ARIA labels on icons

### Screen Reader Support
```html
<button aria-label="Close menu">
  <i class="fa-solid fa-xmark"></i>
</button>

<nav aria-label="Primary navigation">
  ...
</nav>
```

### Color Contrast
- WCAG AA compliant
- 4.5:1 minimum for text
- 3:1 for interactive elements

---

**Quick Reference Card**

**Mobile Features:**
✅ Bottom tab navigation
✅ Swipe-able drawer
✅ Floating action button
✅ Scroll to top
✅ Bottom sheet modals
✅ Touch-optimized targets
✅ Safe area support
✅ Landscape mode
✅ Reduced motion

**Test Devices:**
- iPhone 15 Pro (393x852)
- iPhone SE (375x667)
- iPad (768x1024)
- Galaxy S23 (360x800)
- Pixel 7 (412x915)
