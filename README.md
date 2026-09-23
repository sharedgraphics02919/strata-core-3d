# Strata-Core 3D

A working, self-contained 3D model marketplace starter inspired by your supplied design. Includes a charcoal storefront, original lunar-rover hero art, accounts, vendor stores, private file uploads, moderation, demo orders, and downloadable sample models.

**This is a local development starter, not a live-payment marketplace.** No third-party accounts or paid services are needed to try it. Paid checkout is deliberately disabled in production. Do not open this starter to public registration until the launch work below is complete.

## Start here

Install **Node.js 24 LTS or newer**. There are no npm dependencies to install.

```sh
cp .env.example .env
npm start
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm start
```

Open **http://localhost:3000**. Use that exact origin (rather than `127.0.0.1`) because write requests are checked against `APP_ORIGIN`.

Alternatively, run `node --env-file-if-exists=.env server/index.mjs` directly if npm is unavailable. Without `.env`, the server still runs, but only free checkout is enabled.

## Try the complete flow

1. Sign up as a buyer. Search, filter, save models, and add a sample model to the cart.
2. Complete the clearly marked **demo order**. No payment details are requested and no money changes hands.
3. Open **My library** from the account menu and download the original OBJ model.
4. Create a second account as a vendor, or choose **For creators → Open my creator studio** from your buyer account.
5. Give the store a name and bio. Upload a supported 3D source file and an optional PNG, JPEG, or WebP preview. Set a price and submit for review.
6. Grant your own registered account admin access from the terminal:

   ```sh
   npm run admin -- your-email@example.com
   ```

7. Refresh the page and open **Administration** from the account menu, or visit `/admin`. Review the model and approve it. It will now appear in the catalog and vendor store.

There are **no default passwords** and no public admin-registration option. The seeded Strata Studio account cannot sign in. Test users are created only in isolated test databases.

## Included

| Area | Working features |
| --- | --- |
| Marketplace | Homepage, search, categories, file-format filters, free/rigged filters, sorting, product pages, responsive layouts |
| Accounts | Buyer/vendor signup, login/logout, hashed passwords, expiring server sessions, server-enforced roles |
| Buyer | Persistent cart and wishlist, free checkout, development-only demo checkout, purchase library, authorized downloads |
| Vendor | Buyer capabilities plus store name/bio, file upload, preview image, listing submission, archive, order history, demo activity totals |
| Admin | All listings, source-file downloads, approval/rejection, account overview, order counts |
| Samples | Eight original low-poly OBJ models, matching drag-to-rotate previews, keyboard rotation/zoom and wireframe mode |

Uploaded models use the vendor’s preview image. **Arbitrary uploaded files do not receive an interactive preview.** Interactive previews are implemented for the bundled sample geometry only. All listings currently have one source file and one optional preview. Formats requiring external textures/resources should be packaged into a self-contained file before upload; archive bundles are not yet supported.

## Architecture

This first version intentionally favors an easy-to-run, dependency-free codebase over the multi-service stack discussed in the planning notes:

- **Node.js HTTP server** for the API and frontend hosting.
- **SQLite** through Node’s built-in `node:sqlite` module for accounts, listings, carts, wishlists, and orders.
- **Private filesystem storage** outside the public directory for uploads and sample downloads.
- **Vanilla JavaScript + CSS** frontend with route navigation and a lightweight Canvas mesh viewer.
- **No external API keys**, CDN scripts, analytics, or runtime network dependencies.

```text
public/                  Frontend, styles, icons, original art
  app.js                 Routes, UI and API interactions
  viewer.js              Interactive sample mesh renderer
  geometry.js            Original mesh definitions and OBJ exporter
server/
  index.mjs              HTTP API, auth, authorization, uploads, downloads
  db.mjs                 SQLite connection and transaction helper
  schema.sql             Schema and indexes
  seed.mjs               Starter catalog and OBJ files
scripts/admin.mjs        Explicit administrator promotion
test/marketplace.test.mjs Integration and permission tests
data/                    Generated database and private files (gitignored)
```

Data survives server restarts. Back up the **entire data directory together**; it contains the database and the actual model files. Stop the server before making a simple filesystem backup, or use a SQLite-aware backup procedure. Future schema changes should be versioned migrations; the current schema initializes a fresh installation only.

## Upload to GitHub

Create an empty GitHub repository, then run these commands in this folder (replace the example remote URL):

```sh
git init
git add .
git commit -m "Initial Strata-Core 3D marketplace starter"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/strata-core-3d.git
git push -u origin main
```

`.gitignore` excludes accounts, database files, customer uploads, `.env`, and logs. The sample meshes regenerate automatically; only code and the site’s original artwork belong in the repository. No repository has been created or pushed on your behalf.

**GitHub Pages cannot run this backend.** Use a Node-capable server or a container with a persistent disk. This version is not a Vercel serverless deployment: local SQLite and uploaded files require durable storage.

## Configuration

| Variable | Purpose |
| --- | --- |
| `HOST` | Bind address. Default `127.0.0.1`; use `0.0.0.0` in a container behind a secured proxy. |
| `PORT` | HTTP port, default `3000`. |
| `APP_ORIGIN` | Exact browser origin, including protocol and port. Used for origin validation. |
| `DATA_DIR` | Durable directory for SQLite and model files. Default `./data`. |
| `DEMO_CHECKOUT` | Must explicitly be `true` to grant paid models without charging; ignored in production. |
| `NODE_ENV` | `production` enables Secure cookies and disables demo checkout even if requested. |

Use HTTPS in production. This server does not terminate TLS; place it behind an HTTPS reverse proxy. Never put `.env` or `data/` in a public static directory.

## Testing

```sh
npm test
```

Or `node --test test/*.test.mjs`. Tests use an isolated temporary database and upload directory. They cover signup, admin self-assignment prevention, sessions, role checks, CSRF/origin rejection, uploads, cross-vendor access, moderation, server-side pricing, cart deduplication, free/demo checkout, library/download ownership, archiving, and logout.

## Before a real public launch

- Connect a marketplace payment provider such as Stripe Connect. Create checkout sessions from server prices; grant paid entitlements **only after a verified, idempotent payment webhook**. Implement seller onboarding, refunds, disputes, fees, payouts, and tax decisions. A success-page redirect is not proof of payment.
- Add verified email, password recovery, abuse prevention, production session/rate-limit storage and security monitoring. The existing in-memory sign-in throttle is a starter safeguard, not complete abuse protection.
- Move large uploads to private object storage (e.g. R2/S3), use streaming/direct uploads, enforce transactional per-account quotas, scan for malware, and validate actual 3D formats. Current upload validation checks filename extensions, image signatures and size; it does not parse or scan model files. The API buffers up to 100 MB per upload and is suited to local testing only.
- Add cleanup for unattached uploads, multiple-file packages, listing edits/versioning, reliable previews for real uploads, pagination, reporting, and operational admin tooling. Current vendor management supports submission and archiving, not full listing editing.
- Add published terms, privacy/refund policies, a final reviewed license, copyright reporting and support processes. The displayed standard license is starter wording, not a completed legal package.
- Back up and monitor the database/files; test restoration. For multiple server instances, migrate to managed PostgreSQL and object storage or otherwise redesign persistence/concurrency.
- Complete accessibility, device, load, and deployment security testing before accepting real customers.

## Asset provenance

The hero artwork in `public/assets/lunar-rover.png` is original AI-generated concept art for Strata-Core 3D. It is not a representation of the low-poly downloadable rover. The eight sample meshes in `geometry.js` are original procedural geometry and offered under CC0. No TurboSquid models, images, branding, or source code are copied into this project. TurboSquid was used only as a marketplace reference.
