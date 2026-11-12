# Docker and GitHub Actions deployment

The application runs Next.js and Socket.IO together on port `3000`, so deploy
exactly one container replica unless multiplayer state is moved out of memory.

## Run the image locally

```bash
docker build -t kien-an-school-simulator .
docker run --rm -p 3000:3000 --env-file .env kien-an-school-simulator
```

Open `http://localhost:3000`. The container expects the same variables listed
in `.env.example`; normally copy it to `.env` and adjust values as needed.

## GitHub Container Registry

Pushing to `main` builds and publishes this image:

```text
ghcr.io/<github-owner>/<repository>:latest
```

If the package is private, create a GitHub classic personal access token with
`read:packages` for the server. Keep this token outside the repository.

## Optional one-click server deployment

The `deploy` job only runs when **Run workflow** is used with **deploy**
checked. Configure these repository secrets first:

| Secret | Purpose |
| --- | --- |
| `SERVER_HOST` | Server address or IP |
| `SERVER_USER` | SSH account allowed to run Docker |
| `SERVER_SSH_PRIVATE_KEY` | Matching SSH private key |
| `GHCR_USERNAME` | GitHub user or service account for GHCR |
| `GHCR_TOKEN` | Token with `read:packages` |
| `SERVER_APP_DIR` | Optional server directory; defaults to `/opt/kien-an-school-simulator` |
| `SERVER_PORT` | Optional public port; defaults to `3000` |

Before the first deployment, create the server environment file at
`<SERVER_APP_DIR>/.env` using `.env.example`. Do not commit this file.
