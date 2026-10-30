# UI ANTI-PATTERNS
Banned by default. Override only if the spec names it and why.

## Layout
- Centered hero + two buttons + three feature cards
- Everything centered; no deliberate alignment axis
- Uniform spacing everywhere; no rhythm or tension
- Text wider than ~75ch
- Bento grid as the default answer

## Typography
- One default sans for everything, no pairing decision
- Timid scale; headings barely larger than body
- Gradient text on headlines

## Color & surface
- Purple/blue gradient backgrounds
- Glassmorphism as decoration
- Shadow on every card
- Contrast failing WCAG AA

## Motion
- Fade-up on every element on scroll
- Motion that doesn't guide attention or explain change
- Ignoring prefers-reduced-motion; default easings

## Components
- Emoji as icons; mixed icon sets
- Unstyled shadcn or registry components shipped with demo styling
- Decorative effect components as garnish (aurora, beams, sparkles,
  glow, shimmer)
- Off-the-shelf blocks as finished sections
- Missing hover/focus/pressed/disabled states

## Copy
- "Unlock", "Elevate", "Seamless", "Supercharge"
- Placeholder copy in any demo
- Headlines describing features instead of outcomes

## States
- Any screen without empty, loading, error, success
- Spinners where skeletons belong
- Errors that don't say how to recover

## Final test
"Could this be any AI-generated SaaS site?" If yes, it's not done.
