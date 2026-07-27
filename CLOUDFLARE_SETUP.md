# MTD Cloudflare setup

The public site uses Cloudflare Pages. The private portfolio manager uses Cloudflare Access, D1, R2, and Pages Functions.

1. Create a Cloudflare R2 bucket for portfolio images. Copy its exact bucket name into the `PORTFOLIO_BUCKET` binding in Pages.
2. Create a Cloudflare D1 database. Copy its exact name and database ID into `wrangler.example.toml` after renaming it to `wrangler.toml`, or add the same `DB` binding in the Pages dashboard.
3. Apply all migrations, in order. The first creates the portfolio records; the second adds the browser-side ZIP import batches, source-record logs, duplicate reviews, and progress counters; the third adds automatic project-family metadata.

   ```bash
   npx wrangler d1 execute YOUR_D1_DATABASE_NAME --remote --file=migrations/0001_portfolio_admin.sql
   npx wrangler d1 execute YOUR_D1_DATABASE_NAME --remote --file=migrations/0002_browser_zip_imports.sql
   npx wrangler d1 execute YOUR_D1_DATABASE_NAME --remote --file=migrations/0003_project_families.sql
   ```
4. Deploy the site as a Cloudflare Pages project using `npm run build` and `dist` as the build output. The included `_redirects` file keeps direct public routes working.
5. Add the two bindings to Pages Functions exactly as named: `DB` for D1 and `PORTFOLIO_BUCKET` for R2. Do not use placeholder values in a deployment.
6. In Cloudflare Zero Trust, create a Cloudflare Access application for `https://YOUR-DOMAIN/admin*` and a second one for `https://YOUR-DOMAIN/api/admin/*`. Add only the people or email domains that should manage MTD's portfolio.
7. Ensure Access forwards `Cf-Access-Authenticated-User-Email`. The middleware and every admin API endpoint reject requests without it; hiding the admin link alone is never used as protection.
8. Visit `/admin` after Access login. Upload image files or the Claude ZIP packages. ZIP images are suggested a category, imported as hidden Archive records, checked for exact and possible duplicates, and then reviewed before they are visible publicly.

## Browser ZIP importer

- The ZIP is opened locally in the administrator's browser. It is never sent to Pages Functions or R2 as one archive.
- The browser reads the ZIP directory, skips non-image entries for the public site, and sends a single image at a time to `/api/admin/import-image`.
- CSV, Markdown, and text records are retained only as private D1 import records; they never become public portfolio files.
- There is no whole-ZIP size cap. The per-image safety limit is 25 MB. A normal 250 MB package is supported because only one extracted image is held and transferred at a time.
- ZIP64 archives are not yet supported. Re-save a ZIP64 package as a normal ZIP before importing it.
- The upload queue processes one package at a time and supports pause-after-current-image, cancel, retry failed images, and resuming the next queued package. Duplicate decisions are retained in D1.
- The retired `/api/admin/import` endpoint deliberately returns `410 Gone`; it cannot accept a ZIP upload.

## Ongoing use

- Homepage cards use the selected category cover. If no cover is selected, the highest-ranked visible Featured image is used.
- Featured and More Work remain separate within each category.
- The original uploaded ZIPs, mapping logs, and reports are not published. ZIP image files go to R2; selected CSV/Markdown notes are retained only as private import records.
- New testimonials are inactive by default. Activate and order them in `/admin` when approved; only active testimonials show above **THE MTD DIFFERENCE**.
- Image filenames automatically create project families. For example, `Taco Local`, `Taco-Local`, and `taco_local` normalize to the same family. The public gallery shows **See more from this project** only when at least two visible images share that family. If a filename needs correction, update its **Project** value in `/admin`; the original R2 object is not changed.
