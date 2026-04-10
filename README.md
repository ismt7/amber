## Amber RSS Reader

`feeds.yaml` に定義した RSS / Atom フィードを読み込み、1つのタイムラインとして表示する Next.js アプリです。

## Development

開発サーバーの起動:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと確認できます。

## Feed Configuration

設定はルートの `feeds.yaml` で管理します。

```yaml
defaultLimit: 10
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
```

ルール:

- `defaultLimit`: `limit` 未指定時のデフォルト件数
- `highlightKeywords`: 一致した記事を強調表示
- `filterKeywords`: 一致した記事を一覧から除外
- トップレベルのキーワードは全フィード共通
- 各フィードのキーワードはそのフィードにだけ追加適用

## Verification

```bash
npm run lint
npm run build
```

## Notes

- RSS / Atom の取得はサーバー側で行います。
- トップページは動的レンダリングです。
