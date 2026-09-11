# Repository Environment Model

This repository follows the Mira Organization branch model.

```text
feat/* → dev → test → prod
```

## Branch semantics

- `feat/*`: change branches; CI only.
- `dev`: development integration and preview source.
- `test`: acceptance/staging source.
- `prod`: production source.
- `main`: retained for historical compatibility; it must not bypass `prod` for deployment.

## Deployment semantics

- Pull requests into `dev`, `test`, and `prod` run Docs validation.
- Pushes to `dev` and `test` run Docs validation; the accepted `test → prod` candidate is validated before merge rather than rebuilt by the validation workflow after promotion.
- A push to `prod` triggers `.github/workflows/deploy-cloudflare-pages.yml` as the authoritative Cloudflare production publisher. It builds the root-path production site once, reuses that artifact for Wrangler Direct Upload and Baidu URL submission, and deploys to Cloudflare Pages project `uichat-mira-docs` with branch `prod`.
- The same production workflow keeps `workflow_dispatch` as a controlled re-publication path. Its production jobs are guarded to `prod`.
- GitHub Pages production publication is triggered only by `prod` through `.github/workflows/deploy-pages.yml`. It intentionally performs its own `build:github-pages` because the GitHub Pages base-path contract differs from the Cloudflare root-path build.
- Cloudflare Pages must keep its Production branch configured as `prod`.
- Cloudflare Git Integration is not a deployment source of truth. If the historical Git connection remains visible in Cloudflare, it must not act as a second automatic publisher.
- `dev`, `test`, and feature branches do not automatically publish to Cloudflare Pages from this repository.

## External resource rule

The Cloudflare Pages project name `uichat-mira-docs`, custom domain, DNS, and other external resource identities remain unchanged. Branch alignment changes promotion semantics, not resource names.
