# Pinnacle Studios: The Gallery

A 3D art-gallery agency website. Visitors ride an art-deco lift between five floors, and each floor is its own page:

| Floor | Page | What's there |
|---|---|---|
| **G · The Lobby** | `/` | Hero: "Pinnacle Studios" sculpted in 3D on a mirror floor. **Pinn the mascot is the dot of the i**: it blinks, watches the cursor and hops between the i's. Then the curator's note (stats) and the floor guide. |
| **1 · Services Wing** | `/services` | White-cube gallery, one animated sculpture per service: software, websites, UI/UX, branding, motion, automation, SEO. |
| **2 · Case Study Hall** | `/work`, `/work/<slug>` | Salon of gilded frames. Click a canvas: the camera walks up to it and the full case study slides in. |
| **3 · Studio Rotunda** | `/studio` | Domed rotunda: story, process, team & careers, testimonials, clients, engagement models. |
| **R · The Rooftop** | `/contact` | Night skyline with a neon sign: contact form, FAQ, footer with socials and legal. |

Scroll, swipe or use the arrow keys to walk. Keep scrolling past the end of a floor to ride the lift. You can also use the lift buttons, the **Directory**, or any link.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build
```

In development you can add `?enter` to any URL to skip the "Enter the gallery" button.

## Edit the content

**Every word lives in [`src/content.js`](src/content.js).** Items marked `SAMPLE` are placeholder copy: case studies, testimonials, stats and client names. Replace them before launch, along with the `TODO`s:

- `site.url`: your domain (used for canonical URLs + sitemap)
- `site.email`, `site.phone`, `site.location`, `site.founded`, `site.socials`
- `site.formEndpoint`: a Formspree/Getform/your-API URL. If you leave it empty, the form opens the visitor's email app with the brief pre-filled.

Case-study artwork is generated from each study's `palette` and `style`. To use real screenshots, pass an image texture to `frame()` in `src/world/floors/WorkHall.js`.

## SEO & accessibility

- `npm run build` writes a real HTML file for every floor and case study, each with its own title, description and canonical URL, plus `sitemap.xml` and `robots.txt`. It works on any static host (Netlify, Vercel, Cloudflare Pages, S3…).
- The full site content is also pre-rendered as a normal HTML document (the **2D view**), so crawlers, screen readers and devices without WebGL get everything. Visitors can switch with the "2D view" button. JSON-LD `ProfessionalService` structured data is included.
- Keyboard navigation, focus styles, `prefers-reduced-motion` support and live-region floor announcements.
## Performance

- **Quality tiers.** Integrated and mobile GPUs (Intel, AMD Radeon Graphics APUs, Mali, Adreno…) automatically get the light tier: no real-time shadows, FXAA instead of 4× MSAA, and a smaller mirror reflection. Force a tier with `?quality=low` or `?quality=high`.
- **Pixel budget + dynamic resolution.** The 3D view renders at a fixed pixel budget (about 1.6 MP light tier, 2.8 MP high), so big or high-DPI screens don't overload the GPU. It then adjusts the resolution every second to hold ~60 fps.
- **Few real lights.** Each floor uses at most 5 real lights. Two "roving" spotlights glide to the exhibits nearest the visitor; every other beam and floor pool is a cheap visual effect.
- **Cheap post-processing.** Bloom runs at quarter resolution. The HUD avoids `backdrop-filter`, which is expensive over a moving canvas.
- On an AMD Radeon integrated GPU at 1920×1080, every floor runs at roughly 85–135 fps.

## Brand

The master logos live in [`brand/`](brand/). `npm run brand` regenerates the web versions in `public/brand/` and the favicon. The header logo is inlined from `public/brand/pinnacle-logo-dark.svg` at build time. The lobby's floating 3D tetrahedron is built in code (`logoSculpture()` in `src/world/kit.js`).

## Project map

```
src/
  content.js            ← all copy & data
  main.js               boot (3D or classic)
  App.js                routing, floors, lift rides, case viewer, input
  core/                 Engine (renderer + post-fx), CameraRig, Scroll, Elevator, Sound
  world/
    Floor.js            base class: camera path + stops + interactives
    HeroTitle.js        3D "Pinnacle Studios" (dotless i's)
    Mascot.js           Pinn
    sculptures.js       the seven service sculptures
    kit.js, textures.js shared builders + procedural canvas textures
    floors/             Lobby, ServicesWing, WorkHall, StudioRotunda, Rooftop
  ui/                   templates (shared by 3D placards & 2D view), UI behaviour
  styles/main.css
scripts/build-font.mjs  converts the Fraunces font into 3D typeface JSON
```
