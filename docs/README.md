# ドキュメントとファイルの役割

ツール全体の概要と導入方法は[ルートのREADME](../README.md)を参照してください。ここでは各ファイルが何を担当しているかを説明します。

## ディレクトリ構成

```text
chatgpt/
├── README.md
├── .gitignore
├── package.json
├── package-lock.json
├── playwright.config.cjs
├── chatgpt-work-confirm/
│   ├── manifest.json
│   ├── content.js
│   └── README.md
├── scripts/
│   └── login.cjs
├── tests/
│   ├── unit.test.cjs
│   └── browser/
│       └── extension.spec.cjs
└── docs/
    ├── README.md
    ├── design.md
    └── test-results.md
```

## 拡張機能

### [manifest.json](../chatgpt-work-confirm/manifest.json)

ブラウザに拡張機能の名前・バージョン・実行対象を伝える定義ファイルです。Manifest V3を使い、`https://chatgpt.com/*` を開いたときに `content.js` を `document_start` で実行します。ストレージ権限やBackground Service Workerは定義していません。

### [content.js](../chatgpt-work-confirm/content.js)

送信確認の本体です。ページの `click`・`keydown`・`submit` をdocumentのキャプチャ段階で受け取り、操作元のフォーム内にWorkを示す属性があるか調べます。ページ全体を常時監視する方式ではなく、操作のたびに判定するため、フォームの差し替えにも対応します。

主な処理は次のとおりです。

| 処理 | 担当 |
|---|---|
| `handle()` | 送信ボタンまたは入力欄のEnterかを判断し、対象フォームを取得する。無効なボタン、修飾キー付きEnter、IME変換中のEnterなどを除外する |
| `isWork()` | 同一フォーム内の `work-home` または `Work モードで作成` という入力欄ラベルを使ってWorkを判定する |
| `decide()` | `window.confirm()` を表示し、OKなら原イベントを継続する。キャンセルや例外なら遮断する |
| `block()` | `preventDefault()` と `stopImmediatePropagation()` でイベントの既定動作と後続リスナーへの伝播を止める |
| `composing` | `WeakSet` で日本語IME変換中の入力欄を管理する。`isComposing` とキーコード229も併用する |
| `decisions` | `WeakMap` でフォームごとの直前の判断を一時保持し、同じ操作から同期的に発生するclick・submitで確認が重複しないようにする。タイマーで破棄する |

Chat・未知モードには介入しません。Work入力欄のEnterリピートは遮断します。セレクタを変更する場合は、ブラウザテストの模擬HTMLも実サイトの構造に合わせて見直してください。

### [拡張機能フォルダのREADME](../chatgpt-work-confirm/README.md)

ブラウザに読み込むフォルダ内にも、導入方法・更新方法・制限を置いています。開発手順と設計の詳細はルートREADMEおよびこのdocsから参照できます。

## テストと起動補助

### [unit.test.cjs](../tests/unit.test.cjs)

Node.js標準のテストランナーとVMを使い、DOM・イベント・確認ダイアログを模擬して `content.js` を実行します。確認の許可・キャンセル、Chat非介入、IMEや修飾キーの除外、重複確認防止、モード切替、ダイアログ例外時の遮断を11件で検査します。実ブラウザや実DOMのセレクタ一致は検査しません。

`npm.cmd test` で実行します。子プロセス起動に制限のある環境でも単体テストを実行できるよう、`--test-isolation=none` を指定しています。

### [extension.spec.cjs](../tests/browser/extension.spec.cjs)

Playwright同梱Chromiumを永続コンテキストで起動し、manifest経由で拡張機能を読み込みます。`chatgpt.com` へのアクセスをテスト用HTMLに差し替え、実サイトへ送信せずに次の5件を検査します。

- ボタン送信：キャンセル／OKの2件。
- Enter送信：キャンセル／OKの2件。
- Chatへの切替、Shift+Enter、再読み込みの1件。

確認が1回であること、送信件数、入力内容の保持などを確認します。HTMLには日本語の文字化けを防ぐため、レスポンスとmetaタグの両方でUTF-8を指定しています。

### [playwright.config.cjs](../playwright.config.cjs)

ブラウザテストの探索先を `tests/browser` に設定します。ワーカー数は1、テストのタイムアウトは30秒です。

### [login.cjs](../scripts/login.cjs)

`npm.cmd run browser:login` で、拡張機能入りの画面表示ありChromiumを開きます。専用プロファイルを `.profile/` に保存し、ChatGPTを開いてユーザーのログインを待ちます。メッセージの自動送信処理はありません。今回のGoogleログインでは利用できなかったため、通常のChrome／Edgeへの手動読み込みも用意しています。

## プロジェクト設定

| ファイル | 役割 |
|---|---|
| [package.json](../package.json) | Node.jsの必要バージョン、Playwright依存、`test`・`test:browser`・`browser:login` の実行コマンドを定義する |
| [package-lock.json](../package-lock.json) | npmが解決した依存パッケージのバージョン・整合性情報を記録する。依存更新時はnpmで更新する |
| [.gitignore](../.gitignore) | 依存パッケージ、キャッシュ、ログイン用プロファイル、テスト出力をGit管理から除外する |
| [ルートREADME](../README.md) | ツールの概要、導入、使い方、制限、開発コマンドの入口 |

## 設計と記録

| ファイル | 役割 |
|---|---|
| [design.md](design.md) | 元の `設計書.md`。目的、機能要件、DOM判定、イベント制御、テスト計画、完了条件を記載した実装前の設計書 |
| [test-results.md](test-results.md) | テスト結果、ユーザーによる動作確認、環境上の制限、未確認項目を記録する |
| [docs/README.md](README.md) | このファイル。各ファイルの担当と、読む順序を案内する |

## 自動生成されるもの

`node_modules/` は依存パッケージ、`.npm-cache/` は作業時に指定したnpmキャッシュ、`.profile/` はログイン起動用の専用プロファイルです。`test-results/` と `playwright-report/` はテスト出力です。`.browsers/` はブラウザの保存先として使う場合に備えて除外されていますが、現在の起動スクリプトはPlaywright既定のキャッシュを使います。これらはソースファイルではありません。

一時的なエラーログ（例：`Untitled-2.txt`）は障害調査の資料で、拡張機能の実行には不要です。
