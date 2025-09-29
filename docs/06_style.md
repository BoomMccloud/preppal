# Theme and Styling Best Practices

This document outlines the theme and styling best practices used in the PrepPal application based on our implementation patterns.

## Technology Stack

- **Tailwind CSS v4**: Modern CSS framework with native PostCSS plugin
- **Custom CSS Variables**: Theme-based color system with dark mode support
- **Geist Font**: Google Fonts integration for consistent typography
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts

## Theme Architecture

### Color System
We use a semantic color system defined in `src/styles/globals.css` with CSS custom properties:

```css
/* Light mode (default) */
--color-primary: #fcfcfc;          /* Off-White backgrounds */
--color-secondary: #f1f3f4;        /* Light Gray secondary backgrounds */
--color-primary-text: #334155;     /* Dark Slate for primary text */
--color-secondary-text: #64748b;   /* Medium Slate for secondary text */
--color-accent: #0d9488;           /* Teal for accent elements */
--color-success: #16a34a;          /* Forest Green for success states */
--color-danger: #ef4444;           /* Coral Red for error states */

/* Dark mode overrides */
.dark {
  --color-primary: #1f2937;        /* Dark Slate backgrounds */
  --color-secondary: #374151;      /* Medium Slate secondary backgrounds */
  --color-primary-text: #f9fafb;   /* Off-White for primary text */
  --color-secondary-text: #9ca3af; /* Light Slate for secondary text */
  --color-accent: #5eead4;         /* Bright Teal for accent elements */
  --color-success: #a7f3d0;        /* Mint Green for success states */
  --color-danger: #fda4af;         /* Salmon Pink for error states */
}
```

### Theme Implementation Patterns

#### 1. Semantic Color Usage
Always use semantic color classes in Tailwind:
- `bg-primary` / `bg-secondary` for backgrounds
- `text-primary-text` / `text-secondary-text` for text colors
- `bg-accent` / `text-accent` for interactive elements
- `border-secondary-text` for borders

#### 2. Dark Mode Strategy
- Use CSS class-based toggle (`.dark` class on `documentElement`)
- Store user preference in `localStorage`
- Respect system preference as fallback
- Prevent hydration mismatches with mounted state checks

#### 3. Transition Patterns
Apply smooth transitions for theme changes:
```css
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

Component-level transitions:
```tsx
className="transition-colors hover:bg-accent/10"
```

## Component Styling Patterns

### 1. Card Components
Standard card pattern with backdrop blur and borders:
```tsx
className="bg-secondary backdrop-blur-sm rounded-lg p-6 border border-secondary-text"
```

### 2. Navigation Elements
Active state pattern for navigation items:
```tsx
className={`transition-colors border ${
  isActive
    ? "text-primary bg-accent border-accent font-semibold"
    : "text-secondary-text hover:text-primary-text hover:bg-accent/10 border-transparent hover:border-accent/20"
}`}
```

### 3. Interactive Buttons
Button styling with semantic colors:
```tsx
// Primary action
className="bg-accent hover:bg-accent/80 text-primary p-4 rounded-full transition-colors"

// Secondary action
className="bg-secondary hover:bg-secondary/80 text-primary-text p-4 rounded-full transition-colors border border-secondary-text/10"
```

### 4. Status Indicators
Color-coded status mapping:
```tsx
const statusMap = {
  live: { className: 'text-green-500' },
  error: { className: 'text-red-500' },
  idle: { className: 'text-secondary-text' },
  // etc.
}
```

## Responsive Design Patterns

### 1. Container Patterns
```tsx
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

### 2. Mobile-First Breakpoints
```tsx
// Mobile menu
className="md:hidden pb-4"

// Desktop navigation
className="hidden md:flex space-x-6"

// Responsive text
className="text-sm hidden sm:block"
```

### 3. Flex Layouts
```tsx
// Navigation layout
className="flex justify-between h-16"

// Button groups
className="flex justify-center items-center space-x-6"
```

## Typography System

### Font Configuration
- **Primary Font**: Geist (Google Fonts)
- **Font Variable**: `--font-geist-sans`
- **Fallback Stack**: `ui-sans-serif, system-ui, sans-serif`

### Text Hierarchy
- `text-xl font-bold` for brand/logo
- `text-2xl font-semibold` for section headings
- `text-sm font-medium` for navigation items
- `text-sm` for secondary information

## Best Practices

### 1. Theme Consistency
- Always use semantic color variables, never hardcoded colors
- Maintain consistent spacing using Tailwind's spacing scale
- Use the established transition patterns for state changes

### 2. Accessibility
- Provide proper `aria-label` attributes for interactive elements
- Ensure sufficient color contrast in both light and dark modes
- Use semantic HTML elements with proper roles

### 3. Performance
- Use CSS custom properties for efficient theme switching
- Implement proper hydration strategies to prevent layout shifts
- Leverage Tailwind's utility classes for optimal CSS bundle size

### 4. Component Architecture
- Accept `className` prop for extensibility
- Use conditional classes with template literals for state management
- Keep styling patterns consistent across similar components

### 5. File Organization
- Global styles in `src/styles/globals.css`
- Component-specific styles via Tailwind classes
- Theme configuration centralized in CSS custom properties

## Configuration Files

- **PostCSS**: `postcss.config.js` with `@tailwindcss/postcss` plugin
- **Global Styles**: `src/styles/globals.css` with theme definitions
- **Font Loading**: `src/app/layout.tsx` with Geist font configuration

This documentation serves as a reference for maintaining consistent styling patterns throughout the PrepPal application.