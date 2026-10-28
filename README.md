# CREATIVE LAB — THE CORE

A real-time interactive mechanical sculpture and spatial observatory. React, TypeScript, Vite, Three.js and GSAP.

## Run locally

Node.js >= 22.12:

```sh
npm ci
npm run dev
```

Drag to orbit, scroll or pinch to zoom. Inspect components, disassemble and reassemble, cross the aperture, and explore five experiment entrances. Keyboard: arrows, D, C, Enter, R; Escape returns from the lab.

The other four experiment directions are spatial previews, not complete standalone works. Reduced motion, Eco rendering and graphics-error fallback are available.

## Validate and build

```sh
npm test
npm run typecheck
npm run build
```

GitHub Actions builds and publishes dist to GitHub Pages on main. Relative asset URLs support a project subdirectory. The editable Blender projects, local review captures and recovery archives are not included in this distribution. Models and shaders were created for this project; dependencies retain their respective licenses. No blanket open-source license is granted for original artwork or code.
