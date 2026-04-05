# EmDash + ROI Insights / Analytics plugin — install troubleshooting (for maintainers & end users)

This note captures **real issues** hit while wiring [MosierData/emdash-plugin-analytics](https://github.com/MosierData/emdash-plugin-analytics) into an Astro + EmDash site. Use it when supporting installs from GitHub, npm (once published), or CI (e.g. Cloudflare).

---

## 1. Installing from GitHub: no built `dist/` in the repo

**Symptom:** After `npm install github:MosierData/emdash-plugin-analytics`, imports like `@mosierdata/emdash-plugin-analytics/descriptor` fail, or Node reports missing files under `dist/`.

**Cause:** The plugin's `.gitignore` excludes `dist/`. Published source on `main` does **not** include compiled output, but `package.json` `"exports"` point at `./dist/*.mjs`.

**What works for end users today:**

| Approach | Notes |
|----------|--------|
| **Publish to npm** with a `prepublishOnly` / CI step that runs `npm run build` so the tarball contains `dist/` | Preferred long-term. |
| **Commit `dist/`** to a release branch or tag (or stop gitignoring `dist` for tagged releases) | Simple for "install from GitHub" without a build step. |
| **Vendor** the built package (`file:./packages/...`) | What many internal sites do until npm ships artifacts. |
| **Clone + build + `npm pack` / `file:`** | Advanced users only; document the exact commands. |

**Do not assume** `npm install github:…` gives a runnable plugin without one of the above.

---

## 2. `npm install` fails: `ERESOLVE` / React peer dependency

**Symptom:**

```text
peer react@"^18.0.0" from @mosierdata/emdash-plugin-analytics
Could not resolve dependency:
Found: react@19.x.x
```

**Cause:** The plugin declares `peerDependencies.react: ^18.0.0` while EmDash's admin stack (via `emdash` / `@emdash-cms/admin`) may pull **React 19**.

**Mitigations:**

- **Consumer app:** install with `npm install --legacy-peer-deps`, or add an `.npmrc` with `legacy-peer-deps=true` for that project.
- **Plugin maintainers:** widen peers to `"react": "^18.0.0 || ^19.0.0"` (and same for `react-dom`) so strict installs succeed without flags.

---

## 3. `patch-package` runs inside the **plugin** package and errors on `emdash`

**Symptom (during `npm install`):**

```text
patch-package … Error: Patch file found for package emdash which is not present at node_modules/emdash
```

**Cause:** The plugin's own `package.json` has `"postinstall": "patch-package"`. When npm installs the dependency, that script runs with the **plugin folder** as cwd. `emdash` is hoisted to the **project** `node_modules`, not `node_modules/@mosierdata/emdash-plugin-analytics/node_modules/emdash`, so the patch cannot find its target.

**Fix pattern:**

- **Hosting app** applies the EmDash patch once at the repo root: `patches/emdash+0.1.0.patch`, root `"postinstall": "patch-package"`, `patch-package` as a **dependency** of the app (not only devDependency if CI uses production installs).
- **Plugin package:** remove `postinstall` / `patch-package` from the **published** consumer install path; keep the patch file in the repo **as documentation** ("apply this in your site") or rely on a future EmDash release that includes the same behavior.

---

## 4. Why the EmDash patch exists at all (tracking / KV)

**Symptom (runtime):** Errors mentioning `getRaw`, `commitIfValueUnchanged`, or "KV must implement getRaw/commitIfValueUnchanged for atomic tracking saves".

**Cause:** The analytics plugin uses compare-and-swap style writes for tracking settings. Stock `emdash@0.1.0` may not expose those KV helpers until patched.

**End-user expectation:** Document clearly: *"Sites using ROI Insights with EmDash 0.1.x must apply the provided `emdash+0.1.0.patch` via patch-package until EmDash ships an equivalent."*

---

## 5. Production build: `usePluginAPI` is not exported from `@emdash-cms/admin@0.1.0`

**Symptom (Vite/Rollup during `astro build`):**

```text
"usePluginAPI" is not exported by "node_modules/@emdash-cms/admin/dist/index.js",
imported by "…/emdash-plugin-analytics/dist/admin.mjs"
```

**Cause:** Plugin admin UI was written against a hook that is **not** in the npm-shipped admin `0.1.0` entry.

**Mitigations:**

- **Ship a small shim** next to the built admin bundle that implements `usePluginAPI` with `API_BASE`, `apiFetch`, and `parseApiResponse` from `@emdash-cms/admin`, calling `/_emdash/api/plugins/roi-insights/<path>` (GET/POST). The site's vendored build used `dist/use-plugin-api.mjs` plus an import change in `admin.mjs`.
- **Or** wait for / depend on a newer `@emdash-cms/admin` that exports `usePluginAPI` and rebuild the plugin.

---

## 6. Root `.gitignore` and `dist/`

**Symptom:** Vendored plugin `packages/.../dist` never gets committed; CI/build breaks.

**Cause:** A root `.gitignore` entry `dist` ignores **every** `dist` directory in the tree.

**Fix:** Scope ignores to the app output only, e.g. `/dist` (repo root), not bare `dist`.

---

## 7. Astro: register the plugin descriptor

**Symptom:** Plugin never appears in the admin menu.

**Fix:** In both dev and prod Astro configs, import the descriptor and pass it into `emdash()`:

```js
import { roiInsightsPlugin } from "@mosierdata/emdash-plugin-analytics/descriptor";

emdash({
  // database, storage…
  plugins: [roiInsightsPlugin()],
});
```

Restart the dev server after changing config.

---

## 8. `package.json` exports: `/sandbox` and Cloudflare worker

**Symptom:** Worker or sandbox bridge fails to resolve `@mosierdata/emdash-plugin-analytics/sandbox`.

**Cause:** Upstream `package.json` on GitHub may omit the `./sandbox` export even if `tsdown` emits `sandbox-entry.mjs`.

**Fix:** Ensure `exports["./sandbox"]` points at the built sandbox entry (e.g. `./dist/sandbox-entry.mjs`) in the **published** artifact.

---

## 9. CI (e.g. Cloudflare): `npm ci` and lifecycle scripts

- Root `postinstall` → `patch-package` is normal; ensure `patches/` is committed.
- If the **plugin** still runs its own failing `postinstall`, clean installs on CI will fail (see §3).
- Using `npm install --omit=dev` without moving `patch-package` to `dependencies` can skip patches — prefer keeping `patch-package` in `dependencies` if you need patches on minimal production installs.

---

## Quick checklist for a "clean" site + ROI Insights

1. [ ] EmDash + Astro configured (dev SQLite / prod D1+R2 as needed).
2. [ ] Plugin install method chosen: **npm tarball with `dist/`**, or **vendored build**, not raw GitHub source-only.
3. [ ] React peer conflict resolved (`legacy-peer-deps` or updated plugin peers).
4. [ ] Root `patch-package` + `patches/emdash+0.1.0.patch` if still on EmDash 0.1.x without upstream KV APIs.
5. [ ] Admin bundle compatible with `@emdash-cms/admin@0.1.0` (shim or updated admin).
6. [ ] `plugins: [roiInsightsPlugin()]` in both `astro.config.mjs` and `astro.config.prod.mjs`.
7. [ ] `.gitignore` uses `/dist` if vendoring `packages/.../dist`.

---

## Suggested upstream improvements (plugin repo)

1. Publish to npm with built `dist/` in the package.
2. Remove dependency `postinstall` patch-package; document app-level patching for EmDash 0.1.x.
3. Widen `peerDependencies` for React 19.
4. Commit or CI-publish `dist/`, or add a `prepare` script that builds on install (slower but works from git — document the cost).
5. Add `exports["./sandbox"]` if the worker needs it.
6. Align admin imports with released `@emdash-cms/admin` or document the shim.

This file should be updated whenever install steps or upstream packages change.
