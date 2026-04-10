## Amber RSS Reader

`feeds.yaml` に定義した RSS / Atom フィードを読み込み、1つのタイムラインとして表示する Next.js アプリです。

## 機能

- **キーワードハイライト**: 設定したキーワードに一致した記事を強調表示
- **キーワードフィルタリング**: 設定したキーワードに一致した記事を一覧から除外
- **フィード絞り込み**: UIまたは `?feed=<id>` クエリパラメータで特定フィードのみ表示
- **既読 / 未読管理**: 既読状態をブラウザの localStorage に保存
- **まとめて既読**: 表示中の未読記事を一括で既読にマーク
- **ブックマーク**: 記事をローカルにブックマーク保存（localStorage）
- **フィードキャッシュ**: 取得失敗時の代替表示として直前の一覧を localStorage に保持

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

## Verification

```bash
npm run lint
npm run build
```

## Notes

- RSS / Atom の取得はサーバー側で行います。
- トップページは動的レンダリングです（常に最新の記事を取得します）。
- 既読状態・ブックマーク・フィードキャッシュはブラウザの localStorage に保存されます。設定ダイアログから個別または一括で削除できます。
