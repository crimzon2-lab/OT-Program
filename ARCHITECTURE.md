# ARCHITECTURE.md — リハプリント自動生成 Web アプリ 設計・難所アルゴリズム仕様書

> **対象読者**：本プロジェクトの実装担当（後続モデル）。`TASKS.md` の各タスクは本書の節番号（§）を参照する。
> **契約ファイル**：`src/types/schema.ts`・`src/utils/prng.ts` は **変更禁止**。型が足りない場合はモジュール内部でローカル型を作ること。

---

## 目次
- §0 前提・絶対原則
- §1 ディレクトリ構成とファイル責務
- §2 データフローと生成パイプライン
- §3 A4 印刷制御
- §4 条件・シードコード仕様（Crockford Base32 差分エンコード）
- §5 難所アルゴリズム
  - §5.1 4象限の層化サンプリングと衝突判定の打ち切り
  - §5.2 線分二等分の誤差測定スケール座標計算
  - §5.3 スケジュール課題の逆算生成
  - §5.4 清音・濁音・半濁音・小書き文字の厳密判定
  - §5.5 バッチ横断の非復元抽出（プール）
  - §5.6 その他の逆算生成（迷路・金銭・カレンダー・服薬）
- §6 解答用紙のハイライト規則（白黒印刷対応）
- §7 UI 仕様
- §8 全モジュール パラメータ表（code 番号はここで確定）
- §9 モジュール別 紙面仕様
- §10 マスターデータ作成規約
- §11 コーディング規約・禁止事項・テスト基準
- §12 単一 HTML 配布（file:// 起動）

---

## §0 前提・絶対原則

| 項目 | 規則 |
|---|---|
| 尊厳 | イラスト・キャラクター・飾り枠・装飾色を一切使わない。紙面は白黒ハイコントラスト。解答用紙の赤（`ANSWER_STYLE.color`）のみ例外 |
| フォント | `TYPOGRAPHY.fontFamily`（BIZ UDPGothic → Hiragino → Meiryo → sans-serif）。Web フォントは読み込まない |
| 拡大 | 全モジュール共通の `textScale`（80〜200%）・`strokeScale`（100〜300%）を必ず反映する |
| オフライン | `fetch` / `XMLHttpRequest` / WebSocket / 外部 URL の `<script>` `<link>` `<img>` を一切使わない |
| 個人情報 | 氏名等は紙面の空欄下線のみ。アプリは氏名を入力・保存しない |
| 再現性 | 生成ロジックは `ctx.rng` と `ctx.draw` 以外の乱数・時刻・DOM 計測を使わない |
| 単位 | 紙面座標はすべて **mm**。SVG は `viewBox` を mm で張り、`width="…mm"` を付ける |

---

## §1 ディレクトリ構成とファイル責務

```
reha-print/
├─ ARCHITECTURE.md            本書
├─ TASKS.md                   実装タスクリスト
├─ index.html                 UI 骨格（Task 14）
├─ package.json / tsconfig.json / vite.config.ts
├─ scripts/verify-single.mjs  単一HTML検証（Task 78）
└─ src/
   ├─ main.ts                 起動・配線（Task 14, 20）
   ├─ types/
   │  └─ schema.ts            ★契約：全型・定数（変更禁止）
   ├─ utils/
   │  ├─ prng.ts              ★契約：Mulberry32 / cyrb53 / Rng（変更禁止）
   │  ├─ html.ts              HTML エスケープ・mm 書式・タグビルダ
   │  ├─ svg.ts               SVG 要素ビルダ（数値は fmt で小数2桁固定）
   │  ├─ kana.ts              §5.4 仮名分類・ターゲット判定
   │  ├─ geometry.ts          矩形・距離・象限/列判定
   │  ├─ placement.ts         §5.1 層化配置・最小距離配置・グリッド配置
   │  ├─ base32.ts            Crockford Base32・BitWriter/BitReader
   │  ├─ seedCode.ts          §4 条件・シードコード encode/parse
   │  └─ pool.ts              §5.5 バッチ横断非復元抽出
   ├─ core/
   │  ├─ params.ts            COMMON_PARAM_FIELDS・既定値・sanitize・表示条件
   │  ├─ registry.ts          全モジュール登録（ALL_MODULES）
   │  ├─ generator.ts         runJob：バッチ生成オーケストレーション
   │  └─ presets.ts           プリセット保存（StorageLike 注入）
   ├─ print/
   │  ├─ header.ts            役割別ヘッダー HTML
   │  ├─ sheet.ts             RenderedPage → .sheet HTML
   │  ├─ answerParts.ts       解答用ハイライト・象限集計・チェックリスト部品
   │  ├─ pageStyle.ts         @page 動的注入
   │  └─ print.css            印刷・シート CSS
   ├─ ui/
   │  ├─ app.css              画面 UI CSS
   │  ├─ appState.ts          状態管理・永続化・再生成トリガ
   │  ├─ sidebar.ts           領域別モジュール一覧
   │  ├─ paramForm.ts         ParamField → フォーム自動生成
   │  ├─ toolbar.ts           シード・枚数・出力モード・コード読込・印刷
   │  ├─ preview.ts           プレビュー描画・縮小・はみ出し検出・警告表示
   │  └─ presetPanel.ts       プリセット保存/呼出/削除/入出力
   ├─ modules/
   │  ├─ attention/
   │  │  ├─ m01-cancellation/   index.ts / logic.ts / render.ts / logic.test.ts
   │  │  ├─ m02-tmt/            同上
   │  │  ├─ m03-symbol-digit/   同上
   │  │  └─ m04-kana-pickup/    index.ts / logic.ts / layout.ts / render.ts / *.test.ts
   │  ├─ visuospatial/
   │  │  ├─ m05-lines/          同上
   │  │  └─ m06-dots-matrix/    同上
   │  ├─ memory/
   │  │  └─ m07-serial-nback/   同上
   │  ├─ language/
   │  │  └─ m08-lexical/        index.ts / common.ts / fill.ts / anagram.ts / category.ts / sentence.ts / render.ts / *.test.ts
   │  ├─ iadl/
   │  │  ├─ m09-maze/           index.ts / logic.ts / render.ts / logic.test.ts
   │  │  ├─ m10-money/          index.ts / coins.ts / money.ts / shopping.ts / render.ts / *.test.ts
   │  │  ├─ m11-schedule/       index.ts / calendar.ts / timetable.ts / solver.ts / render.ts / *.test.ts
   │  │  └─ m12-medication/     index.ts / logic.ts / render.ts / logic.test.ts
   │  └─ all.test.ts          全モジュール横断スモークテスト（Task 76）
   └─ data/
      ├─ symbols.ts
      ├─ vocabulary/  categories.ts / group1.ts〜group4.ts / index.ts / vocabulary.test.ts
      ├─ passages/    passages-1.ts〜passages-3.ts / index.ts / passages.test.ts
      ├─ sentences/   particle.ts / judgement.ts / sentences.test.ts
      ├─ shop-items.ts / shop-items.test.ts
      ├─ schedule/    errands.ts / calendar-events.ts / schedule.test.ts
      └─ medicines.ts / medicines.test.ts
```

### モジュールフォルダの責務分離（全モジュール共通）
| ファイル | 責務 | 禁止事項 |
|---|---|---|
| `logic.ts` | 乱数で **問題モデル（純データ）** を作る。座標計算・正解計算もここ | 文字列マークアップを作らない |
| `render.ts` | 問題モデル → `PageBody[]`（problem/stimulus/answer） | 乱数を使わない |
| `index.ts` | `paramSchema`（§8 の表どおり）、`orientation()`、`generate()`（logic→render を呼ぶだけ）、`defineModule` で export | ロジックを書かない |
| `*.test.ts` | 決定性・不変条件・境界値のテスト（§11.3） | — |

---

## §2 データフローと生成パイプライン

```mermaid
flowchart LR
  UI["UI（sidebar / paramForm / toolbar）"] -->|JobRequest| GEN["core/generator.runJob"]
  GEN --> SAN["core/params.sanitizeParams"]
  SAN --> ORI["module.orientation(params)"]
  GEN -->|sheetIndex ごと| CTX["GenerateContext 構築\nrng = createSheetRng\ndraw = pool.drawFromPool\nseedCode = encodeSeedCode"]
  CTX --> MOD["module.generate(ctx, params)"]
  MOD -->|PageBody[]| GEN
  GEN -->|JobResult| PRE["ui/preview"]
  PRE --> SHEET["print/sheet.renderSheet"]
  PRE --> PS["print/pageStyle.setPageOrientation"]
```

### `runJob(req: JobRequest): JobResult` 擬似コード
```
module   = registry.get(req.moduleId)
{params, warnings} = sanitizeParams(module, req.params)      // PARAM_CLAMPED
orientation = module.orientation(params)
start = req.startSheetIndex ?? 1
problemPages = [], answerPages = []                          // RenderedPage[][]（シート単位）
for s in start .. start + req.batchCount - 1:
    seedCode = encodeSeedCode(module, req.seed, s, params)
    sheetWarnings = []
    usedPoolKeys = new Set()
    ctx = {
      moduleId, seed: req.seed, sheetIndex: s, sheetCount: req.batchCount, seedCode,
      rng: createSheetRng(req.seed, moduleId, s), orientation, body: BODY_BOX[orientation],
      draw: (key, items, count) => {
          if usedPoolKeys.has(key) throw Error('同一 poolKey の二重 draw')
          usedPoolKeys.add(key)
          return drawFromPool({seed, moduleId, sheetIndex: s, poolKey: key, items, count, warn})
      },
      warn: (code, msg) => sheetWarnings.push({code, message: msg, sheetIndex: s}),
    }
    try   result = module.generate(ctx, params)
    catch e → warnings.push({code:'GENERATION_RETRY', message:`${s}枚目の生成に失敗: ${e.message}`}); continue
    nonAnswer = result.pages.filter(p => p.pageRole !== 'answer')
    answer    = result.pages.filter(p => p.pageRole === 'answer')
    pageTotal = nonAnswer.length + (outputMode==='withAnswer' ? answer.length : 0)
    RenderedPage を pageNo 1.. で作成して push
pages = outputMode==='problemOnly' ? flatten(problemPages)
      : answerOrder==='grouped' ? [...flatten(problemPages), ...flatten(answerPages)]
      : interleave(problemPages, answerPages)
warnings = 同一 code+message を 1 件に集約（sheetIndex は最初のものを残し、メッセージ末尾に「（2・3枚目）」を付記）
return { orientation, pages, warnings, params }
```

---

## §3 A4 印刷制御

### §3.1 DOM 構造（プレビューと印刷で **同一 DOM** を使う）
```html
<div id="app-shell">
  <aside id="sidebar">…</aside>
  <main id="main-pane">
    <div id="toolbar">…</div>
    <div id="warnings">…</div>
    <div id="preview-viewport">          <!-- 画面ではスクロール領域 -->
      <div id="print-root">              <!-- 印刷対象はこの中だけ -->
        <div class="sheet-frame">        <!-- 改ページ制御はこの要素に付ける -->
          <section class="sheet sheet--portrait">
            <header class="sheet__header">…</header>
            <div class="sheet__instruction">…</div>
            <div class="sheet__body">…PageBody.markup…</div>
            <footer class="sheet__footer">…</footer>
          </section>
        </div>
        …
      </div>
    </div>
  </main>
</div>
```

### §3.2 シート寸法（`PAGE_GEOMETRY` / `BODY_BOX` と一致させる）
| | portrait | landscape |
|---|---|---|
| `.sheet` 幅 × 高さ | 210mm × **296.5mm** | 297mm × **209.5mm** |
| padding（安全余白） | 12mm 四辺 | 12mm 四辺 |
| header / instruction / footer | 18 / 12 / 5 mm | 18 / 12 / 5 mm |
| `.sheet__body` | **186 × 237 mm** | **273 × 150 mm** |

高さは実寸より 0.5mm 短くする（`sheetHeightSafetyMm`）。残る端数（portrait 0.5mm）は body の下に余白として残る。

### §3.3 print.css（Task 13 で実装。以下は必須ルールの完全版）
```css
.sheet {
  --sheet-w: 210mm; --sheet-h: 296.5mm;
  width: var(--sheet-w); height: var(--sheet-h);
  padding: 12mm; box-sizing: border-box;
  overflow: hidden; display: flex; flex-direction: column;
  background: #fff; color: #000;
  font-family: 'BIZ UDPGothic','BIZ UDPゴシック','Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;
  break-inside: avoid; page-break-inside: avoid;
}
.sheet--landscape { --sheet-w: 297mm; --sheet-h: 209.5mm; }
.sheet__header      { flex: none; height: 18mm; }
.sheet__instruction { flex: none; height: 12mm; overflow: hidden; }
.sheet__body        { flex: none; position: relative; overflow: hidden; }
.sheet--portrait  .sheet__body { width: 186mm; height: 237mm; }
.sheet--landscape .sheet__body { width: 273mm; height: 150mm; }
.sheet__footer      { flex: none; height: 5mm; margin-top: auto; }
.sheet svg { display: block; }                    /* inline 要素の下端隙間を防ぐ */

/* ---- 画面プレビュー ---- */
@media screen {
  .sheet-frame {
    width: calc(var(--frame-w) * var(--zoom, 0.6));
    height: calc(var(--frame-h) * var(--zoom, 0.6));
    margin: 0 auto 8mm; overflow: hidden;
    box-shadow: 0 1px 6px rgba(0,0,0,.25);
  }
  .sheet-frame--portrait  { --frame-w: 210mm; --frame-h: 296.5mm; }
  .sheet-frame--landscape { --frame-w: 297mm; --frame-h: 209.5mm; }
  .sheet-frame > .sheet { transform: scale(var(--zoom, 0.6)); transform-origin: top left; }
  .sheet.is-overflow .sheet__body { outline: 1mm solid #d00; }  /* はみ出し検出（印刷には出ない） */
}

/* ---- 印刷 ---- */
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  #sidebar, #toolbar, #warnings, .no-print { display: none !important; }
  /* 印刷対象の祖先はすべて「普通のブロック・高さ自動・overflow visible」に戻す */
  #app-shell, #main-pane, #preview-viewport, #print-root {
    display: block !important; position: static !important;
    width: auto !important; height: auto !important;
    overflow: visible !important; margin: 0 !important; padding: 0 !important;
  }
  .sheet-frame {
    width: auto !important; height: auto !important; margin: 0 !important;
    box-shadow: none !important; overflow: visible !important;
    break-after: page; page-break-after: always;
  }
  .sheet-frame:last-child { break-after: auto; page-break-after: auto; }
  .sheet-frame > .sheet { transform: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

### §3.4 白紙ページ混入を防ぐチェックリスト（すべて必須）
1. `.sheet` の高さを実寸 −0.5mm にし、`overflow:hidden`・`box-sizing:border-box` にする。
2. 改ページは **`.sheet-frame` に付ける**。`.sheet` に付けて `:last-child` で解除すると、各 frame 内で `.sheet` が常に last-child になり全部解除されるため **誤り**。
3. 最後の `.sheet-frame` だけ `break-after:auto`。`#print-root` の中に `.sheet-frame` 以外の要素（空白テキストノード以外）を置かない。
4. 印刷時、`#print-root` の祖先に `display:flex/grid`・固定 `height`・`overflow:auto|hidden` が残っていると、Chrome は 1 ページ目しか印刷しない／白紙が出る → §3.3 の通り全部リセットする。
5. `100vh` を印刷系で使わない。`.sheet` に margin・border を付けない（影は screen のみ）。
6. `@page { margin: 0 }` にすることでブラウザの日付・URL ヘッダー／フッターが出る余地も無くなる。

### §3.5 @page 動的切り替え（`print/pageStyle.ts`）
```ts
export function setPageOrientation(o: Orientation): void {
  let el = document.getElementById('page-size') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 'page-size'; document.head.appendChild(el); }
  const css = `@page { size: A4 ${o}; margin: 0; }`;
  if (el.textContent !== css) el.textContent = css;
}
```
- **プレビューを描画するたびに** 呼ぶ（`beforeprint` だけに頼ると Ctrl+P の挙動がブラウザで異なる）。
- 1 ジョブ = 1 方向（`JobResult.orientation`）。1 ジョブ内で向きを混在させない。

### §3.6 ヘッダー・フッター（`print/header.ts`, `print/sheet.ts`）
| pageRole | 1 行目（左 / 右） | 2 行目 |
|---|---|---|
| problem | タイトル（5mm 太字）＋ subLabel ／ シードコード（2.6mm） | `実施日 ____年__月__日　氏名・ID ____________　所要時間 ____分____秒　メモ・スコア ____________`（下線は border-bottom 0.25mm の空 span） |
| stimulus | タイトル＋ subLabel（既定 `【提示用シート】`）／ シードコード | 空（記入欄を出さない） |
| answer | タイトル＋ subLabel（既定 `【解答・採点シート（検者用）】`）／ シードコード | `検者 ________　得点 ________` |

- 教示文帯（12mm）：`instruction` を 4.2mm×textScale で最大 2 行。収まらない場合は自動で 3.5mm まで縮小（`font-size` を計算で決定。DOM 計測禁止＝文字数から行数を見積もる：1 行の全角文字数 = 帯幅 / 文字サイズ）。
- フッター（5mm）：左に 50mm 校正バー（両端に縦目盛り・「50mm（印刷倍率確認用）」2mm 文字）、右に `pageNo/pageTotal` と、バッチ時は `（sheetIndex/sheetCount 枚目）`。
- ヘッダー下端に 0.3mm の黒線。

### §3.7 印刷時の利用者への案内（UI の印刷ボタン横に常時表示）
「印刷設定：用紙 A4／倍率『100%』または『実際のサイズ』／余白『なし』または『デフォルト』。印刷後にフッターの 50mm バーを定規で確認してください。」

---

## §4 条件・シードコード仕様

### §4.1 形式
```
RP1-<MID>-<SEED>[-<SHEET>][-<C1>-<C2>…]
```
| セグメント | 内容 | 規則 |
|---|---|---|
| `RP1` | バージョン | 固定 |
| `<MID>` | `M01`〜`M12` | 固定長 3 |
| `<SEED>` | 基本シード | 10 進 1〜10 桁、0〜4294967295。自動採番は 10000〜999999（5〜6 桁） |
| `<SHEET>` | バッチ内シート番号 | 10 進 **1〜3 桁**。**2 以上のときだけ** 出力（1 枚目は省略） |
| `<Cn>` | 条件差分ペイロード | Crockford Base32 **ちょうど 4 文字**ずつ。最終文字はチェック文字 |

- `<SHEET>`（1〜3 文字）と `<Cn>`（常に 4 文字）は **長さで区別** する。
- 例：
  - `RP1-M01-482914`（既定条件・1 枚目）
  - `RP1-M01-482914-3`（既定条件・3 枚目）
  - `RP1-M04-482914-7K3F-Q20T`（条件差分あり）
  - `RP1-M04-482914-3-7K3F-Q20T`（条件差分あり・3 枚目）

### §4.2 ペイロード（ビット列）のエンコード
1. `fullSchema = [...module.paramSchema, ...COMMON_PARAM_FIELDS]` のうち、`!valuesEqual(params[key], field.default)` のフィールドだけを **code 昇順** に並べる。
2. 各フィールドについて MSB ファーストで書く：
   - `code` を **5 bit**（1〜31。0 は終端／パディング予約）
   - 値（`bitWidth(n) = n <= 0 ? 0 : floor(log2(n)) + 1`）：

| kind | 値の表現 | ビット数 |
|---|---|---|
| int | `idx = (v - min) / step` | `bitWidth(floor((max-min)/step))` |
| select | options 中のインデックス | `bitWidth(options.length - 1)` |
| bool | （差分＝既定の反転なので値不要） | **0** |
| multi | options 順のビットマスク（i 番目の option を i 番目に書く） | `options.length` |
| charSet | 個数 3bit ＋ 各文字の alphabet インデックス（alphabet 順に昇順） | `3 + count × bitWidth(alphabet.length - 1)` |

3. ビット列を 5 bit 単位に区切り（末尾は 0 埋め）、`CROCKFORD_ALPHABET` で文字化 → `dataChars`。
4. **チェック文字**：`check = CROCKFORD_ALPHABET[deriveSeed('RP1', moduleId, seed, sheetIndex, dataChars) % 32]`
5. `dataChars` の末尾を `'0'` で埋めて、`(dataChars.length + 1) % 4 === 0` にしてから `check` を連結し、4 文字ごとに `-` で区切る。
   - チェック計算は **パディング前** の `dataChars` を使う（デコード側は末尾 '0' を除去してから再計算するのではなく、**パディング込みの文字列**で再計算すると不一致になるため）。→ 実装を単純化するため、**パディング後の dataChars（check を除く全文字）で計算する** と定める。
   - 確定規則：`check = ALPHABET[deriveSeed('RP1', moduleId, seed, sheetIndex, paddedDataChars) % 32]`
6. 差分が 0 件ならペイロード全体を省略する（チェック文字も付けない）。

### §4.3 パース（入力の正規化と誤読吸収）
```
s = input.normalize('NFKC').toUpperCase()
s = s.replace(/[ー－‐―−–—]/g, '-').replace(/\s+/g, '')       // IME の長音・全角ハイフン → '-'
segments = s.split('-').filter(x => x.length > 0)
segments[0] === 'RP1'            else VERSION
segments[1] ∈ MODULE_IDS         else MODULE
segments[2] は /^\d{1,10}$/ かつ ≤ UINT32_MAX   else SEED
i = 3
if segments[i] が /^\d{1,3}$/ → sheetIndex = Number(...), 1..999 else SHEET; i++
rest = segments.slice(i)
各 rest 要素は長さ 4             else FORMAT
文字の正規化：O→0, I→1, L→1。U や英数字以外が残れば CHAR
payload = rest.join(''); paddedData = payload.slice(0,-1); check = payload.at(-1)
check 再計算一致                 else CHECKSUM
BitReader で paddedData を読む：
  while 残りビット >= 5:
      code = read(5); if code === 0 break
      field = fullSchema.find(f => f.code === code)  else PARAM
      値を読む（範囲外インデックスは PARAM）
      code が直前より小さい／重複 → PARAM
return { ok:true, value:{ version:'RP1', moduleId, seed, sheetIndex, paramsDiff } }
```
- パース後の完全パラメータ＝ `defaultsOf(fullSchema)` に `paramsDiff` を上書き → `sanitizeParams`。
- 往復テスト必須：`parse(encode(x))` が `x` に一致すること（全モジュール・ランダムパラメータ 100 通り）。

### §4.4 互換性ルール
- `code` は一度割り当てたら変更・再利用禁止。select の `options` は末尾追加のみ（ただし bitWidth が変わると旧コードが壊れるため、**リリース後の options 追加は原則禁止**）。
- 既定値の変更も差分の意味を変えるため禁止。仕様変更が必要なら `SEED_CODE_VERSION` を上げる。

---

## §5 難所アルゴリズム

### §5.1 4象限の層化サンプリングと衝突判定の打ち切り（M01・M05A・M02 で使用）

`src/utils/placement.ts` に以下を実装する。

```ts
export interface Rect { x: number; y: number; w: number; h: number }
export interface Placed { x: number; y: number; quadrant: Quadrant }          // 中心座標
export interface StratifiedResult { points: Placed[]; perQuadrant: number; truncated: boolean; attempts: number }

export const PLACEMENT_BASE_ATTEMPTS = 2000;
export const PLACEMENT_ATTEMPTS_PER_ITEM = 20;
export const PLACEMENT_HARD_CAP = 20000;
export const PLACEMENT_PER_ITEM_CAP = 30;
export const PACKING_DENSITY_LIMIT = 0.55;   // 円充填の実用上限（面積比）
```

#### (a) placeStratified(rng, area, perQuadrant, itemDiameter, minGap)
```
minDist = itemDiameter + minGap                      // 中心間の最小距離
r = itemDiameter / 2
quads = 4 分割した Rect（順序は QUADRANT_ORDER）
// 1) 事前容量チェック（無駄な試行を避ける）
capPerQuad = floor( (qw * qh * PACKING_DENSITY_LIMIT) / (π/4 * minDist²) )
target = min(perQuadrant, capPerQuad)                // 減らした場合 truncated = true
// 2) ラウンドロビン配置（特定象限だけが枯渇するのを防ぐ）
budget = min(PLACEMENT_HARD_CAP, PLACEMENT_BASE_ATTEMPTS + 4 * target * PLACEMENT_ATTEMPTS_PER_ITEM)
attempts = 0; placed = [[],[],[],[]]; all = []
while attempts < budget and some placed[q].length < target:
    progress = false
    for q in 0..3:
        if placed[q].length >= target: continue
        for k in 1..PLACEMENT_PER_ITEM_CAP:
            if attempts >= budget: break
            attempts++
            x = rng.float(quads[q].x + r, quads[q].x + quads[q].w - r)
            y = rng.float(quads[q].y + r, quads[q].y + quads[q].h - r)
            if all.every(p => hypot(p.x-x, p.y-y) >= minDist):
                placed[q].push({x,y,quadrant}); all.push(...); progress = true; break
    if !progress and attempts >= budget: break
// 3) 打ち切り時は「象限均等」を優先して最小象限数に揃える
m = min(placed[q].length)
if m < perQuadrant: truncated = true; 各象限を先頭 m 個に切り詰める
return { points: flatten(placed), perQuadrant: m, truncated, attempts }
```
- **象限の内側マージン**：`x ∈ [qx + r, qx + qw - r]` とするため、要素は象限の中線を跨がない ⇒ `quadrantOf(中心)` の判定が配置象限と必ず一致する。
- **無限ループの不在**：外側 while は `attempts` が単調増加し `budget`（≤ 20000）で必ず停止する。

#### (b) placeUniform(rng, area, count, itemDiameter, minGap)（象限均等 OFF 用）
同じアルゴリズムを area 全体 1 領域で行う。`budget = min(HARD_CAP, BASE + count * PER_ITEM)`。

#### (c) gridLayout(area, total, cellMin, balance)（M01 grid モード）
```
maxCols = floor(area.w / cellMin), maxRows = floor(area.h / cellMin)
balance=true のとき cols, rows は偶数に限定（象限が同数セルを持つ）
候補 (cols, rows) のうち cols*rows === total を優先（アスペクト比が area に最も近いもの）
無ければ cols*rows ≤ total の最大値を採用し COUNT_ROUNDED
セル中心 = (area.x + (c + 0.5) * area.w / cols, area.y + (r + 0.5) * area.h / rows)
```

#### (d) ターゲットの割り当て（M01）
```
tPerQ = round(perQuadrant * targetRate / 100)、最低 1、最大 perQuadrant - 1
各象限で rng.sample(その象限の index 群, tPerQ) をターゲットに
非ターゲットには「ターゲット以外の刺激文字/記号」を rng.pick で割り当てる
balance=false のときは全体から round(total * rate) 個を sample
```
- 4 の倍数への丸め・容量不足による削減は必ず `ctx.warn('COUNT_ROUNDED' | 'PLACEMENT_TRUNCATED', '総刺激数を 280 → 248 に調整しました（文字サイズに対して用紙が狭いため）')` で日本語通知。
- `QuadrantStats` は **実配置結果から数え直して** 作る（期待値をそのまま書かない）。

#### (e) TMT（M02）の配置
- `placeUniform` を使い、`minGap = max(8, nodeDiameter * 0.8)`。「開始」「終了」ラベル用に、ノード 1 と最終ノードは衝突判定半径を `+6mm` 大きく扱う（先に 2 点を配置してから残りを配置）。
- 打ち切り時：`rng.fork('retry-1')`, `'retry-2'` で最大 2 回やり直し、それでも不足ならノード数を配置できた数に減らして `PLACEMENT_TRUNCATED`（Part B は偶数個に切り下げ）。
- 推奨（品質）：連続番号ノード間の距離 ≥ 2×直径 を満たす並び替えを最大 50 回試す（満たせなくても可）。

### §5.2 線分二等分の誤差測定スケール座標計算（M05B）

SVG の `viewBox` は body（mm）と一致するため **座標値＝実寸 mm**。

```
W, H = body.widthMm, body.heightMm
n = bisectCount
topPad = 6
spacing = (H - topPad) / n              // landscape n=10 → 14.4mm ≥ 14mm 必須
y_i = topPad + (i + 0.5) * spacing      // i = 0..n-1

// 長さ：等間隔 → 5mm 単位に丸め → シャッフル（同じ長さの偏りを防ぐ）
lengths = n==1 ? [max] : [ min + (max-min) * i/(n-1) ] を 5mm 丸め → rng.shuffle
// 左右オフセット：符号を半数ずつ（奇数なら 1 本は 0 付近）→ シャッフル
signs = [+1,-1,+1,-1,…] を rng.shuffle
o_i = signs[i] * rng.float(0.3, 1.0) * maxOffsetMm
// 用紙からはみ出さないよう制限（左右 5mm の余白）
limit_i = (W - L_i) / 2 - 5;  o_i = clamp(o_i, -limit_i, +limit_i)
x1_i = W/2 + o_i - L_i/2;  x2_i = x1_i + L_i
m_i  = x1_i + L_i / 2       // 真の中点（= W/2 + o_i）
```

#### 解答用紙のスケール（問題用紙と **完全に同一座標** に線分を描き、重ねて透かし採点できるようにする）
| 目盛り | x 座標 | y 範囲 | 線種 |
|---|---|---|---|
| 真の中点 | `m` | `y-6 … y+6` | 赤 実線 `ANSWER_STYLE.scaleStrokeMm*2` |
| ±5mm | `m-5`, `m+5` | `y-3 … y+3` | 赤 実線 `scaleStrokeMm` |
| ±10mm | `m-10`, `m+10` | `y-4.5 … y+4.5` | 赤 実線 `scaleStrokeMm` |
| 1mm 補助目盛り（任意） | `m-10 … m+10` の整数 | `y-1.5 … y+1.5` | 赤 0.15mm |
| ラベル | `m±5`, `m±10`, `m` | `y + 7.5`（下） | 2.2mm 文字「左10 左5 中 右5 右10」 |

- 端点ラベル：各線の左端の左に `①` 等の番号（3mm）。線の長さ `L` と `L/2` を解答表に記載。
- 解答用紙の教示帯には「偏位率(%) = (印の位置 − 真の中点) ÷ (線の長さ/2) × 100（右を＋）」を明記し、各線の `偏位 ____mm（左・右）` 記入欄を本文右端に置く。
- `maxLengthMm > 170` の bisection は portrait 幅（186mm）に収まらないため、`orientation()` で `'landscape'` を返し、generate で `ORIENTATION_FORCED` を警告。
- 50mm 校正バー（フッター）で印刷倍率を確認できることを教示帯に一言添える。

### §5.3 スケジュール課題の逆算生成（M11B）

#### データ型（`m11-schedule/timetable.ts` 内ローカル型）
```ts
interface PlannedItem { errandId: string; label: string; place: string; start: number; end: number; travelBefore: number }
type Constraint =
  | { id: string; kind: 'window';    errandId: string; from: number; to: number }   // start>=from && end<=to
  | { id: string; kind: 'fixed';     errandId: string; start: number }               // start === X（予約）
  | { id: string; kind: 'deadline';  errandId: string; by: number }                  // end <= by
  | { id: string; kind: 'notBefore'; errandId: string; after: number }               // start >= after
  | { id: string; kind: 'order';     beforeId: string; afterId: string }             // before.end <= after.start
interface TimetableProblem { dayStart: number; dayEnd: number; slot: 30; includeTravel: boolean;
  errands: { id: string; label: string; place: string; duration: number; travelMin: number }[];
  constraints: Constraint[]; solution: PlannedItem[] }
```

#### 生成アルゴリズム（**正解を先に作る → 条件を抽出 → 検証**）
```
dayStart = dayStartHour*60, dayEnd = dayEndHour*60, SLOT = 30
count = errandCount
loop:                                                     // count が 3 未満になったら例外
  for attempt in 1..200:
    r = rng.fork(`tt-${count}-${attempt}`)
    chosen = r.sample(候補, count)       // 候補 = ERRANDS。kind==='meal' は最大1、'appointment' は最大1、place 重複なし
    dur[e] = r.pick(e.durationsMin)
    order  = r.shuffle(chosen)
    cursor = dayStart; prevPlace = '自宅'; plan = []; ok = true
    for e in order:
        travel = includeTravel && e.place !== prevPlace ? e.travelMin : 0
        earliest = ceilTo(max(cursor + travel, e.openFromMin), SLOT)
        start = earliest + r.pick([0, 0, 30])             // ときどき空き時間を入れる
        end = start + dur[e]
        if end > min(e.openToMin, dayEnd): ok = false; break
        plan.push({…, start, end, travelBefore: travel}); cursor = end; prevPlace = e.place
    if ok: break → 条件抽出へ
  count -= 1; ctx.warn('GENERATION_RETRY', '条件に合う予定が組めなかったため用事を N 件に減らしました')

// 条件抽出：すべて「plan が満たす」ものだけを作る
C = []
for item in plan:
    e = template(item)
    if e.kind === 'appointment': C.push(fixed(item.start))                   // 「歯科の予約は 14:00 から」
    else if e.openFromMin > dayStart or e.openToMin < dayEnd:
        C.push(window(max(e.openFromMin, dayStart), min(e.openToMin, dayEnd))) // 「銀行は 9:00〜15:00 のあいだ」
level normal: order 条件を 1 件追加
level hard  : order 条件を 2 件 + deadline/notBefore を 1 件追加
easy        : 追加なし
order の選び方：ORDER_PAIRS のうち両方が plan にあり、かつ plan で before.end <= after.start のもの優先
             無ければ plan の隣接ペア (plan[k], plan[k+1]) から作る（「AをしてからBをする」）
deadline   ：item を 1 つ選び by = ceilTo(item.end, 60)（item.end ちょうどでも可）「〇〇は 11:00 までに終える」
notBefore  ：item を 1 つ選び after = floorTo(item.start, 60)「〇〇は 14:00 以降にする」

// 検証（必須・失敗はバグなので throw）
assert verifyPlan(problem, plan).every(r => r.ok)
```

#### `solver.ts`：`verifyPlan(problem, plan): { constraintId: string; ok: boolean; label: string }[]`
- 一般条件（チェックリストにも出す）：
  1. 全用事が 1 回ずつ入っている
  2. 時間が重ならない（start 昇順で `next.start >= prev.end + travel`）
  3. `includeTravel` 時、場所が変わる直前に `travelMin` 分の移動時間がある（最初の用事は自宅からの移動）
  4. すべて `dayStart` 以降・`dayEnd` 以前
- 個別条件：`Constraint` ごとに判定。
- **患者の解答も同じ関数で採点できる** ように、plan は任意の配列を受ける設計にする。
- 解答用紙：「解答例（条件を満たせば他の組み方も正解）」＋ 完成タイムテーブル ＋ 全条件チェックリスト（☐ 付き）。

### §5.4 清音・濁音・半濁音・小書き文字の厳密判定（`src/utils/kana.ts`）

#### 文字テーブル（`schema.ts` に定義済み・コピー禁止で import して使う）
| 区分 | 定数 | 内容 |
|---|---|---|
| 清音 46 | `HIRAGANA_SEION` | あ〜ん（を・ん含む） |
| 濁音 21 | `HIRAGANA_DAKUON` | が〜ぼ ＋ ゔ |
| 半濁音 5 | `HIRAGANA_HANDAKUON` | ぱぴぷぺぽ |
| 小書き 12 | `HIRAGANA_SMALL_TO_BASE` | ぁぃぅぇぉっゃゅょゎゕゖ → 清音 |

#### API
```ts
export function toCodePoints(s: string): string[]            // s.normalize('NFC') → Array.from
export function katakanaToHiragana(ch: string): string       // U+30A1–U+30F6 を -0x60。それ以外はそのまま
export function classifyKana(ch: string): KanaInfo
export function isKanaTarget(ch: string, opts: KanaMatchOptions): boolean
export function countTargets(chars: readonly string[], opts: KanaMatchOptions): number
export function dakuonVariantsOf(seion: string): string[]    // か→['が'], は→['ば','ぱ'], う→[]（ゔは使わない）
```

#### classifyKana の判定順
```
c = ch.normalize('NFC')（1 コードポイントでなければ script:'other'）
script = U+3041–U+3096 → 'hiragana' / U+30A1–U+30F6 → 'katakana' / それ以外 'other'
h = script==='katakana' ? katakanaToHiragana(c) : c
if script==='other'                 → { base:c, voicing:'none', isSmall:false }
if h in HIRAGANA_SMALL_TO_BASE      → { base: map[h], voicing:'seion', isSmall:true }
if h in HIRAGANA_SEION              → { base:h, voicing:'seion', isSmall:false }
if h in HIRAGANA_DAKUON             → { base: 濁点を外した清音（ゔ→う）, voicing:'dakuon', isSmall:false }
if h in HIRAGANA_HANDAKUON          → { base: は行清音, voicing:'handakuon', isSmall:false }
else（ゐ・ゑ 等）                   → { base:h, voicing:'none', isSmall:false }
```
濁点除去は `String.fromCodePoint(cp - 1)`（が U+304C → か U+304B）、半濁点は `cp - 2`（ぱ U+3071 → は U+306F）、ゔ U+3094 は個別に 'う'。

#### isKanaTarget（仮名拾いの正解判定）
```
info = classifyKana(ch)
if info.script !== 'hiragana'  return false     // カタカナ・記号・長音・スペースは常に対象外
if info.voicing !== 'seion'    return false     // 濁音・半濁音は清音ターゲットと一致させない（が≠か）
if info.isSmall                return opts.includeSmall && opts.targets.includes(info.base)
return opts.targets.includes(info.char)
```

#### 判定テストケース（`kana.test.ts` に全件入れる）
| 文字 | targets | includeSmall | 期待 | 理由 |
|---|---|---|---|---|
| か | か | – | ✓ | 清音一致 |
| が | か | – | ✗ | 濁音 |
| ぱ | は | – | ✗ | 半濁音 |
| ば | は | – | ✗ | 濁音 |
| ぁ | あ | false | ✗ | 小書き除外 |
| ぁ | あ | true | ✓ | 小書き許可 |
| っ | つ | false / true | ✗ / ✓ | 促音 |
| ゃ | や | false / true | ✗ / ✓ | 拗音 |
| ゔ | う | – | ✗ | 濁音 |
| ア | あ | – | ✗ | カタカナ |
| ー 、 。 ␠ | あ | – | ✗ | 記号 |
| `'か\u3099'`（NFD のが） | か | – | ✗ | NFC 正規化で「が」になる |

#### その他の文字処理規則
- **文字の数え方**：常に `toCodePoints()`（UTF-16 の `length` や `charAt` を使わない）。1 コードポイント＝1 マス。小書き文字・長音「ー」も 1 マス。
- **ベタ組み／分かち書き**：`spacing==='solid'` は `kanaText.replace(/ /g, '')`、`'wakachi'` は半角スペースを保持し、表示上は **0.5 マス幅の空白** として描く（スペースはマスに数えない・ターゲット判定対象外）。
- **正解位置**：表示用に変換した後の文字配列のインデックスで管理する（変換前のインデックスを流用しない）。
- **行頭禁則**：「、」「。」「ー」と小書き文字は行頭に置かず、前の行の末尾にぶら下げる（最大 1 文字）。分かち書きでは文節（スペース区切り）の途中で改行しないことを優先し、1 文節が 1 行より長い場合のみ途中で折る。
- **アナグラム**：`toCodePoints(kana)` をシャッフル。元の並びと同一になったら最大 10 回再シャッフル、全文字同一の語は出題対象から除外。
- **穴埋めの伏せ字**：伏せたマスは空欄の四角（問題）／模範解答は全文字表示。`initialFinal` は 3 文字以上の語のみ。`random` は `ceil(len/3)` 文字を表示（全表示・全伏せにはしない）。

### §5.5 バッチ横断の非復元抽出（`src/utils/pool.ts`）
```ts
export function drawFromPool<T>(args: {
  seed: number; moduleId: ModuleId; sheetIndex: number; poolKey: string;
  items: readonly T[]; count: number; warn: (code: WarningCode, msg: string) => void;
}): T[]
```
```
if count <= 0 or items.length === 0: return []
if count > items.length: warn('POOL_EXHAUSTED', …); count = items.length    // 1 枚内での重複は絶対に作らない
order = createPoolRng(seed, moduleId, poolKey).shuffle(items)              // sheetIndex に依存しない並び
start = ((sheetIndex - 1) * count) % order.length
if (sheetIndex * count > order.length): warn('POOL_EXHAUSTED', 'データ数が不足しているため、N枚目以降で前の紙面と同じ問題が出ることがあります')
return Array.from({length: count}, (_, k) => order[(start + k) % order.length])
```
- 「10 枚中 3 枚目」を単独で再生成しても同じ語が出る（並び順がシート番号に依存しないため）。
- `count` は **パラメータだけで決まる値** にする（乱数で決めると枚数ごとのスライス位置がずれる）。
- 1 回の generate 内で同じ `poolKey` を 2 回使わない（generator が例外を投げる）。複数カテゴリから取る場合は `vocab:kitchen` のようにキーを分ける。

### §5.6 その他の逆算生成

#### 迷路（M09）
- 完全迷路（ループ無し）を **反復型** 深さ優先（`backtracker`、スタックを配列で持つ・再帰禁止）または乱択 Prim で生成。完全迷路なので最短路は一意。
- 出入口：`tlToBr` 左上セルの左壁→右下セルの右壁／`trToBl` 右上の右壁→左下の左壁／`rightToLeft` 右端中央行の右壁→左端中央行の左壁／`leftToRight` その逆。
- 解：BFS で start→goal のセル列 → セル中心を結ぶ折れ線（赤・破線・太線）。
- セル寸法 `cell = min(W, H - 12) / gridSize`（ラベル「スタート」「ゴール」用に 12mm 確保）。

#### 金銭（M10）
- **exact（ちょうど支払う）**：先に支払額 `p` と「ちょうど払える組み合わせ」を作り、ダミーの硬貨・紙幣を足して財布を作る。財布の部分集合を全列挙（`Π(枚数+1) ≤ 4096` に制限）し、合計 = p の組み合わせが **1 通り** になるまで最大 50 回作り直す。50 回で一意にならなければ全解（最大 3 通り）を解答に列挙。
- **minChange（おつりの枚数が最も少ない出し方）**：財布の部分集合 `S`（合計 ≥ p）を全列挙し、`(おつり枚数（貪欲法）, 支払枚数)` の辞書式最小を最適とする。最適が一意になるまで最大 50 回作り直す。日本の金種は貪欲法で最小枚数が得られる（正準硬貨系）。
- **budget**：候補 5〜6 品の全部分集合 64 通りを列挙し、「予算以内で合計が最大」の組み合わせが一意になる予算 `B` を逆算（`B = sum(S*) + r`、`r` は他のどの部分集合合計も `(sum(S*), B]` に入らない値）。
- **割引**：10%引きは `price % 10 === 0` の品目にのみ付与し `price * 0.9`（整数になる）。半額は偶数価格の品目にのみ付与し `price / 2`。端数処理が発生しない品目だけを使う。
- 硬貨・紙幣の模式図は §9 M10 を参照。

#### カレンダー（M11A）
- 曜日計算は `new Date(Date.UTC(y, m-1, 1)).getUTCDay()`（タイムゾーン非依存）。`practice` は月 1..12 を乱数、日数はその月の実日数（2 月は 28）、1 日の曜日を乱数。
- 先にイベント日付（正解）を決めてから条件文を作る：
  - `weekly(wd)`：その曜日の全日付（最大 2 規則）
  - `nthWeekday(n≤4, wd)` / `lastWeekday(wd)`
  - `relativeDays(d0, k)`：`k ∈ {2,3,5,7,10}`、`d0 + k ≤ days`
  - `specificDate(d)`
- 1 マスに入るイベントは最大 2 件（超える場合は引き直し）。
- 質問：日付が 1 つに決まるイベントは「〇〇は何日（何曜日）ですか」、weekly は「〇月に〇〇は何回ありますか」。

#### 服薬（M12）
- 先に薬ごとの `timings` と `dose` を決め、そこから「1 日量 = dose × timings.length」「必要数 = 1 日量 × days」「不足数 = 必要数 − 手持ち（手持ちは必要数未満の値を引く）」「残日数 = floor(手持ち / 1 日量)」を計算。
- 4 区分（朝・昼・夕・寝る前）のうち、どの薬も無い区分ができてもよいが、薬が 1 つも無い区分は表に「なし」と明記。

---

## §6 解答用紙のハイライト規則（白黒印刷対応）

> 解答用紙はカラー印刷を前提にせず、**白黒プリンタで印刷しても判別できる** ことを必須とする。

| 対象 | 規則 | 実装（`print/answerParts.ts`） |
|---|---|---|
| **線系**（TMT 経路・迷路最短路） | 赤 ＋ 破線 ＋ 太線 の三重符号化。経路はノード・壁より **下層** に描く | `answerPath(points, strokeScale)`：`stroke=#D00000`, `stroke-width=ANSWER_STYLE.pathStrokeMm*strokeScale/100`, `stroke-dasharray="3 1.5"`, `fill=none`, `stroke-linecap=round` |
| **文字・記号系**（抹消・仮名拾い・N-back・カテゴリ選択・硬貨選択） | **文字色は黒のまま**。外周を赤の太線の **丸** または **太枠** で囲む。文字そのものを赤くする・赤で塗る・背景を塗るのは **禁止** | `answerCircle(cx, cy, sizeMm)`：`r = size*0.5 + 0.8`、`fill=none`、`stroke=#D00000`、`stroke-width=0.6`。横長の語は `answerRect(x,y,w,h)`（角丸 1mm） |
| **書き込み型**（符号変換・連続計算・計算問題） | 正答の数字・語を **黒** で書き込み欄に表示（太字可） | 通常テキスト |
| **集計** | 空間系の解答用紙には 4 象限（左上・右上・左下・右下）ごとの正解数を必ず出す。教示帯に `formatQuadrantSummary(stats)`、本文に 4 象限の境界を灰色破線（0.2mm, `#555`）で描く | `formatQuadrantSummary`, `quadrantGuides(body)` |
| **チェックリスト** | 言語・IADL 系は模範解答と採点基準を表で出す（☐ 記入欄つき） | `checklistTable(items)` |

`formatQuadrantSummary` の出力例（2 行）：
```
正解数　左上 10　右上 10　左下 10　右下 10　（計 40）
検出数　左上 __/10　右上 __/10　左下 __/10　右下 __/10　（計 __/40）
```

---

## §7 UI 仕様

- **レイアウト**：CSS Grid `grid-template-columns: 340px 1fr`。左：`#sidebar`（領域アコーディオン → モジュールボタン → パラメータフォーム → 共通パラメータ（文字倍率・線幅倍率）→ プリセット）。右：`#toolbar` ＋ `#warnings` ＋ `#preview-viewport`。
- **toolbar**：`シード [数値入力] [新しいシード]`／`枚数 [1〜10]`／`出力 (問題のみ | 問題＋解答)`／`解答の並び (まとめて | 交互)`／`条件コード [入力] [読込]`／`[印刷]`／印刷案内文（§3.7）。
- **再生成**：パラメータ・シード・枚数・出力の変更で 200ms デバウンス後に `runJob`。シードはユーザーが「新しいシード」を押すまで変えない。
- **コード読込**：`parseSeedCode` → 成功時はモジュール切替・パラメータ反映・シード反映・`startSheetIndex = sheetIndex`・枚数 1。失敗時はエラー種別の日本語メッセージを表示（例：CHECKSUM →「入力ミスの可能性があります。文字を確認してください」）。
- **プレビュー倍率**：`zoom = min(1, (viewport幅 − 32px) / シート幅px)`。シート幅 px は `210mm` を一時要素で計測（UI のみ DOM 計測可）。
- **はみ出し検出**：描画後、各 `.sheet__body` について `scrollHeight > clientHeight + 1 || scrollWidth > clientWidth + 1` なら `.is-overflow` を付け、`OVERFLOW_DETECTED` 警告を追加。
- **永続化**：`AppState` を `APP_STATE_STORAGE_KEY` に保存し、起動時に復元（壊れた JSON は無視して既定値）。
- 文言はすべて日本語。絵文字・アイコン画像は使わない。

---

## §8 全モジュール パラメータ表（code 番号はここで確定・変更禁止）

表記：`int a–b/s` は min a・max b・step s。`vis` は `visibleWhen`（AND）。

### 共通（core/params.ts の `COMMON_PARAM_FIELDS`）
| key | code | kind | 範囲 / 選択肢 | 既定 | ラベル |
|---|---|---|---|---|---|
| textScale | 30 | int | 80–200/10 | 100 | 文字倍率（%） |
| strokeScale | 31 | int | 100–300/25 | 100 | 線幅倍率（%） |

### M01 抹消課題（domain: attention）
| key | code | kind | 範囲 / 選択肢（順序固定） | 既定 | vis |
|---|---|---|---|---|---|
| stimulusType | 1 | select | hiragana ひらがな / katakana カタカナ / digit 数字 / latin 英字 / shape 幾何学記号 | hiragana | |
| targetKinds | 2 | int | 1–3/1 | 1 | |
| layout | 3 | select | scatter ランダム散布 / grid グリッド整列 | scatter | |
| totalStimuli | 4 | int | 40–320/4 | 160 | |
| targetRate | 5 | int | 10–40/5 | 20 | |
| charSizeMm | 6 | int | 5–14/1 | 8 | |
| quadrantBalance | 7 | bool | | true | |
| showTargetSample | 8 | bool | | true | |
| orientation | 9 | select | landscape 横 / portrait 縦 | landscape | |

### M02 TMT様課題（attention）
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| part | 1 | select | A Part A（数字）/ B Part B（数字とかな） | A | |
| nodeCount | 2 | int | 10–30/1 | 25 | |
| nodeDiameterMm | 3 | int | 6–16/1 | 10 | |
| orientation | 4 | select | landscape 横 / portrait 縦 | landscape | |
| practice | 5 | bool | | true | |

### M03 符号変換課題（attention）— 常に portrait
| key | code | kind | 範囲 | 既定 |
|---|---|---|---|---|
| pairCount | 1 | int | 6–9/1 | 9 |
| rows | 2 | int | 3–10/1 | 6 |
| cols | 3 | int | 8–16/1 | 12 |
| practiceCells | 4 | int | 0–12/1 | 6 |
| shuffleMapping | 5 | bool | | true |

### M04 仮名拾い（attention）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | passage 意味文（二重課題）/ random 無意味文字列 | passage | |
| targetPreset | 2 | select | vowels 母音（あいうえお）/ custom 任意指定 | vowels | |
| customTargets | 3 | charSet | alphabet=`HIRAGANA_SEION`, 1–5 文字 | `あ` | targetPreset=custom |
| includeSmallKana | 4 | bool | | false | |
| rows | 5 | int | 6–20/1 | 10 | subMode=random |
| charsPerRow | 6 | int | 15–35/1 | 25 | subMode=random |
| targetRate | 7 | int | 10–30/5 | 20 | subMode=random |
| dakuonDecoys | 8 | bool | | true | subMode=random |
| spacing | 9 | select | solid ベタ組み / wakachi 分かち書き | solid | subMode=passage |
| questionCount | 10 | int | 2–3/1 | 3 | subMode=passage |
| questionPlacement | 11 | select | samePage 同じ用紙 / nextPage 次の用紙 | samePage | subMode=passage |
| charSizeMm | 12 | int | 4–9/1 | 6 | |

### M05 線分抹消・線分二等分（visuospatial）
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | cancellation 線分抹消 / bisection 線分二等分 | cancellation | |
| linesPerCell | 2 | int | 2–6/1 | 4 | subMode=cancellation |
| lineLengthMm | 3 | int | 10–30/1 | 20 | subMode=cancellation |
| centerPractice | 4 | bool | | true | subMode=cancellation |
| bisectCount | 5 | int | 5–10/1 | 6 | subMode=bisection |
| minLengthMm | 6 | int | 100–200/10 | 100 | subMode=bisection |
| maxLengthMm | 7 | int | 100–200/10 | 200 | subMode=bisection |
| maxOffsetMm | 8 | int | 0–50/5 | 30 | subMode=bisection |
| orientation | 9 | select | landscape 横 / portrait 縦 | landscape | |

`minLengthMm > maxLengthMm` の場合は sanitize ではなく generate 内で入れ替えて `PARAM_CLAMPED`。

### M06 点つなぎ模写・空間記憶（visuospatial）
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | dotCopy 点つなぎ模写 / spatialMatrix 空間記憶マトリクス | dotCopy | |
| dotGrid | 2 | int | 3–6/1 | 4 | subMode=dotCopy |
| segmentCount | 3 | int | 3–12/1 | 6 | subMode=dotCopy |
| allowDiagonal | 4 | bool | | true | subMode=dotCopy |
| copyLayout | 5 | select | leftRight 左に見本・右に模写 / topBottom 上に見本・下に模写 | leftRight | subMode=dotCopy |
| figureCount | 6 | int | 1–3/1 | 2 | subMode=dotCopy |
| matrixSize | 7 | int | 3–6/1 | 4 | subMode=spatialMatrix |
| filledCells | 8 | int | 2–12/1 | 5 | subMode=spatialMatrix |
| matrixCount | 9 | int | 1–6/1 | 4 | subMode=spatialMatrix |
| orientation | 10 | select | portrait 縦 / landscape 横 | portrait | |

### M07 連続計算・N-back（memory）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | serialAddition 連続加算 / nBack 紙面N-back | serialAddition | |
| additionRows | 2 | int | 5–20/1 | 12 | subMode=serialAddition |
| additionDigits | 3 | int | 10–30/1 | 20 | subMode=serialAddition |
| nBackLevel | 4 | select | 1 1-back / 2 2-back | 1 | subMode=nBack |
| nBackItem | 5 | select | digit 数字 / hiragana ひらがな / katakana カタカナ / latin 英字 | digit | subMode=nBack |
| nBackRows | 6 | int | 3–10/1 | 6 | subMode=nBack |
| nBackLength | 7 | int | 10–20/1 | 15 | subMode=nBack |
| matchRate | 8 | int | 25–35/1 | 30 | subMode=nBack |

### M08 語彙・喚語・意味理解・短文（language）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | fill 単語穴埋め / anagram 仮名並べ替え / category カテゴリ分類 / sentence 助詞・正誤判定 | fill | |
| categories | 2 | multi | `VOCAB_CATEGORY_IDS` の順（ラベルは categories.ts）、minSelected 1 | 全 12 | subMode ∈ fill,anagram,category |
| notation | 3 | select | kanjiRuby 漢字＋ふりがな / hiragana かなのみ / kanji 漢字のみ | kanjiRuby | |
| itemCount | 4 | int | 5–20/1 | 10 | |
| fillHint | 5 | select | initial 語頭音 / final 語尾音 / initialFinal 語頭＋語尾 / random ランダム | initial | subMode=fill |
| showCategoryHint | 6 | bool | | true | subMode ∈ fill,anagram |
| minLength | 7 | int | 2–6/1 | 3 | subMode ∈ fill,anagram |
| maxLength | 8 | int | 2–6/1 | 5 | subMode ∈ fill,anagram |
| categoryTask | 9 | select | oddOneOut 仲間外れ選択 / findAll 指定カテゴリ探索 | oddOneOut | subMode=category |
| groupSize | 10 | int | 4–5/1 | 4 | subMode=category, categoryTask=oddOneOut |
| findAllCount | 11 | int | 20–30/1 | 24 | subMode=category, categoryTask=findAll |
| sentenceTask | 12 | select | particleBlank 助詞の書き込み / particleChoice 助詞の選択 / judgement 意味の正誤判定 | particleBlank | subMode=sentence |

### M09 迷路（iadl）
| key | code | kind | 範囲 / 選択肢 | 既定 |
|---|---|---|---|---|
| gridSize | 1 | int | 8–25/1 | 12 |
| route | 2 | select | tlToBr 左上→右下 / trToBl 右上→左下 / rightToLeft 右端→左端（左側探索誘導）/ leftToRight 左端→右端 | tlToBr |
| algorithm | 3 | select | backtracker 長い通路型 / prim 分岐多め型 | backtracker |
| orientation | 4 | select | portrait 縦 / landscape 横 | portrait |

### M10 金銭管理・買い物（iadl）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | coinTotal お金の合計 / payment 支払い選択 / shopping 買い物計算 | coinTotal | |
| problemCount | 2 | int | 2–6/1 | 4 | subMode ∈ coinTotal,payment |
| maxPieces | 3 | int | 3–12/1 | 8 | subMode=coinTotal |
| includeBills | 4 | bool | | true | subMode ∈ coinTotal,payment |
| paymentTask | 5 | select | exact ちょうど支払う / minChange おつりが最少 | exact | subMode=payment |
| priceMax | 6 | int | 300–10000/100 | 2000 | subMode=payment |
| shopItemCount | 7 | int | 8–15/1 | 12 | subMode=shopping |
| listCount | 8 | int | 2–6/1 | 4 | subMode=shopping |
| shoppingLevel | 9 | select | basic 合計とおつり / budget 予算内の組み合わせ / discount 割引・個数指定 | basic | subMode=shopping |
| includeQuantity | 10 | bool | | true | subMode=shopping |

### M11 スケジュール・カレンダー（iadl）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| subMode | 1 | select | calendar 月間カレンダー / timetable 1日タイムスケジュール | calendar | |
| calendarSource | 2 | select | practice 練習用（ランダム）/ actual 実在の年月 | practice | subMode=calendar |
| year | 3 | int | 2020–2040/1 | 2027 | subMode=calendar, calendarSource=actual |
| month | 4 | int | 1–12/1 | 4 | subMode=calendar, calendarSource=actual |
| weekStart | 5 | select | sun 日曜始まり / mon 月曜始まり | sun | subMode=calendar |
| conditionCount | 6 | int | 3–6/1 | 4 | subMode=calendar |
| calendarTask | 7 | select | both 書き込み＋質問 / write 書き込みのみ / question 質問のみ | both | subMode=calendar |
| dayStartHour | 8 | int | 8–10/1 | 9 | subMode=timetable |
| dayEndHour | 9 | int | 15–18/1 | 17 | subMode=timetable |
| errandCount | 10 | int | 3–6/1 | 4 | subMode=timetable |
| includeTravel | 11 | bool | | true | subMode=timetable |
| constraintLevel | 12 | select | normal ふつう / easy やさしい / hard むずかしい | normal | subMode=timetable |

### M12 服薬管理（iadl）— 常に portrait
| key | code | kind | 範囲 / 選択肢 | 既定 | vis |
|---|---|---|---|---|---|
| drugCount | 1 | int | 3–6/1 | 4 | |
| labelStyle | 2 | select | letterEffect A錠（血圧の薬）/ fictionalEffect 架空名（効能）/ letterOnly A錠のみ | letterEffect | |
| organizer | 3 | select | daily 1日4区分 / weekly 1週間カレンダー | daily | |
| includeCalc | 4 | bool | | true | |
| travelDays | 5 | select | 7 7日間 / 14 14日間 | 7 | includeCalc=true |
| includeStock | 6 | bool | | true | includeCalc=true |

---

## §9 モジュール別 紙面仕様

共通：文字サイズは `TYPOGRAPHY.baseFontMm * textScale/100`（モジュール独自の `charSizeMm` がある場合はそれ × textScale/100）。線幅は `baseStrokeMm * strokeScale/100`。収まらない場合は **(1) 余白縮小 → (2) 設問数削減（ITEMS_REDUCED）** の順で調整し必ず警告する。DOM 計測は禁止（行数・幅は文字数×文字サイズで見積もる）。

| モジュール | 問題用紙 | 解答用紙 |
|---|---|---|
| **M01** | 本文上部に見本帯（showTargetSample：「これと同じものに〇をつけてください： [あ] [け]」高さ = 刺激サイズ + 8mm）。残り領域に §5.1 配置。shape は `data/symbols.ts` の path を描く | 同一配置 ＋ ターゲットに赤丸 ＋ 象限境界の灰色破線 ＋ 教示帯に `formatQuadrantSummary` |
| **M02** | ノード：白抜き円（黒線）＋中央にラベル。ノード 1 の下に「開始」、最終ノードの下に「終了」。practice=true なら本文上部 40mm に区切り線付き練習枠（Part A: 1〜5 / Part B: 1→あ→2→い→3 の 5 ノード）。Part B のかな順は `あいうえおかきくけこさしすせそ` | 同一配置 ＋ 正解経路（§6 線系、ノードの下層）＋ 教示帯に正解順 |
| **M03** | 上部に対応表（記号 → 数字）。下に rows×cols のマス（上段：記号、下段：空欄）。先頭 practiceCells マスは太枠＋上に小さく「練習」。同じ記号が連続しない | 下段に正答数字（黒）、行ごとの数と総数 |
| **M04** | **SVG の文字グリッド**（1 文字ずつ x,y 配置。文字送り = 文字サイズ×1.05、行送り = 文字サイズ×1.9）。passage は本文下に内容確認問題（3 択：①②③ に〇）。収まらなければ文字を 4mm まで縮小 → それでも無理なら nextPage へ移し LAYOUT_SCALED | 同一グリッドで正解文字に赤丸、各行末に行ごとの正解数、総数、内容問題の正解 |
| **M05A** | 6 区画（左/中/右 × 上/下）に各 linesPerCell 本のランダム角度の線分（§5.1 を区画単位で使用）。centerPractice は中央に 4 本（集計外） | 全線分に番号は付けず、区画境界の灰色破線、`columnStats` と `quadrantStats` を教示帯に |
| **M05B** | §5.2。線分の両端に短い縦の端点マーク（高さ 2mm）は付けない（標準的な二等分課題に合わせ線のみ） | §5.2 のスケール ＋ 長さ表 |
| **M06A** | 見本グリッド（ドット＋太線）と空グリッド（ドットのみ）を figureCount 組。ドット半径 1.2mm、格子間隔 = 利用領域から算出（最大 20mm） | 見本の拡大 ＋ 採点表（線分数・正しく描けた本数・脱落側） |
| **M06B** | 問題：`stimulus` ページ（黒塗りマトリクス ①〜）＋ `problem` ページ（空マトリクス ①〜）の 2 ページ | 黒塗りマトリクス ＋ 正答セル数 |
| **M07A** | 数字行（3〜9）を文字送り 6mm×textScale で並べ、下の行の「数字と数字の間」に記入欄（クレペリン形式） | 記入欄に正答の 1 の位（黒） |
| **M07B** | 各行を独立系列としてマス並び。教示「すぐ前（2-back は 2 つ前）と同じものに〇」 | 一致項目に赤丸、行ごとの一致数 |
| **M08** | HTML（表・mm 固定）。fill / anagram は 1 文字＝1 マスの四角。category の oddOneOut は「① ② ③ ④」横並び、findAll は 4〜6 列の語グリッド。sentence は（　）または（が・を・に）または（○・×） | 模範解答・許容解（例：「へ も可」）・採点基準。findAll / oddOneOut は語を赤枠で囲む |
| **M09** | 壁は黒線（`baseStrokeMm*1.5*strokeScale`）。「スタート」「ゴール」ラベルと開口部 | 最短路（§6 線系） |
| **M10** | 硬貨：`COIN_SPECS` の直径比で描く円。中央に大きな金額数字（太字）、下に小さく「円」。1円=白・細い縁 / 5円=淡灰 `#D9D9D9`・中央の穴・数字は穴の上 / 10円=灰 `#BFBFBF` / 50円=白・穴・二重縁 / 100円=白・二重縁 / 500円=淡灰・二重縁・太い外周。紙幣：`BILL_SPECS × BILL_DRAW_SCALE` の長方形、中央に大きな「1000」等、右下に「円」、千円=一重枠 / 五千円=二重枠 / 一万円=太い二重枠、下部に「千円」「五千円」「一万円」。写真・肖像・図柄は描かない | 合計金額、支払う硬貨・紙幣に赤丸（§6 文字・記号系）、計算式 |
| **M11A** | 月間カレンダー（7 列 × 5〜6 行、セル高 = 利用高から算出・最小 14mm）＋ 条件文 ＋ 質問と回答欄 | 正しく書き込んだカレンダー（略記を黒字で記入）＋ 質問の正答 |
| **M11B** | 用事リスト表（用事・場所・所要時間）、条件文（番号付き）、白紙タイムテーブル（30 分刻みの行：時刻｜予定） | §5.3 完成例 ＋ チェックリスト |
| **M12** | お薬説明書（表：薬・効能・飲み方・1回量）→ 設問1 配薬表（daily：朝/昼/夕/寝る前の 4 枠、weekly：7 日 × 4 区分）→ 設問2 必要数・残薬計算 | 配薬表の正答、計算式と答え |

---

## §10 マスターデータ作成規約

### 共通
- 成人・高齢者向けの自然な日本語。幼児語・キャラクター・流行語・方言・固有の商品名・実在人物名を使わない。
- 不安を与える話題（死・重病・事故・災害の詳細）、政治・宗教、特定地域に偏る話題を避ける。
- **省略禁止**：`// 以下同様`、`...`、ループでのダミー生成、プレースホルダ（`'TODO'` 等）は一切禁止。すべて手書きの実データとする。
- ID は連番・ゼロ埋め（`kitchen-001`）。並び順は ID 順。データ配列は `as const satisfies readonly X[]` ではなく `export const X: readonly X[] = [...]` で定義（型エラーを明確にするため）。

### 語彙（`VocabEntry`）
- 1 カテゴリ 20 語以上、全 240 語以上。`kana` は全語彙で **一意**（同音異義語は片方のみ収録：例「はし」は箸だけ）。
- 外来語は `kana` をカタカナ（`テレビ`）、`kanji` も `テレビ`。和語・漢語は `kana` をひらがな。
- `kanaLength = Array.from(kana).length`。2〜6 文字の語を中心にし、3〜5 文字の語を各カテゴリ 12 語以上含める（アナグラム用）。
- `hint` は 8〜25 文字の説明文で、答えの語そのもの・その一部の仮名を含めない。
- 他カテゴリにも属しうる語は `alsoCategories` に列挙（例：トマト `food` → `['plant']`、包丁 `kitchen` → なし）。

### 読解コーパス（`Passage`）
- 18 編（各テーマ 3 編）。`kanaText` はひらがな・「ー」・「、」・「。」・半角スペースのみ。スペース除去後 180〜300 字。
- 内容確認問題は本文だけで答えられ、常識だけでは答えられないものにする。3 択の誤答は本文に出てくる別の語を使うなど、もっともらしくする。正解位置（answerIndex）は 18 編全体で 0/1/2 が偏らないようにする。
- 問題文・選択肢は漢字かな交じりでよい（本文のみひらがな）。

### 短文
- 助詞：`before + answer + after` で自然な一文になること。`acceptable` は文法・意味的に同等に自然な代替のみ（に⇔へ 等）。`distractors` は明確に不自然になる助詞。
- 正誤判定：`isValid=false` の文は「主語と述語の意味的矛盾」が明確なもの（例：「冷蔵庫で魚を焼きました。」）。文法の誤りではなく意味の誤りに限る。各タスクで valid / invalid を同数。

### 買い物
- 72 品目以上。2026 年頃の一般的なスーパーの税込価格帯（10〜1500 円）。`price % 10 === 0` の品目を 30% 以上、偶数価格の品目を 50% 以上含める（割引問題用）。

### スケジュール
- 用事 30 件以上（`kind`：errand 24 以上、meal 2 以上、appointment 4 以上）。営業時間は現実的な値を 30 分単位で。`durationsMin` は 30 の倍数。順序ペア 12 件以上は常識的に理由が説明できるもの。
- カレンダーイベント 20 件以上。`shortLabel` は全角 4 文字以内。

### 服薬
- 24 件以上。`fictionalName` は実在の医薬品名・商標と一致しない造語（カタカナ 4〜6 字）。効能は一般の人が理解できる平易な言葉（「血圧の薬」「胃を守る薬」）。睡眠関連は `timingPatterns=[['bedtime']]` など臨床的に自然な組み合わせのみ。

---

## §11 コーディング規約・禁止事項・テスト基準

### §11.1 禁止事項
- `Math.random()`、`Date.now()`、`new Date()`（※ `Date.UTC` による曜日計算、presets の時刻記録、UI の自動採番は可）を `logic.ts` / `render.ts` / `utils/*`（prng の generateNumericSeed を除く）で使わない。
- 生成系で `document` / `window` を参照しない（`render.ts` は文字列のみ返す）。
- `schema.ts` / `prng.ts` の編集。
- 外部ライブラリの追加（devDependencies を含む）。必要なら作業を止めて報告。
- `any` の使用（`unknown` を使い型ガードする）。
- 再帰による迷路生成・探索（スタックオーバーフロー防止）。

### §11.2 文字列生成の規約
- テキストは必ず `esc()`（`utils/html.ts`）を通す。`&<>"'` をエスケープ。
- SVG の数値は `fmt(n)`（小数 2 桁で丸め、末尾の 0 を除去、`-0` は `0`）で出力し、文字列の決定性を保証する。
- SVG ルート：`<svg xmlns="http://www.w3.org/2000/svg" width="186mm" height="237mm" viewBox="0 0 186 237" font-family="…">`（`svgRoot(body, inner)` ヘルパー）。※ `xmlns` の URL は名前空間識別子であり通信は発生しない。
- 色は `TYPOGRAPHY.inkColor` / `subInkColor` / `ANSWER_STYLE.color` 以外を使わない（M10 硬貨の淡灰 `#D9D9D9`・灰 `#BFBFBF` は例外として許可）。

### §11.3 テスト基準（各モジュールの `logic.test.ts` に必須）
1. **決定性**：同じ `(seed, sheetIndex, params)` で `generate` を 2 回呼び、`JSON.stringify` が完全一致。
2. **多様性**：seed 1 と seed 2 で結果が異なる。
3. **不変条件**：モジュール固有（例：M01 象限ごとのターゲット数が等しい／M04 正解数 = `countTargets`／M11B `verifyPlan` 全 ok／M09 経路が start→goal で隣接セルのみ）。
4. **境界値**：全 int パラメータの min・max、全 select 値で seed 1〜20 を回して例外が出ない。
5. テスト用 `GenerateContext` は `src/core/testing.ts`（Task 09 で作成）の `makeTestContext(moduleId, seed, sheetIndex, orientation)` を使う。

### §11.4 完了確認コマンド（全タスク共通の最低ライン）
```
npx tsc --noEmit && npx vitest run
```
タスク固有のテストファイル指定は TASKS.md に記載。

---

## §12 単一 HTML 配布（file:// 起動）

- `vite.config.ts` で `mode === 'single'` のとき `vite-plugin-singlefile` を有効化し、JS・CSS をすべて `dist/index.html` にインライン化する（`build.assetsInlineLimit = 100000000`、`build.cssCodeSplit = false`）。
- 同時に `transformIndexHtml` プラグインで以下の CSP を `<head>` 先頭に注入し、**外部通信を技術的に遮断** する：
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'`
- `scripts/verify-single.mjs`：`dist/` にファイルが `index.html` だけであること、`<script src=` / `<link rel="stylesheet"` / `http://`・`https://`（`xmlns` の SVG/XHTML 名前空間 URL を除く）が無いこと、CSP meta があること、サイズ < 3MB を検査し、違反があれば exit 1。
- localStorage は file:// でも Chrome / Edge で動作する（オリジンは file 全体で共有）。Firefox ではファイルパス単位になるため、配布手順書でプリセットの JSON エクスポート/インポート（Task 80）を案内する。
- 院内 PC 配布手順は `DISTRIBUTION.md`（Task 79）に記載：`dist/index.html` を任意フォルダへコピー → ダブルクリック → Chrome/Edge で開く → 印刷設定（§3.7）。
