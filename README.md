## RSS Reader

`feeds.yaml` に定義した RSS / Atom フィードを読み込み、1つのタイムラインとして表示する Next.js アプリです。

## 機能

- **キーワードハイライト**: 設定したキーワードに一致した記事を強調表示
- **キーワードフィルタリング**: 設定したキーワードに一致した記事を一覧から除外
- **フィード絞り込み**: UIまたは `?feed=<id>` クエリパラメータで特定フィードのみ表示
- **既読 / 未読管理**: 既読状態をブラウザの localStorage に保存
- **まとめて既読**: 表示中の未読記事を一括で既読にマーク
- **ブックマーク**: 記事をローカルにブックマーク保存（localStorage）
- **エントリー永続化**: 取得した RSS / Atom の記事をサーバー側の Postgres（ORM 管理）に保存
- **フィードキャッシュ**: 取得失敗時の代替表示として直前の一覧を保持

## Development

開発サーバーの起動:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと確認できます。

本番ビルドの起動:

```bash
npm run build
npm run start
```

## Feed Configuration

設定はルートの `feeds.yaml` で管理します。

```yaml
defaultLimit: 20
highlightKeywords:
  - release
filterKeywords:
  - podcast

feeds:
  - id: nextjs
    title: Next.js Blog
    url: https://nextjs.org/feed.xml
    siteUrl: https://nextjs.org/blog
    highlightKeywords:
      - cache
    filterKeywords:
      - conference

  - id: react
    title: React Blog
    url: https://react.dev/rss.xml
    siteUrl: https://react.dev/blog
    limit: 10
```

ルール:

- `defaultLimit`: `limit` 未指定時のデフォルト取得件数（1〜20 に正規化、省略時は 6）
- `highlightKeywords`: 一致した記事を強調表示
- `filterKeywords`: 一致した記事を一覧から除外
- `feeds[].limit`: フィードごとの取得件数上限（1〜20 に正規化）
- `feeds[].siteUrl`: フィード一覧ページなどの参照URL（省略可）
- トップレベルのキーワードは全フィード共通
- 各フィードのキーワードはそのフィードにだけ追加適用

## Docker (利用者向け / GHCR イメージ)

`main` ブランチへのプッシュで `ghcr.io/ismt7/amber:latest` が自動ビルド・公開されます。
コンテナ利用者向けの起動方法として、`docker run` と `docker compose` を案内します。
開発用 compose では同梱の Postgres に接続します。

### docker run

```bash
docker run -d \
  --name amber \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://amber:amber@host.docker.internal:5432/amber \
  -v "$(pwd)/feeds.yaml:/app/feeds.yaml:ro" \
  ghcr.io/ismt7/amber:latest
```

| オプション | 説明 |
|---|---|
| `-p 3000:3000` | ホストの 3000 番ポートにマッピング |
| `-v .../feeds.yaml:/app/feeds.yaml:ro` | ホストの `feeds.yaml` をコンテナに読み込み専用でマウント |
| `-e DATABASE_URL=...` | 接続先 Postgres の URL |

起動後、[http://localhost:3000](http://localhost:3000) を開くと確認できます。

### docker compose

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
      DATABASE_URL: postgres://amber:amber@postgres:5432/amber
    volumes:
      - ../..:/app
      - ../../feeds.yaml:/app/feeds.yaml:ro
    command: npm run dev
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: amber
      POSTGRES_USER: amber
      POSTGRES_PASSWORD: amber
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db-data:
```

```bash
docker compose -f infra/docker/compose.yml up --build
docker compose -f infra/docker/compose.yml down
```

Postgres は compose 内で起動します。

開発者向けの Docker compose / bind mount の手順は [`docs/development/docker.md`](docs/development/docker.md) にまとめています。

## Verification

```bash
npm run lint
npm run build
```

## Notes

- RSS / Atom の取得はサーバー側で行います。
- トップページは動的レンダリングです（常に最新の記事を取得します）。
- 既読状態・ブックマークはブラウザの localStorage に保存されます。設定ダイアログから個別または一括で削除できます。
- 取得した RSS / Atom エントリーはサーバー側の Postgres（ORM 管理）に永続化されます。
