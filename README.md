# Ayaka’s Little Town

`index.html` をダブルクリックすると、ビルド・インストール不要で開けます。Chrome、Edge、Safariなど、WebGLに対応した現行ブラウザーでご利用ください。

## 操作

- 街を押したままドラッグ／タッチするとハムスターが追従します。離した位置まで歩きます。
- 家の正面の入口に近づくと内容が開きます。
- 家のラベルと下部メニューからも直接開けます。
- 街を選択した状態で矢印キーでも歩けます。Escapeでパネルを閉じます。
- 「はじめの位置」で中央に戻ります。

## 内容を差し替える

`script.js` 冒頭の `window.PORTFOLIO` を編集してください。コメント `TODO` が差し替え箇所です。

|項目|設定|
|名前・紹介|`name`、`bio`|
|GitHub・X|`github`、`x` にプロフィールの https URL|
|チーム制作|`teamUrl` にメルカリのハッカソン作品URL|
|メール|`email` にメールアドレス。メールアプリを開くリンクです|
|個人制作|`projects` 配列。作品の追加・削除・順序変更が可能|
|スキル|`skills` 配列|

各作品は `id`、`title`、`category`、`description`、`url`、`image`、`skills` を持ちます。`image` に `assets/project-01.jpg` などを設定し、画像をassetsフォルダーに入れてください。URL・メールが空の項目は「準備中」になります。チーム作品への遷移は、確認パネルの「作品ページへ進む」を選んだときだけ実行されます。

## ファイル

- `index.html`：ページとパネルの骨組み
- `style.css`：配色、配置、レスポンシブ表示、開閉アニメーション
- `script.js`：編集用データとパネル・作品一覧
- `world.js`：街、家、座標、入力処理、接近判定
- `vendor/three.bundle.js`：Three.js 0.169.0とGLTFLoaderの同梱版
- `vendor/THREE-LICENSE.txt`：Three.jsのMITライセンス
- `assets/hamster.glb`：お預かりした3Dモデル
- `assets/hamster-data.js`：同じモデルを直接開くために埋め込んだデータ

家の位置は `world.js` の `HOUSES`（x、z、labelY）、接近のしきい値は `ENTRY_RADIUS` で調整できます。ハムスターを別のGLBに交換する場合は、元ファイルと埋め込みデータの両方を更新してください。

```powershell
node -e "const fs=require('fs');fs.writeFileSync('assets/hamster-data.js','window.HAMSTER_GLB='+JSON.stringify(fs.readFileSync('assets/hamster.glb').toString('base64'))+';')"
```

この変換だけはNode.jsを使用します。通常の内容編集や閲覧には不要です。

## サーバーへの設置

index.html、style.css、script.js、world.js、assets、vendorを同じ階層構造でアップロードしてください。フォームの送信サーバーは使用しません。既存のtsukuriba.orgへの反映・DNS変更は、この納品には含めていません。

## 確認範囲

JavaScriptの構文、モデルの読込・寸法、パネルと作品詳細の切替、外部遷移の確認、未設定リンク、ドラッグ後の移動と家への接近判定、閉じた直後の再表示防止、リセットをプログラムで確認しています。実機ブラウザーでの描画・タッチ操作の目視検証は未実施です。
