# Repository Environment Exception

This repository currently uses a documented exception to the Mira Organization environment model during and immediately after ownership migration.

## Current reality

- `main` is the current publishing source for the documentation website.
- GitHub Pages deploys automatically from `main` through `.github/workflows/deploy-pages.yml`.
- Cloudflare Pages production deployment is an explicit `workflow_dispatch` through `.github/workflows/deploy-cloudflare-pages.yml`.
- The existing `dev` branch is historical/stale relative to `main` and is not treated as the development environment.
- Dedicated `test` and `prod` branches are not currently part of this repository's real deployment chain.

## Exception to the organization model

The standard `feat/* -> dev -> test -> prod` promotion chain is not introduced as part of the repository ownership migration, because doing so would change the site's established release topology rather than merely migrate ownership.

Omitted stages for now: `dev`, `test`, and `prod` as deployment branches.

Replacement checks:

1. Feature/change work is validated by pull-request CI before merge.
2. Merge to `main` triggers the existing GitHub Pages build/deploy path.
3. Cloudflare Pages production publication remains an explicit CI/CD action from the validated `main` source.
4. Production acceptance requires live smoke verification after deployment.

## Production protection

`main` is retained as the current production source only under this documented repository-specific exception. Migrating the site to the full organization branch model is a separate governance change and must not be bundled into repository ownership migration.

Historical branches are retained and are not reclassified merely to satisfy naming conventions.
