# Petzo landing page

Single-page marketing site for Petzo, built with Vite, three.js, GSAP (ScrollTrigger + SplitText) and Lenis.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs static files to dist/
```

- `index.html`: page markup (all sections, the phone and VMS dashboard mockups are HTML/CSS)
- `src/main.js`: smooth scroll, loader, scroll animations and interactions
- `src/scenes/hero.js`: WebGL hero (noise-displaced shader blob + particle halo)
- `src/scenes/backdrop.js`: flowing shader background behind Integrations and the final CTA
- `src/styles.css`: design tokens and layout

The contact form has no backend. It opens the visitor's email app with a message to info@petzoapp.com. Connect it to a form service or API before launch.
