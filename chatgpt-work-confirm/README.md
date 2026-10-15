# ChatGPT Work 送信確認

Workモードの送信ボタン・Enter送信前に標準の確認ダイアログを出すManifest V3拡張機能です。キャンセルはイベントを遮断し、OKは元のイベントを継続します。外部通信、メッセージ保存、設定画面はありません。

ツール全体の説明は[ルートREADME](../README.md)、ファイルごとの役割は[ドキュメント一覧](../docs/README.md)、仕様は[設計書](../docs/design.md)を参照してください。

## インストール

1. Chromeでは `chrome://extensions`、Edgeでは `edge://extensions` を開く。
2. デベロッパーモードを有効にする。
3. 「パッケージ化されていない拡張機能を読み込む」で、この `chatgpt-work-confirm` フォルダを選択する。
4. 開いているChatGPTのタブを再読み込みする。

アンインストールは拡張機能一覧から削除します。更新時は拡張機能の再読み込みとChatGPTタブの再読み込みを行ってください。

## 自動テスト

リポジトリのルートで実行します。Node.js 22以上が必要です。

```powershell
# 依存パッケージなしでイベント制御の単体テスト
npm.cmd test

# Playwrightと同梱Chromiumを取得（ネットワーク接続が必要）
npm.cmd install
npx.cmd playwright install chromium

# 拡張機能を実際に読み込んだChromiumで模擬ページを検証
npm.cmd run test:browser

# 拡張機能入りの専用Chromiumを表示し、ユーザーがログイン
npm.cmd run browser:login
```

ブラウザテストは `https://chatgpt.com/` を模擬HTMLに差し替え、実サイトへメッセージを送信しません。Content Scriptはmanifest経由で注入します。ログイン起動は実サイトを開くだけで、自動送信はしません。ログイン状態はルートの `.profile/` に保存されるため、共有・コミットしないでください。Chromiumの取得先はPlaywright既定のユーザーキャッシュです。

## 実サイトでの確認

ログイン後、まずWorkホームでテスト用文字列を入力し、送信ボタンとEnterそれぞれでキャンセルし、入力が保持され送信されないことを確認します。Chat/Work切替、Shift+Enter、日本語IME、再読み込み、会話画面も確認します。OKによる実送信はユーザーの明示許可後に実施し、送信が1回だけであることを確認します。

## 制限

- 提供設計書のホーム画面のセレクタに基づく実装です。元HTMLはこのリポジトリにありません。
- 同一フォーム内の `work-home` または日本語の `Work モードで作成` 入力欄を根拠に判定します。Chat・未知モードには介入しません。他言語UIや会話画面でこれらが存在しない場合は保護できません。
- 送信ボタンは `button[type="submit"][aria-label="送信"]` が対象です。他言語のラベルは対象外です。
- Shift/Ctrl/Alt/Meta付きEnter、IME変換中のEnterには介入しません。キーを押し続けた場合のWorkの反復Enterは遮断します。
- 同じイベント処理中に同期的に発生するclick/submitには確認結果を共有します。遅延して発生する送信は再確認になる可能性があります。
- ChatGPTより早い段階のイベント処理やDOM変更、独自の送信経路に対する保証はありません。実サイトでのユーザーによる動作確認結果は検証記録にまとめています。
- confirmがfalseを返す場合や例外時は送信を遮断します。実ブラウザによるダイアログ抑制は未検証です。
- 拡張機能は音声機能や内部APIの呼び出しを保護しません。

検証結果は[検証記録](../docs/test-results.md)を参照してください。
