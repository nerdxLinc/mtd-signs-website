# MTD Signs & Graphics — Website

React + TypeScript + Tailwind CSS + Framer Motion build of the approved
homepage mockup, following `MTD_Master_Creative_Bible_For_Replit.pdf`.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. For production output:

```bash
npm run build
npm run preview
```

## Opening in Replit

1. Create a new Repl → **Import from a folder / zip** (or "Node.js" template
   and drag these files in).
2. Replit will detect `package.json` and run `npm install` automatically.
   If it doesn't, run `npm install` in the Shell tab yourself.
3. Run `npm run dev -- --host 0.0.0.0` if Replit's preview pane doesn't
   pick up the default Vite host binding (the included `vite.config.ts`
   already binds to `0.0.0.0`, so this is usually automatic).

**Note:** this project was built in a sandboxed environment with no
network access, so `npm install` has not actually been run or verified
end-to-end here. The code is written cleanly against stable, well-known
APIs for React 18 / Tailwind 3 / Framer Motion 11, but give it a first
run and flag anything that doesn't compile — happy to fix immediately.

## What's implemented

- **Hero** — unchanged composition per the creative bible: full-bleed
  truck photography (cropped from the approved mockup), headline, two
  CTAs, section-index rail.
- **Founder statement** — "Since 1994" / Barry Branscum quote, oversized
  faint year mark, b&w shop photo.
- **Recent Work** — asymmetric editorial mosaic (per "Portfolio Rules:
  avoid equal cards"). Currently seeded with the real project photos you
  sent over: Big Rock Junk Removal, Felland Bros. Construction, Hurtado
  Roofing Pro, Brown Bear Carpet Cleaning, Conway Marble & Granite,
  Carlson Gracie Vilonia, Conway PD Cats unit, and Dr. Kemper DDS.
- **Pull quote / "Impact"** — oversized watermark word, orange accent.
- **Before / After** — split-image comparison with a coded center arrow
  (not baked into the image) and the "Same truck. Different business."
  caption.
- **How We Work** — Listen / Design / Build / Install, numbered since
  it's a real sequential process.
- **Problem-solving story section** — three-photo detail strip.
- **Contact** — info block + working client-side form (no backend wired
  up yet — see the comment in `src/components/Contact.tsx`).

## Known gaps / things to swap before launch

- The contact form only sets local state on submit. Wire it to a real
  endpoint (Formspree, an API route, etc.) before launch.
- `src/assets/work-chiropractic.jpg` was provided but isn't used in the
  current 8-tile Recent Work grid — swap it in if you'd rather feature it
  over one of the current eight.
- Two duplicate Taco Local photos you sent
  (`509354716..._-_Copy.jpg`, `508107568..._-_Copy.jpg`) were left out —
  they're exact copies of files already reviewed elsewhere in the
  portfolio pass, not new content.
- The H&H Lawn Care logo you sent is a flat logo comp with no install
  photo, so per the same "judge design, not photography — but an install
  photo is still needed for the portfolio" logic used throughout this
  project, it wasn't added to Recent Work. Happy to add it if you get a
  photographed install.
- All photography should be treated as a first pass — the creative bible
  calls for real, unfiltered project photography throughout, and some of
  these images are cropped from the approved mockup rather than
  full-resolution originals (specifically the hero, founder-shop, and
  the three problem-solving detail shots).
