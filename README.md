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

`DATABASE_URL` または `POSTGRES_HOST` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`（`POSTGRES_PORT` は省略時 `5432`）が未設定でも画面表示はできますが、Postgres を使う以下の機能は無効になります。

- RSS / Atom エントリーのサーバー側永続化
- 内部API経由の定期フィード同期

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
利用者向けの最短起動は `docker run` です。

### 最短起動手順（ユーザー向け）

1. `feeds.yaml` を用意する（ホスト側）。
2. アプリ用ネットワークを作成する。
3. Postgres コンテナを起動する。
4. 以下の `docker run` でアプリを起動する。

```bash
docker network create amber-net

docker run -d \
  --name amber-postgres \
  --network amber-net \
  -e POSTGRES_DB=amber \
  -e POSTGRES_USER=amber \
  -e POSTGRES_PASSWORD=amber \
  -v amber-postgres-data:/var/lib/postgresql/data \
  postgres:16
```

### docker run

```bash
docker run -d \
  --name amber \
  --network amber-net \
  -p 3000:3000 \
  -e POSTGRES_HOST=amber-postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=amber \
  -e POSTGRES_USER=amber \
  -e POSTGRES_PASSWORD=amber \
  -v "$(pwd)/feeds.yaml:/app/feeds.yaml:ro" \
  ghcr.io/ismt7/amber:latest
```

| オプション | 説明 |
|---|---|
| `--network amber-net` | アプリと Postgres を同一ネットワークに参加させる |
| `-p 3000:3000` | ホストの 3000 番ポートにマッピング |
| `-v .../feeds.yaml:/app/feeds.yaml:ro` | ホストの `feeds.yaml` をコンテナに読み込み専用でマウント |
| `-e POSTGRES_HOST=...` ほか | 接続先 Postgres のホスト・ポート・DB名・ユーザー・パスワード |

起動確認:

```bash
docker logs -f amber
```

[http://localhost:3000](http://localhost:3000) を開くと確認できます。

### 自動バッチ（既定で有効）

コンテナ起動時に、内部スケジューラが自動で定期取得を開始します。

- 既定: `IN_APP_FEED_SYNC_ENABLED=true`
- 既定: `FEED_SYNC_INTERVAL_SECONDS=1800`（30分ごと）

必要に応じて `docker run` に環境変数を追加してください。

```bash
docker run -d \
  --name amber \
  --network amber-net \
  -p 3000:3000 \
  -e POSTGRES_HOST=amber-postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=amber \
  -e POSTGRES_USER=amber \
  -e POSTGRES_PASSWORD=amber \
  -e IN_APP_FEED_SYNC_ENABLED=true \
  -e FEED_SYNC_INTERVAL_SECONDS=900 \
  -v "$(pwd)/feeds.yaml:/app/feeds.yaml:ro" \
  ghcr.io/ismt7/amber:latest
```

停止/再起動:

```bash
docker stop amber
docker start amber

docker stop amber-postgres
docker start amber-postgres
```

### docker compose

利用者向けの `compose.yaml` 記載例です（本番ランナー用イメージを利用）。

`compose.yaml` として保存してください。

```yaml
services:
  app:
    image: ghcr.io/ismt7/amber:latest
    container_name: amber
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      POSTGRES_HOST: db
      POSTGRES_PORT: "5432"
      POSTGRES_DB: amber
      POSTGRES_USER: amber
      POSTGRES_PASSWORD: amber
      IN_APP_FEED_SYNC_ENABLED: "true"
      FEED_SYNC_INTERVAL_SECONDS: "1800"
    volumes:
      - ./feeds.yaml:/app/feeds.yaml:ro

  db:
    image: docker.io/library/postgres:16
    container_name: amber-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: amber
      POSTGRES_USER: amber
      POSTGRES_PASSWORD: amber
    volumes:
      - postgresql:/var/lib/postgresql/data

volumes:
  postgresql:
```

```bash
docker compose up -d
docker compose logs -f app
docker compose down
```

この例では Postgres も compose 内で同時起動します。

このリポジトリに含まれる `infra/docker/compose.yml` は開発用途です。

開発者向けの Docker compose / bind mount の手順は [`docs/development/docker.md`](docs/development/docker.md) にまとめています。

## Scheduled Feed Sync

簡易運用では、コンテナ起動時に Webアプリ内スケジューラが自動で有効になります。

- 既定: `IN_APP_FEED_SYNC_ENABLED=true`
- 既定: `FEED_SYNC_INTERVAL_SECONDS=1800`（30分ごと）

Nodeプロセス起動中はアプリ内で定期実行されます。

無効化したい場合:

- `IN_APP_FEED_SYNC_ENABLED=false`

間隔を変えたい場合:

- `FEED_SYNC_INTERVAL_SECONDS=<seconds>`

必須環境変数:

- `BATCH_FETCH_TOKEN`（手動トリガーAPI利用時のトークン）

手動実行用の内部APIも利用できます。

- エンドポイント: `POST /api/internal/feed-sync`
- 認証: `Authorization: Bearer ${BATCH_FETCH_TOKEN}`
- 同時実行: Postgres advisory lock で重複実行を防止（実行中は `409`）
- 画面上の「バッチ実行」ボタンからも同じ同期ジョブを手動実行可能

手動実行例:

```bash
curl --fail --show-error --silent \
  --request POST \
  --header "Authorization: Bearer ${BATCH_FETCH_TOKEN}" \
  http://localhost:3000/api/internal/feed-sync
```

外部cronで運用したい場合は、上記 API を30分間隔で呼び出してください。

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
