# TaskManagerPRO Theming Guide

This document provides guidelines for maintaining a consistent visual style across the TaskManagerPRO application.

## Color Theme

We've implemented a professional dark theme with bright accent colors. The theme is defined in `src/lib/theme.ts` and exported as `appColors`.

### Main Colors

```typescript
export const appColors = {
  background: {
    primary: '#0F172A',     // Deep blue-black
    card: '#1E293B',        // Dark blue-gray
    input: '#0F172A',       // Darker blue for inputs
  },
  accent: {
    primary: '#3B82F6',     // Bright blue
    secondary: '#60A5FA',   // Lighter blue
    success: '#10B981',     // Emerald green
    highlight: '#8B5CF6',   // Vibrant purple
    gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', // Blue to purple gradient
  },
  text: {
    primary: '#F1F5F9',     // Almost white
    secondary: '#CBD5E1',   // Light gray
    muted: '#64748B',       // Muted blue-gray
  },
  border: {
    light: '#334155',       // Medium blue-gray
    focus: '#60A5FA',       // Light blue for focus
  }
};
```

## Using the Theme

### 1. Import the Theme

```typescript
import { appColors } from '@/lib/theme';
```

### 2. Use Theme Colors

Replace hardcoded colors with theme references:

```typescript
// Before
<Box bg="#0F172A" color="#F1F5F9">

// After
<Box bg={appColors.background.primary} color={appColors.text.primary}>
```

### 3. Using Gradients

```typescript
// Using the predefined gradient
<Button bgGradient={appColors.accent.gradient}>

// Creating a custom gradient
<Box bgGradient={`linear(to-r, ${appColors.accent.primary}, ${appColors.accent.highlight})`}>
```

### 4. Adding Transparency

To add transparency to colors, append hex opacity values:

```typescript
// 80% opacity (CC)
<Box bg={`${appColors.accent.primary}CC`}>

// 50% opacity (80)
<Box bg={`${appColors.accent.primary}80`}>

// 20% opacity (33)
<Box bg={`${appColors.accent.primary}33`}>

// 10% opacity (1A)
<Box bg={`${appColors.accent.primary}1A`}>
```

## UI Component Guidelines

### Buttons

```typescript
// Primary button
<Button
  bgGradient={appColors.accent.gradient}
  color="white"
  _hover={{ 
    bgGradient: "linear(135deg, #2563EB, #7C3AED)",
    transform: "translateY(-2px)",
    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)"
  }}
  _active={{
    transform: "translateY(0)",
    boxShadow: "none"
  }}
>
  Primary Button
</Button>

// Secondary button
<Button
  variant="outline"
  borderColor={appColors.accent.primary}
  color={appColors.accent.primary}
  _hover={{ bg: `${appColors.accent.secondary}1A` }}
>
  Secondary Button
</Button>
```

### Cards

```typescript
<Box
  bg={appColors.background.card}
  borderRadius="xl"
  boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
  overflow="hidden"
  p={6}
>
  Card content
</Box>
```

### Forms

```typescript
<FormControl>
  <FormLabel color={appColors.text.secondary}>Label</FormLabel>
  <Input
    bg={appColors.background.input}
    borderColor={appColors.border.light}
    color={appColors.text.primary}
    _hover={{ borderColor: appColors.border.focus }}
    _focus={{ 
      borderColor: appColors.accent.primary, 
      boxShadow: `0 0 0 1px ${appColors.accent.primary}`,
      bg: 'rgba(15, 23, 42, 0.8)'
    }}
  />
</FormControl>
```

## Helper Script

To identify files that need theme updates, run:

```
node scripts/apply-theme-colors.js
```

This script will scan the codebase for hardcoded colors and provide instructions for updating them. 