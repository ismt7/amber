# Docker Development Guide (開発者向け)

`infra/docker/compose.yml` 自体が開発環境です。`feeds.yaml` をマウントし、同じ compose ファイル内の Postgres に接続します。

## Compose

```yaml
services:
  app:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile
      target: dev
    container_name: amber
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
      DATABASE_URL: postgres://amber:amber@postgres:5432/amber
    volumes:
      - ../..:/app
      - ../../feeds.yaml:/app/feeds.yaml:ro
    command: npm run dev

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: amber
      POSTGRES_USER: amber
      POSTGRES_PASSWORD: amber
    ports:
      - "5432:5432"
    volumes:
      - amber-postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  amber-postgres-data:
```

## Commands

```bash
docker compose -f infra/docker/compose.yml up --build
docker compose -f infra/docker/compose.yml down
docker compose -f infra/docker/compose.yml restart
```

## Notes

- `feeds.yaml` は実行時に必要なので、必ずマウントします。
- `node_modules` はホスト側のものを使う前提です。
- Postgres は compose 内で立ち上がり、アプリは `postgres:5432` に接続します。
- development は bind mount を使うので、コード変更をすぐ反映できます。
