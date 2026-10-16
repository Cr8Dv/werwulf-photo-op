# WERWULF AI Photo Op — prototype
Phone-first web app: Landing → Upload / Take a Photo → Preview → Generating → Result (Download JPG / Share / Try Again) → Tickets CTA.
Final 1080×1350 JPG is composited in-browser (canvas) with title treatment, Werwulf font tagline, grain frame.

## Run
    npm install && npm start      # http://localhost:3000
No key set → DEMO mode (returns a sample portrait after ~6s).

## Live AI (server-side keys only)
- `OPENAI_API_KEY` → OpenAI gpt-image-1 `images/edits` (default; uploaded photo + reference still, input_fidelity=high)
- or `REPLICATE_API_TOKEN` (FLUX Kontext Pro) / `FAL_KEY` (FLUX Kontext Max multi-image)
- `AI_PROVIDER=openai|replicate|fal|demo` forces a provider. Optional: `RATE_LIMIT` (per IP / 15 min, default 8), `OPENAI_IMAGE_QUALITY`.

## Deploy
Vercel: `npx vercel` (vercel.json routes /api/* to the Express app), add OPENAI_API_KEY in Project → Settings → Environment Variables, redeploy.
Netlify: see netlify.toml (needs `serverless-http` function wrapper; note Netlify's 10–26s function limit can be tight for gpt-image-1 — Vercel or Render recommended).
