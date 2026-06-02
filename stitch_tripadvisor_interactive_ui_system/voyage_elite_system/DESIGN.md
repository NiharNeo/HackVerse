---
name: Voyage Elite System
colors:
  surface: '#f8fafb'
  surface-dim: '#d8dadb'
  surface-bright: '#f8fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#42484c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#72787d'
  outline-variant: '#c2c7cc'
  surface-tint: '#3f6378'
  primary: '#001723'
  on-primary: '#ffffff'
  primary-container: '#002d40'
  on-primary-container: '#7195ac'
  inverse-primary: '#a7cbe4'
  secondary: '#00658c'
  on-secondary: '#ffffff'
  secondary-container: '#2cbcfd'
  on-secondary-container: '#004966'
  tertiary: '#00190e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00301f'
  on-tertiary-container: '#00a472'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#a7cbe4'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#264b5f'
  secondary-fixed: '#c5e7ff'
  secondary-fixed-dim: '#80cfff'
  on-secondary-fixed: '#001e2d'
  on-secondary-fixed-variant: '#004c6a'
  tertiary-fixed: '#5cfdbc'
  tertiary-fixed-dim: '#34e0a1'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005237'
  background: '#f8fafb'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  deep-navy: '#002D40'
  vibrant-aqua: '#00AFEF'
  tropical-teal: '#34E0A1'
  sunset-accent: '#FFC56F'
  ink-black: '#000000'
  surface-white: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  gutter: 1rem
  margin-mobile: 1rem
  margin-desktop: 5rem
  max-width: 1280px
---

## Brand & Style

The design system is engineered for a high-end, adventure-focused travel agency that balances professional reliability with the aspirational beauty of global exploration. It targets discerning travelers who seek both information-rich planning tools and breathtaking visual inspiration.

The visual style is **Corporate / Modern** with subtle **Glassmorphic** accents. It prioritizes clarity and high-density information architecture—reminiscent of industry leaders like TripAdvisor—while utilizing expansive, high-quality photography to evoke emotional resonance. The interface feels trustworthy and systematic, yet breathes through generous whitespace and refined, translucent overlays that ensure legibility over scenic backgrounds.

## Colors

The palette is anchored by a sophisticated **Deep Navy** (`#002D40`), providing a grounded, professional foundation for typography and structural elements. **Vibrant Aqua** and **Tropical Teal** serve as the primary action colors, mirroring the tones of clear ocean waters and providing high-contrast focal points for CTAs and interactive states.

- **Primary (Deep Navy):** Used for primary text, navigation backgrounds, and heavy structural elements.
- **Secondary (Vibrant Aqua):** The signature action color for buttons, links, and active progress indicators.
- **Tertiary (Tropical Teal):** Reserved for success states, highlights, and health/rating scores.
- **Neutral:** A range of crisp whites and cool-toned grays (`#F7F9FA`) facilitate high-density layouts without visual fatigue.
- **Accent (Sunset):** Used sparingly for "Special Offers" or "Featured" badges to provide a warm counterpoint to the cool primary palette.

## Typography

This design system employs a dual-font strategy. **Plus Jakarta Sans** is used for headlines and labels to provide a modern, friendly, and geometric character that remains legible at various scales. **Inter** is the workhorse for body copy and data-dense descriptions, chosen for its exceptional readability and neutral tone.

To ensure legibility against scenic photography, use the `label-caps` style with a semi-transparent Deep Navy background or apply a subtle 20% black gradient overlay behind white `headline-lg` text. Headlines use a tight line-height to maintain a compact, professional appearance in information-dense areas.

## Layout & Spacing

The system uses a **Fixed Grid** model for desktop to ensure a premium, curated feel, transitioning to a **Fluid Grid** for mobile devices. 

- **Desktop (1024px+):** 12-column grid with 24px (1.5rem) gutters and 80px (5rem) side margins.
- **Tablet (768px - 1023px):** 8-column grid with 16px (1rem) gutters and 40px (2.5rem) side margins.
- **Mobile (Up to 767px):** 4-column fluid grid with 16px (1rem) gutters and margins.

Spacing follows an 8px base unit. In data-heavy areas like flight listings or review snippets, use the `sm` (8px) and `md` (16px) units to maintain high density without sacrificing clarity. For editorial content or destination showcases, use `xl` (40px) to provide visual "breathing room."

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Tonal Layers** and **Glassmorphism**.

1.  **Base Layer:** The light neutral background (`#F7F9FA`).
2.  **Surface Layer:** White cards with a 1px border (`#E5E7EB`) and no shadow for a flat, clean look.
3.  **Elevated Layer:** Active cards or modals use an ambient shadow (0px 4px 20px rgba(0, 45, 64, 0.08)) to create a gentle lift.
4.  **Glass Overlays:** For text over images, use a Backdrop Blur (12px) with a 60% opacity white or 40% opacity Deep Navy fill. This creates a "frosted glass" effect that separates content from the busy visual textures of travel photos.

## Shapes

The design system utilizes **Rounded** geometry to feel approachable and modern. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Components:** Hero sections and destination cards use a 1rem (16px) radius to emphasize their container status.
- **Interactive Indicators:** Search bars and specific badges may use a 1.5rem (24px) radius for a softer, pill-shaped aesthetic that stands out in a structured grid.

## Components

### Buttons
- **Primary:** Deep Navy background with White text. Hover state shifts to Vibrant Aqua with a 200ms ease-in-out transition.
- **Secondary:** Transparent with a 2px Vibrant Aqua border.
- **Booking CTA:** Vibrant Aqua background with White text, using a subtle pulse animation on mobile to draw focus.

### Destination Cards
- Cards feature a full-bleed image background.
- Typography is placed on a glassmorphic bottom-aligned panel or a subtle top-left badge.
- **Hover/Tap State:** The image should scale slightly (1.05x) within the container, and a "View Details" button should slide in from the bottom.

### Search Bar (Mobile-First)
- A prominent, sticky component at the top of the viewport.
- Uses a pill-shape (`rounded-xl`) with a 1px soft border and high-contrast icons for "Destination," "Dates," and "Guests."

### Review Snippets
- High-density layout using `body-sm`.
- Star ratings utilize the Tropical Teal color for a positive, "trust-verified" look.
- User avatars are circular (32px) to provide a human element to the data.

### Animations
- **Slide-in Reveal:** As users scroll, content blocks should slide up 20px while fading in.
- **Horizontal Scrollers:** Used for "Trending Destinations," allowing users to swipe through cards while maintaining the vertical flow of the page.