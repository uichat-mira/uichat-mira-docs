# Repository Environment Model

This repository follows the Mira Organization migration branch model.

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

- Pull requests into `dev`, `test`, and `prod` run validation.
- GitHub Pages production publication is triggered only by `prod`.
- Baidu production URL submission is triggered only by `prod`.
- Cloudflare Pages remains Git Integration driven. Its production branch must be `prod`; `dev`, `test`, and feature branches are preview branches.
- The manual Wrangler workflow is fallback-only and must not become a second automatic deployment path.

## Migration rule

The Cloudflare Pages project name `uichat-mira-docs` and other external resource identities remain unchanged. Branch alignment changes promotion semantics, not resource names.
