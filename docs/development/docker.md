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
      POSTGRES_HOST: postgres
      POSTGRES_PORT: "5432"
      POSTGRES_DB: amber
      POSTGRES_USER: amber
      POSTGRES_PASSWORD: amber
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
- Postgres は compose 内で立ち上がり、アプリは `POSTGRES_HOST=postgres` などの個別環境変数で接続します。
- development は bind mount を使うので、コード変更をすぐ反映できます。

## Scheduled Feed Sync (external trigger)

定期取得は `app` コンテナ内スケジューラで簡易運用できます。

- 既定で `IN_APP_FEED_SYNC_ENABLED=true`
- 既定で `FEED_SYNC_INTERVAL_SECONDS=1800`（秒）

コンテナ起動時に自動で定期取得が開始されます。

補助として手動トリガーAPIも利用できます。

- 必須環境変数: `BATCH_FETCH_TOKEN`（手動トリガーAPI用）
- 同時実行時は重複防止のため `409` が返ります。

手動疎通:

```bash
curl --fail --show-error --silent \
  --request POST \
  --header "Authorization: Bearer ${BATCH_FETCH_TOKEN}" \
  http://localhost:3000/api/internal/feed-sync
```
