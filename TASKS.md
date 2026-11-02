# TASKS.md — リハプリント自動生成 Web アプリ 細分化実装タスクリスト

> **実装担当（Flash モデル）への絶対ルール**
> 1. **1タスクずつ順番に消化すること**。複数タスクをまとめて実装してはならない。タスク完了ごとにチェックボックスを `- [x]` に更新し、完了確認コマンドが 0 エラーで通ることを確認すること。
> 2. **契約ファイルの変更禁止**：`src/types/schema.ts`・`src/utils/prng.ts`・`src/types/schema.test.ts`・`src/utils/prng.test.ts` は一切編集してはならない。モジュール固有の内部型が必要な場合は各モジュールの `logic.ts` 内でローカル定義すること。
> 3. **省略の全面禁止**：マスターデータやコードで `// 以下同様`、`// TODO`、`...`、ループによるダミーデータ生成を行った場合は **タスク未完了（不合格）** とみなす。すべてのエントリを手書きの実データとして規定件数以上収録すること。
> 4. **純粋関数・決定性の厳守**：生成系（`logic.ts` / `render.ts` / `utils/*`）では `Math.random()`・`Date.now()`・DOM 計測（`document` / `window`）を一切使用せず、必ず `ctx.rng`（および `ctx.draw`）のみを使用すること。
> 5. **契約変更リクエスト書式**：万一 `schema.ts` に致命的な不整合を発見した場合は勝手に編集せず、作業を停止して以下の書式でユーザーへ報告すること：
>    - 対象タスク番号 / 該当シンボル名 / 問題の原因 / 他モジュールへの影響範囲 / 最小修正案

---

## Phase 0：共通ユーティリティ・コア・印刷・UI 基盤（Task 01 〜 Task 20）

### - [x] Task 01: HTML / SVG 文字列ビルダとエスケープ処理の実装
- **対象ファイルパス**:
  - `src/utils/html.ts`（新規）
  - `src/utils/svg.ts`（新規）
  - `src/utils/svg.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `BodyBox`, `TYPOGRAPHY`
  - `ARCHITECTURE.md`: §0（単位・フォント）、§11.2（文字列生成の規約）
- **具体的な実装要件**:
  - `src/utils/html.ts`:
    - `esc(str: string): string`: `&`, `<`, `>`, `"`, `'` をそれぞれ `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;` に置換する。
    - `fmt(n: number): string`: 小数第2位で四捨五入（`Math.round(n * 100) / 100`）し、末尾の不要な `0` と `.` を除去した文字列を返す。`-0` は `'0'` とする。非有限数は例外を投げる。
    - `mm(n: number): string`: `${fmt(n)}mm` を返す。
    - `attrs(map: Readonly<Record<string, string | number | boolean | undefined>>): string`: `undefined` と `false` を除外し、`true` は属性名のみ、数値は `fmt(v)`、文字列は `esc(v)` で `key="val"` 形式に連結する。
  - `src/utils/svg.ts`:
    - `svgRoot(body: BodyBox, inner: string, extraAttrs?: Readonly<Record<string, string | number>>): string`: `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(body.widthMm)}mm" height="${fmt(body.heightMm)}mm" viewBox="0 0 ${fmt(body.widthMm)} ${fmt(body.heightMm)}" font-family="${esc(TYPOGRAPHY.fontFamily)}">${inner}</svg>` を生成する。
    - 基本図形ヘルパー `svgLine`, `svgRect`, `svgCircle`, `svgText`, `svgPath`, `svgGroup` を実装する。座標・寸法はすべて `fmt()` を通し、テキスト内容は必ず `esc()` を通すこと。
  - `src/utils/svg.test.ts`: `esc`（特殊文字5種）、`fmt`（`-0`, `12.300`, `12.345`）、`svgRoot`、`svgText` の単体テストを記述する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/svg.test.ts`

### - [x] Task 02: 日本語仮名分類・清音/濁音/半濁音/小書き文字の厳密判定ユーティリティ
- **対象ファイルパス**:
  - `src/utils/kana.ts`（新規）
  - `src/utils/kana.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `HIRAGANA_SEION`, `HIRAGANA_DAKUON`, `HIRAGANA_HANDAKUON`, `HIRAGANA_SMALL_TO_BASE`, `KanaInfo`, `KanaMatchOptions`, `KanaScript`, `KanaVoicing`
  - `ARCHITECTURE.md`: §5.4（清音・濁音・半濁音・小書き文字の厳密判定）
- **具体的な実装要件**:
  - `toCodePoints(s: string): string[]`: `Array.from(s.normalize('NFC'))` を返す。
  - `katakanaToHiragana(ch: string): string`: カタカナ（U+30A1〜U+30F6）をコードポイント `- 0x60` でひらがなに変換し、それ以外はそのまま返す。
  - `classifyKana(ch: string): KanaInfo`: `ARCHITECTURE.md` §5.4 の判定順に従い、`char`（NFC正規化後）、`script`、`base`（清音形：が→か、ぱ→は、ぁ→あ、ゔ→う、カタカナ→対応ひらがな清音）、`voicing`、`isSmall` を返す。
  - `isKanaTarget(ch: string, opts: KanaMatchOptions): boolean`: ひらがな清音のみを対象とし、濁音・半濁音は常に `false`（が≠か、ぱ≠は）。`isSmall` が `true` の場合は `opts.includeSmall` が `true` かつ `opts.targets`（NFC正規化済み）に `info.base` が含まれるときのみ `true`。
  - `countTargets(chars: readonly string[], opts: KanaMatchOptions): number`: `chars` 内で `isKanaTarget` が `true` となる要素数を返す。
  - `dakuonVariantsOf(seion: string): string[]`: 指定した清音1文字に対応する濁音・半濁音配列を返す（例：`'か' -> ['が']`, `'は' -> ['ば', 'ぱ']`, `'う' -> []`（※ `'ゔ'` は返さない）, `'あ' -> []`）。
  - `src/utils/kana.test.ts`: `ARCHITECTURE.md` §5.4 の判定テストケース表の全12ケース（NFD結合文字 `'か\u3099'` を含む）および `dakuonVariantsOf` をすべてテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/kana.test.ts`

### - [x] Task 03: 幾何計算・象限/3列集計ユーティリティの実装
- **対象ファイルパス**:
  - `src/utils/geometry.ts`（新規）
  - `src/utils/geometry.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `BodyBox`, `Quadrant`, `QUADRANT_ORDER`, `Column3`, `RegionCount`, `QuadrantStats`, `ColumnStats`
  - `ARCHITECTURE.md`: §5.1、§6
- **具体的な実装要件**:
  - `Rect` 型（`{ readonly x: number; readonly y: number; readonly w: number; readonly h: number }`）および `Point` 型（`{ readonly x: number; readonly y: number }`）を定義・export する。
  - `dist(a: Point, b: Point): number`: `Math.hypot(a.x - b.x, a.y - b.y)`。
  - `quadrantOf(p: Point, area: Rect): Quadrant`: `p.x < area.x + area.w / 2` なら左、それ以外は右（中線上は右）。`p.y < area.y + area.h / 2` なら上、それ以外は下（中線上は下）。
  - `column3Of(p: Point, area: Rect): Column3`: `area` を横3等分し、`left` / `center` / `right` を返す。
  - `splitQuadrants(area: Rect): Readonly<Record<Quadrant, Rect>>`: `area` を4分割した `Rect` を返す。
  - `computeQuadrantStats(items: readonly { readonly x: number; readonly y: number; readonly isTarget: boolean; readonly isPractice?: boolean }[], area: Rect): QuadrantStats`: `isPractice: true` を除外し、各象限の `{ targets, total }` を集計して返す。
  - `computeColumnStats(items: readonly { readonly x: number; readonly y: number; readonly isTarget: boolean; readonly isPractice?: boolean }[], area: Rect): ColumnStats`: 同様に左・中・右の `{ targets, total }` を集計して返す。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/geometry.test.ts`

### - [x] Task 04: 4象限層化サンプリング・最小距離配置・グリッド配置アルゴリズムの実装
- **対象ファイルパス**:
  - `src/utils/placement.ts`（新規）
  - `src/utils/placement.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Quadrant`, `QUADRANT_ORDER`
  - `src/utils/prng.ts`: `Rng`
  - `ARCHITECTURE.md`: §5.1（4象限の層化サンプリングと衝突判定の打ち切り）
- **具体的な実装要件**:
  - 定数 `PLACEMENT_BASE_ATTEMPTS = 2000`, `PLACEMENT_ATTEMPTS_PER_ITEM = 20`, `PLACEMENT_HARD_CAP = 20000`, `PLACEMENT_PER_ITEM_CAP = 30`, `PACKING_DENSITY_LIMIT = 0.55` を export する。
  - `placeStratified(rng: Rng, area: Rect, perQuadrant: number, itemDiameter: number, minGap: number): StratifiedResult`: `ARCHITECTURE.md` §5.1(a) の擬似コード通りに実装する。事前容量チェック、ラウンドロビン配置、打ち切り時の最小象限数への切り詰め（4象限同数の保証）を行う。
  - `placeUniform(rng: Rng, area: Rect, count: number, itemDiameter: number, minGap: number, existing?: readonly { x: number; y: number; r?: number }[]): { points: Placed[]; truncated: boolean; attempts: number }`: `ARCHITECTURE.md` §5.1(b) に従い領域全体で最小距離を保って配置する。`existing` が渡された場合は既存点との距離（`existing.r` があれば半径考慮）も保つ（M02 の開始・終了ノード先行配置用）。
  - `gridLayout(area: Rect, total: number, cellMin: number, balance: boolean): { points: Placed[]; rows: number; cols: number; rounded: boolean }`: `ARCHITECTURE.md` §5.1(c) に従いグリッド配置座標を計算する。`balance=true` のときは `rows`・`cols` とも偶数に限定し、4象限に同数のセルが配分されることを保証する。
  - `src/utils/placement.test.ts`: 4象限の配置数が常に同数であること、全点間距離が `itemDiameter + minGap` 以上であること、過密条件でも `PLACEMENT_HARD_CAP` 以内に必ず終了し `truncated: true` になることをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/placement.test.ts`

### - [x] Task 05: Crockford's Base32 エンコーダ／デコーダおよびビットストリームの実装
- **対象ファイルパス**:
  - `src/utils/base32.ts`（新規）
  - `src/utils/base32.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `CROCKFORD_ALPHABET`, `COND_GROUP_LENGTH`
  - `ARCHITECTURE.md`: §4.2, §4.3
- **具体的な実装要件**:
  - `bitWidth(maxIndex: number): number`: `maxIndex <= 0 ? 0 : Math.floor(Math.log2(maxIndex)) + 1` を返す。
  - `BitWriter` クラス: `write(value: number, bits: number): void`（MSBファーストでビット追加）、`toCrockford(): string`（5bit単位で `CROCKFORD_ALPHABET` 文字に変換、端数ビットは下位を0埋め）。
  - `BitReader` クラス: `fromCrockford(chars: string): BitReader | null`（大文字化・`O->0`, `I->1`, `L->1` 正規化後、`CROCKFORD_ALPHABET` 外の文字があれば `null`）、`remainingBits: number`、`read(bits: number): number`。
  - `groupByHyphen(str: string, groupLen = COND_GROUP_LENGTH): string`: 4文字ごとに `-` で区切る。
  - `src/utils/base32.test.ts`: `bitWidth`（0, 1, 2, 3, 4, 7, 8, 31, 45）、`BitWriter` / `BitReader` の往復一致、誤読文字 `o/O/i/I/l/L` の吸収、不正文字 `U` の拒否をテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/base32.test.ts`

### - [x] Task 06: 共通パラメータ定義・デフォルト値生成・バリデーション・表示条件判定の実装
- **対象ファイルパス**:
  - `src/core/params.ts`（新規）
  - `src/core/params.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `AnyParamField`, `AnyTaskModule`, `CommonParams`, `COMMON_PARAM_CODES`, `GenWarning`, `ParamValues`, `ParamValue`
  - `ARCHITECTURE.md`: §4.2, §8（共通パラメータ表）
- **具体的な実装要件**:
  - `COMMON_PARAM_FIELDS: readonly AnyParamField[]`: `textScale`（code 30, int 80..200 step 10, default 100, unit `'%'`, label `'文字倍率'`）と `strokeScale`（code 31, int 100..300 step 25, default 100, unit `'%'`, label `'線幅倍率'`）を定義する。
  - `getFullSchema(module: Pick<AnyTaskModule, 'paramSchema'>): readonly AnyParamField[]`: `[...module.paramSchema, ...COMMON_PARAM_FIELDS]` を返す。
  - `getDefaultParams(module: Pick<AnyTaskModule, 'paramSchema'>): ParamValues`: 全フィールド（CommonParams含む）の既定値オブジェクトを返す。
  - `valuesEqual(a: ParamValue | undefined, b: ParamValue | undefined): boolean`: プリミティブおよび配列（要素順または集合として比較）の等価判定。
  - `sanitizeParams(module: Pick<AnyTaskModule, 'paramSchema'>, raw: Partial<ParamValues>): { params: ParamValues; warnings: GenWarning[] }`:
    - `int`: 数値変換 → `[min, max]` に clamp → `min + Math.round((v - min) / step) * step` に丸め（再度 clamp）。元の値と異なれば `PARAM_CLAMPED` 警告を追加。
    - `select`: `options` に存在しなければ `default` に戻し `PARAM_CLAMPED`。
    - `bool`: `Boolean(v)`。
    - `multi`: `options` 内の有効値のみを `options` 順に 중복なく並べ、`minSelected` 未満なら `default` に戻し `PARAM_CLAMPED`。
    - `charSet`: NFC正規化後、`alphabet` に含まれる文字のみを重複なく `alphabet` の出現順にソートして最大 `maxCount` 文字まで切り詰め、`minCount` 未満なら `default` に戻す。変化があれば `PARAM_CLAMPED`。
  - `isFieldVisible(field: AnyParamField, params: ParamValues): boolean`: `visibleWhen` の全条件（AND）を評価する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/core/params.test.ts`

### - [x] Task 07: 条件・シードコード（RP1形式・差分エンコード＆パース）の実装
- **対象ファイルパス**:
  - `src/utils/seedCode.ts`（新規）
  - `src/utils/seedCode.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `SEED_CODE_VERSION`, `CROCKFORD_ALPHABET`, `MODULE_IDS`, `ParsedSeedCode`, `SeedCodeParseResult`, `AnyTaskModule`, `ParamValues`
  - `src/utils/prng.ts`: `deriveSeed`, `UINT32_MAX`
  - `ARCHITECTURE.md`: §4（条件・シードコード仕様）
- **具体的な実装要件**:
  - `encodeSeedCode(module: Pick<AnyTaskModule, 'id' | 'paramSchema'>, seed: number, sheetIndex: number, params: ParamValues): string`:
    - `ARCHITECTURE.md` §4.1〜§4.2 に完全準拠して実装する。
    - 既定値と一致するフィールドは出力しない。全フィールドが既定値かつ `sheetIndex === 1` なら `RP1-M01-482914` のように最短形式で出力する。
    - `sheetIndex >= 2` のときのみシート番号セグメント（1〜3桁）を挿入する。
    - 差分がある場合は `code` 昇順で `BitWriter` に書き込み、`paddedDataChars`（`(len + 1) % 4 === 0` になるまで末尾 `'0'` 埋め）に対し `check = CROCKFORD_ALPHABET[deriveSeed('RP1', module.id, seed >>> 0, sheetIndex, paddedDataChars) % 32]` を付与して4文字区切りで連結する。
  - `parseSeedCode(input: string, getModule: (id: ModuleId) => Pick<AnyTaskModule, 'id' | 'paramSchema'> | undefined): SeedCodeParseResult`:
    - `ARCHITECTURE.md` §4.3 に完全準拠して実装する。全角文字・長音記号・空白の正規化、`O/I/L` 誤読吸収、チェックサム検証、ビットデコードを行い、日本語エラーメッセージを返す。
  - `src/utils/seedCode.test.ts`: 既定値のみ（1枚目・3枚目）、全フィールド種別（int, select, bool, multi, charSet, CommonParams）の往復一致、1文字改変時の `CHECKSUM` エラー、全角ハイフン・小文字・`O/I/L` 入力の正常デコードをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/seedCode.test.ts`

### - [x] Task 08: バッチ横断の非復元抽出プール（`drawFromPool`）の実装
- **対象ファイルパス**:
  - `src/utils/pool.ts`（新規）
  - `src/utils/pool.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `ModuleId`, `WarningCode`
  - `src/utils/prng.ts`: `createPoolRng`
  - `ARCHITECTURE.md`: §5.5（バッチ横断の非復元抽出）
- **具体的な実装要件**:
  - `drawFromPool<T>(args: { seed: number; moduleId: ModuleId; sheetIndex: number; poolKey: string; items: readonly T[]; count: number; warn: (code: WarningCode, msg: string) => void }): T[]`:
    - `ARCHITECTURE.md` §5.5 の擬似コード通りに実装する。
    - `createPoolRng(seed, moduleId, poolKey).shuffle(items)` により、`sheetIndex` や `sheetCount` に依存しない一意のシャッフル列を作る。
    - `(sheetIndex - 1) * count` から `count` 個を切り出す。1枚の中で `count > items.length` の場合は `items.length` に切り詰めて `POOL_EXHAUSTED` を警告する（1枚内での重複は絶対に発生させない）。
    - バッチ累計 `sheetIndex * count > items.length` で末尾を跨いで先頭へラップアラウンドする場合も `POOL_EXHAUSTED` を警告する。
  - `src/utils/pool.test.ts`: 1〜5枚目まで重複ゼロで抽出されること、「10枚中3枚目」と「単独で3枚目（sheetIndex=3）」が完全一致すること、プール枯渇時に `POOL_EXHAUSTED` が呼ばれかつ1枚内重複がないことをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/utils/pool.test.ts`

### - [x] Task 09: テスト用 `GenerateContext` ヘルパー（`makeTestContext`）とモジュールレジストリ骨格の実装
- **対象ファイルパス**:
  - `src/core/testing.ts`（新規）
  - `src/core/registry.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `AnyTaskModule`, `BODY_BOX`, `GenerateContext`, `GenWarning`, `ModuleId`, `Orientation`
  - `src/utils/prng.ts`: `createSheetRng`
  - `src/utils/pool.ts`: `drawFromPool`
  - `ARCHITECTURE.md`: §1, §11.3
- **具体的な実装要件**:
  - `src/core/testing.ts`:
    - `makeTestContext(opts?: { moduleId?: ModuleId; seed?: number; sheetIndex?: number; sheetCount?: number; orientation?: Orientation; seedCode?: string }): { ctx: GenerateContext; warnings: GenWarning[] }` を実装する。
    - 同一 `ctx` 内で同じ `poolKey` が2回 `draw` された場合は Error を投げる（本番 `generator.ts` と同じ契約）。
  - `src/core/registry.ts`:
    - `ALL_MODULES: readonly AnyTaskModule[]`（現時点では空配列または登録済み配列。Phase 1〜4 でモジュールを順次追加）、`getModule(id: ModuleId): AnyTaskModule | undefined`、`getModulesByDomain(domain: DomainId): readonly AnyTaskModule[]`、`registerModuleForTest(m: AnyTaskModule): void` を実装する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 10: バッチ生成オーケストレータ（`runJob`）の実装と単体テスト
- **対象ファイルパス**:
  - `src/core/generator.ts`（新規）
  - `src/core/generator.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `BATCH_MAX`, `BATCH_MIN`, `BODY_BOX`, `JobRequest`, `JobResult`, `RenderedPage`
  - `ARCHITECTURE.md`: §2（データフローと生成パイプライン）
- **具体的な実装要件**:
  - `runJob(req: JobRequest, moduleOverride?: AnyTaskModule): JobResult`:
    - `ARCHITECTURE.md` §2 の擬似コード通りに実装する。
    - `batchCount` を `BATCH_MIN..BATCH_MAX`（1..10）に clamp する。
    - 各シート `s = start .. start + batchCount - 1` について `encodeSeedCode`、`createSheetRng`、`drawFromPool` を束ねた `GenerateContext` を生成し `module.generate(ctx, params)` を呼ぶ。
    - `outputMode === 'problemOnly'` なら `pageRole !== 'answer'` のページのみ出力。`'withAnswer'` の場合は `answerOrder`（`'grouped'` または `'interleaved'`）に従って並べる。
    - 同一 `code + message` の警告は1件に集約し、複数枚で発生した場合はメッセージ末尾に `（1・2枚目）` のようにシート番号を付記する。
  - `src/core/generator.test.ts`: モックモジュールを用いて、`problemOnly` / `withAnswer`（`grouped` / `interleaved`）、`stimulus` + `problem` + `answer` の3ページ構成、警告の集約、`startSheetIndex` 指定時の単独再現性をテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/core/generator.test.ts`

### - [x] Task 11: プリセット保存・呼び出し・削除ストア（`PresetStore`）の実装
- **対象ファイルパス**:
  - `src/core/presets.ts`（新規）
  - `src/core/presets.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Preset`, `PresetStore`, `PRESET_STORAGE_KEY`, `StorageLike`, `ModuleId`, `ParamValues`, `OutputMode`, `AnswerOrder`
- **具体的な実装要件**:
  - `createMemoryStorage(): StorageLike`（テストおよび localStorage 利用不可時のフォールバック用）を実装する。
  - `loadPresets(storage: StorageLike): Preset[]`、`savePreset(storage: StorageLike, input: { name: string; moduleId: ModuleId; params: ParamValues; batchCount?: number; outputMode?: OutputMode; answerOrder?: AnswerOrder; id?: string }): Preset`、`deletePreset(storage: StorageLike, id: string): Preset[]` を実装する。
  - 破損した JSON が入っていた場合は例外を投げず空配列として扱う。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/core/presets.test.ts`

### - [x] Task 12: 解答用紙のハイライト部品・4象限集計表・採点チェックリスト部品の実装
- **対象ファイルパス**:
  - `src/print/answerParts.ts`（新規）
  - `src/print/answerParts.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `ANSWER_STYLE`, `BodyBox`, `ChecklistItem`, `ColumnStats`, `QuadrantStats`, `QUADRANT_LABELS`, `QUADRANT_ORDER`, `TYPOGRAPHY`
  - `ARCHITECTURE.md`: §6（解答用紙のハイライト規則・白黒印刷対応）
- **具体的な実装要件**:
  - `answerCircle(cx: number, cy: number, itemSizeMm: number, strokeScale = 100): string`: 文字色は変えず外周を囲む赤の太線円（`fill="none"`, `stroke="${ANSWER_STYLE.color}"`, `stroke-width="${fmt(ANSWER_STYLE.markStrokeMm * strokeScale / 100)}"`, `r="${fmt(itemSizeMm * ANSWER_STYLE.markRadiusRatio + ANSWER_STYLE.markPaddingMm)}"`）。
  - `answerRect(x: number, y: number, w: number, h: number, strokeScale = 100): string`: 角丸 1mm の赤太枠（`fill="none"`, `stroke="${ANSWER_STYLE.color}"`）。
  - `answerPath(points: readonly { x: number; y: number }[], strokeScale = 100): string`: TMT・迷路用の赤破線太線ポリライン／パス（`stroke="${ANSWER_STYLE.color}"`, `stroke-width="${fmt(ANSWER_STYLE.pathStrokeMm * strokeScale / 100)}"`, `stroke-dasharray="${ANSWER_STYLE.pathDashArray}"`, `fill="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`）。
  - `quadrantGuides(body: BodyBox): string`: 本文の中央十字（`x = widthMm/2`, `y = heightMm/2`）に薄い破線（`stroke="${TYPOGRAPHY.subInkColor}"`, `stroke-width="0.2"`, `stroke-dasharray="2 2"`）と四隅の象限小ラベル（左上・右上・左下・右下）を描く SVG 断片。
  - `formatQuadrantSummary(stats: QuadrantStats): string`: `ARCHITECTURE.md` §6 の2行形式（正解数・検出数記入欄）の文字列を返す。
  - `formatColumnSummary(stats: ColumnStats): string`: 左・中央・右の正解数と検出数記入欄の文字列を返す。
  - `checklistTableHtml(items: readonly ChecklistItem[]): string`: `☐` チェック欄・項目・模範解答・配点を表組にした HTML 断片を返す。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/print/answerParts.test.ts`

### - [x] Task 13: A4 印刷・シート組版 CSS（`print.css`）と動的 `@page` 制御（`pageStyle.ts`）の実装
- **対象ファイルパス**:
  - `src/print/print.css`（新規）
  - `src/print/pageStyle.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Orientation`, `PAGE_GEOMETRY`, `BODY_BOX`, `TYPOGRAPHY`
  - `ARCHITECTURE.md`: §3.2, §3.3, §3.4, §3.5
- **具体的な実装要件**:
  - `src/print/print.css`: `ARCHITECTURE.md` §3.3 の CSS ルール一式に加え、ヘッダー（`.sheet__header`）、教示文帯（`.sheet__instruction`）、フッター（`.sheet__footer`）、および本文内の HTML テーブル・問題枠用の白黒ハイコントラスト組版スタイルを定義する。
  - `src/print/pageStyle.ts`: `setPageOrientation(o: Orientation): void` および `buildPageSizeCss(o: Orientation): string`（`@page { size: A4 ${o}; margin: 0; }`）を実装する。Node 環境（DOM がないテスト時）でも `document` の存在チェックを行い安全に動作させること。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 14: 役割別ヘッダー・フッター・A4 シート HTML 組版（`header.ts`, `sheet.ts`）および `index.html` 骨格の実装
- **対象ファイルパス**:
  - `src/print/header.ts`（新規）
  - `src/print/sheet.ts`（新規）
  - `index.html`（編集）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `CALIBRATION_BAR_MM`, `PAGE_GEOMETRY`, `RenderedPage`, `TYPOGRAPHY`
  - `ARCHITECTURE.md`: §3.1, §3.6
- **具体的な実装要件**:
  - `src/print/header.ts`:
    - `renderHeaderHtml(page: RenderedPage): string`: `page.body.pageRole` に応じて3種類のヘッダーを描画する。
      - `'problem'`: 1行目にタイトル＋副題（任意）と右端に条件・シードコード（`2.6mm`）、2行目に「実施日 ____年__月__日　氏名・ID ____________　所要時間 ____分____秒　メモ・スコア ____________」。
      - `'stimulus'`: 1行目にタイトル＋副題（省略時は `【提示用シート】`）と右端に条件・シードコード。2行目の患者記入欄は出さない。
      - `'answer'`: 1行目にタイトル＋副題（省略時は `【解答・採点シート（検者用）】`）と右端に条件・シードコード、2行目に「検者 ________　得点 ________」。
  - `src/print/sheet.ts`:
    - `renderInstructionHtml(instruction: string | undefined, orientation: Orientation, textScale = 100): string`: 文字数と帯幅からフォントサイズ（最大 `4.2mm * textScale/100`、2行に収まらない場合は `3.2mm` まで縮小）を純粋計算して描画する（DOM計測禁止）。改行 `\n` は `<br />` に変換する。
    - `renderFooterHtml(page: RenderedPage): string`: 左に実寸 `50mm`（`CALIBRATION_BAR_MM`）の校正バー（両端縦目盛り＋`50mm（印刷倍率確認用）`）、右にページ番号 `pageNo / pageTotal`（バッチ枚数 > 1 のときは `（sheetIndex / sheetCount 枚目）` を併記）。
    - `renderSheetHtml(page: RenderedPage, textScale = 100): string`: `<div class="sheet-frame sheet-frame--${page.orientation}"><section class="sheet sheet--${page.orientation}" data-role="${page.body.pageRole}" data-sheet="${page.sheetIndex}">...</section></div>` を組み立てる。
  - `index.html`: `ARCHITECTURE.md` §3.1 の `#app-shell`（`#sidebar`, `#main-pane`, `#toolbar`, `#warnings`, `#preview-viewport`, `#print-root`）骨格を配置する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 15: シート組版・ヘッダー・校正バーの単体テスト
- **対象ファイルパス**:
  - `src/print/sheet.test.ts`（新規）
- **参照する型・仕様**:
  - `src/print/header.ts`, `src/print/sheet.ts`, `src/print/pageStyle.ts`
  - `ARCHITECTURE.md`: §3.1〜§3.6
- **具体的な実装要件**:
  - `problem` / `stimulus` / `answer` の3役割でそれぞれ `renderSheetHtml` を呼び出し、`problem` には「実施日」「氏名・ID」「所要時間」が含まれること、`stimulus` には「氏名・ID」が含まれず「【提示用シート】」が含まれること、`answer` には「【解答・採点シート（検者用）】」が含まれることを検証する。
  - フッターに `50mm` の校正バーが含まれること、シードコードが印字されること、`buildPageSizeCss('landscape')` が `@page { size: A4 landscape; margin: 0; }` を返すことを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/print/sheet.test.ts`

### - [x] Task 16: アプリ状態管理・localStorage 永続化・シードコード連携（`appState.ts`）の実装
- **対象ファイルパス**:
  - `src/ui/appState.ts`（新規）
  - `src/ui/appState.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `AppState`, `APP_STATE_STORAGE_KEY`, `BATCH_MAX`, `BATCH_MIN`, `ModuleId`, `ParamValues`, `StorageLike`
  - `src/utils/prng.ts`: `generateNumericSeed`, `normalizeSeedInput`
  - `src/utils/seedCode.ts`: `parseSeedCode`
  - `ARCHITECTURE.md`: §7（UI仕様）
- **具体的な実装要件**:
  - `AppStore` クラス（またはファクトリ関数）を実装する：
    - 初期状態の構築と `APP_STATE_STORAGE_KEY` からの復元・保存。
    - `selectModule(moduleId)`、`updateParam(key, value)`、`resetCurrentModuleParams()`、`setSeedInput(raw)`、`regenerateSeed()`、`setBatchCount(n)`、`setOutputMode(mode)`、`setAnswerOrder(order)`、`applyPreset(preset)`、`applySeedCode(codeString)`（`parseSeedCode` で復元し、該当モジュール・差分パラメータ・シード・`startSheetIndex`・枚数1を設定）。
    - `toJobRequest(): JobRequest` と変更リスナー `subscribe(fn)` を備える。
  - `src/ui/appState.test.ts`: モジュール切替時のパラメータ保持、シードコード読込による状態復元、localStorage 永続化の単体テストを記述する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/ui/appState.test.ts`

### - [x] Task 17: パラメータフォーム自動生成コンポーネント（`paramForm.ts`）とサイドバー（`sidebar.ts`）の実装
- **対象ファイルパス**:
  - `src/ui/paramForm.ts`（新規）
  - `src/ui/sidebar.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `AnyParamField`, `AnyTaskModule`, `DOMAIN_LABELS`, `DOMAIN_ORDER`
  - `src/core/params.ts`: `COMMON_PARAM_FIELDS`, `isFieldVisible`
  - `ARCHITECTURE.md`: §7
- **具体的な実装要件**:
  - `src/ui/paramForm.ts`:
    - `AnyParamField` の5種別（`int` = range + number 連動、`select` = `<select>`、`bool` = `<input type="checkbox">`、`multi` = チェックボックス群＋「すべて選択」補助ボタン、`charSet` = 対象文字のテキスト入力またはトグルボタン群）を自動生成する。
    - `isFieldVisible` に基づき、非表示条件のフィールドを即座に `hidden` 切り替えする。
    - 下部に共通パラメータ（`textScale`, `strokeScale`）と「この課題を初期設定に戻す」ボタンを配置する。
  - `src/ui/sidebar.ts`:
    - 5領域（`DOMAIN_ORDER` / `DOMAIN_LABELS`）ごとにモジュール選択ボタン群を並べ、選択中モジュールのタイトル・臨床説明文（`description`）・パラメータフォームを描画する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 18: ツールバー（シード・枚数・出力モード・条件コード読込・印刷ボタン）とプリセット管理パネルの実装
- **対象ファイルパス**:
  - `src/ui/toolbar.ts`（新規）
  - `src/ui/presetPanel.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `AnswerOrder`, `OutputMode`, `Preset`
  - `ARCHITECTURE.md`: §3.7（印刷案内文）、§7（UI仕様）
- **具体的な実装要件**:
  - `src/ui/toolbar.ts`:
    - シード入力欄＋「別シードで再生成」ボタン、バッチ枚数（1〜10枚）、出力モード（問題用紙のみ／問題＋解答セット）、解答の並び（問題をまとめて先／1組ずつ交互）、条件・シードコード入力欄＋「コード読込」ボタン（エラー時は理由を赤枠表示）、および「A4印刷（Ctrl+P）」ボタン（`window.print()` 呼び出し）を描画する。
    - `ARCHITECTURE.md` §3.7 の印刷設定案内文を常時表示する。
  - `src/ui/presetPanel.ts`:
    - 現在の設定に名前をつけて保存する入力欄＋「保存」ボタン、保存済みプリセット一覧（クリックで適用・削除ボタンつき）をサイドバー下部に描画する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 19: A4 プレビュー領域（縮小表示・はみ出し検出・警告バナー）と画面 UI CSS（`app.css`）の実装
- **対象ファイルパス**:
  - `src/ui/preview.ts`（新規）
  - `src/ui/app.css`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `GenWarning`, `JobResult`
  - `src/print/sheet.ts`: `renderSheetHtml`
  - `src/print/pageStyle.ts`: `setPageOrientation`
  - `ARCHITECTURE.md`: §3.3, §7
- **具体的な実装要件**:
  - `src/ui/preview.ts`:
    - `JobResult` を受け取り、`setPageOrientation(result.orientation)` を呼び出し、`#print-root` に全ページの `renderSheetHtml` を描画する。
    - ビューポート幅に合わせて `--zoom` CSS変数を自動計算する（手動ズーム倍率 50% / 75% / 100% / 自動フィット切替も可）。
    - 描画直後に各 `.sheet__body` の `scrollHeight > clientHeight + 1 || scrollWidth > clientWidth + 1` を検査し、超過があれば `.sheet` に `.is-overflow` クラスを付与して `OVERFLOW_DETECTED` 警告を追加表示する。
    - `#warnings` に `GenWarning[]` を一覧表示する。
  - `src/ui/app.css`:
    - 臨床現場向けの落ち着いた高視認性 UI（装飾やポップな色を排した白・グレー・濃紺基調）の2ペインレイアウトを定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

### - [x] Task 20: エントリポイント（`src/main.ts`）の配線とアプリ起動統合
- **対象ファイルパス**:
  - `src/main.ts`（編集）
- **参照する型・仕様**:
  - `src/print/print.css`, `src/ui/app.css`, `src/ui/appState.ts`, `src/ui/sidebar.ts`, `src/ui/toolbar.ts`, `src/ui/presetPanel.ts`, `src/ui/preview.ts`, `src/core/generator.ts`
  - `ARCHITECTURE.md`: §1, §2, §7
- **具体的な実装要件**:
  - `print.css` と `app.css` を import し、`DOMContentLoaded`（または即時）で `AppStore`・サイドバー・ツールバー・プリセットパネル・プレビューを初期化する。
  - 状態変更時に `runJob` を実行してプレビューと `@page` スタイルを更新する。登録モジュールがまだ0件の場合でもクラッシュせず案内メッセージを表示できるようにしておく。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

---

## Phase 1：A. 注意・情報処理領域（モジュール 1〜4）（Task 21 〜 Task 37）

### - [x] Task 21: 抹消・符号変換用の幾何学記号マスターデータ（`src/data/symbols.ts`）の作成
- **対象ファイルパス**:
  - `src/data/symbols.ts`（新規）
  - `src/data/symbols.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `SymbolDef`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §9（M01, M03）
- **具体的な実装要件**:
  - `SYMBOLS: readonly SymbolDef[]` を定義する。`viewBox="0 0 10 10"` 内の明瞭な幾何学図形パスとして、`usage: 'both' | 'cancellation' | 'sdmt'` を持つ記号を合計 **15種以上**（うち `cancellation` 利用可能 12種以上、`sdmt` 利用可能 9種以上）収録する。
  - `sdmt` 用の記号は数字（1〜9）や文字（O, X, +）と誤認しにくい幾何学図形（上向き三角、下向き三角、ひし形、五角形、星形、半円、矢印、砂時計型、コの字型など）とすること。
  - `getCancellationSymbols(): readonly SymbolDef[]`、`getSdmtSymbols(): readonly SymbolDef[]` を export する。
  - `src/data/symbols.test.ts`: `DATA_MINIMUMS.cancellationSymbols`（12以上）、`DATA_MINIMUMS.sdmtSymbols`（9以上）、ID重複なし、`path` 空文字なしを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/symbols.test.ts`

### - [x] Task 22: モジュール1（抹消課題）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/attention/m01-cancellation/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M01Params`, `CommonParams`, `GenerateContext`, `QuadrantStats`, `STIMULUS_CHARSETS`
  - `src/utils/placement.ts`: `placeStratified`, `placeUniform`, `gridLayout`
  - `src/utils/geometry.ts`: `computeQuadrantStats`, `quadrantOf`
  - `ARCHITECTURE.md`: §5.1（4象限層化配置・ターゲット割当）、§8（M01パラメータ表）、§9（M01紙面仕様）
- **具体的な実装要件**:
  - 見本帯（`showTargetSample === true` のとき上部 `charSize + 8` mm）を除いた配置領域 `area` を計算する。
  - 刺激プール（`STIMULUS_CHARSETS` または `getCancellationSymbols()`）からターゲット `targetKinds`（1〜3種）を `rng.fork('targets').sample(...)` で選び、残りを妨害刺激とする。
  - `layout === 'scatter'` のとき：
    - `quadrantBalance === true`: `totalStimuli` を4の倍数に丸め（丸めたら `COUNT_ROUNDED` 警告）、`placeStratified` で配置する。打ち切り時は `PLACEMENT_TRUNCATED` を警告する。各象限内でターゲット数が同数（`Math.round(perQuadrant * targetRate / 100)`、複数ターゲット種の場合は各象限で均等配分）になるよう層化サンプリングする。
    - `quadrantBalance === false`: `placeUniform` で配置し、全体からターゲットを割り当てる。
  - `layout === 'grid'` のとき：`gridLayout` でセル中心を求め、同様に `quadrantBalance` に応じて各象限または全体でターゲットを割り当てる。
  - 実配置された全要素から `computeQuadrantStats` で `quadrantStats` を算出して返す。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 23: モジュール1（抹消課題）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/attention/m01-cancellation/render.ts`（新規）
  - `src/modules/attention/m01-cancellation/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M01Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `src/print/answerParts.ts`: `answerCircle`, `formatQuadrantSummary`, `quadrantGuides`
  - `ARCHITECTURE.md`: §6, §8（M01パラメータ表の `code` 1〜9）、§9（M01）
- **具体的な実装要件**:
  - `render.ts`:
    - 問題用紙（`pageRole: 'problem'`）：上部の見本枠（`showTargetSample` 時）と、全刺激（文字または `SymbolDef` の SVG path）を黒で描画する。
    - 解答用紙（`pageRole: 'answer'`）：同一の刺激を **黒のまま** 描画し、ターゲットの外周を `answerCircle`（赤の太線丸）で囲み、`quadrantGuides`（4象限の境界破線）を重ね、教示帯に `formatQuadrantSummary(quadrantStats)` とターゲット一覧を出力する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M01 パラメータ表と `code` 番号（1〜9）・選択肢順序・既定値を 1bit の狂いなく一致させて `m01Module` を export する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 24: モジュール1（抹消課題）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/attention/m01-cancellation/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.1, §11.3（テスト基準）
- **具体的な実装要件**:
  - 決定性テスト（同一シードで2回生成し完全一致）、多様性テスト（異なるシードで異なる結果）。
  - `quadrantBalance: true` のとき、`scatter` / `grid` の両方で4象限（`topLeft`, `topRight`, `bottomLeft`, `bottomRight`）の `targets` 数および `total` 数が完全に同数であることを検証する。
  - 最大文字サイズ `charSizeMm: 14` かつ最大刺激数 `totalStimuli: 320` の過密条件で無限ループせず完了し、`PLACEMENT_TRUNCATED` 警告が出力されることを検証する。
  - 全5種類の `stimulusType`（`hiragana`, `katakana`, `digit`, `latin`, `shape`）で正常に SVG が生成されることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/attention/m01-cancellation/logic.test.ts`

### - [x] Task 25: モジュール2（TMT様課題）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/attention/m02-tmt/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M02Params`, `CommonParams`, `GenerateContext`
  - `src/utils/placement.ts`: `placeUniform`
  - `ARCHITECTURE.md`: §5.1(e)（TMTの配置）、§8（M02）、§9（M02）
- **具体的な実装要件**:
  - ラベル列の生成：
    - Part A: `'1'`, `'2'`, ..., `String(N)`
    - Part B: 数字とひらがな（`'あいうえおかきくけこさしすせそ'`）を交互に `'1'`, `'あ'`, `'2'`, `'い'`, ... と並べる。
  - `practice === true` のとき、本文上部 `38mm` をミニ練習枠（5ノード：Part A は `1→2→3→4→5`、Part B は `1→あ→2→い→3`）として確保し、残りの下部領域に本課題ノードを配置する。
  - 本課題ノード配置：`ARCHITECTURE.md` §5.1(e) に従い、「開始」（ノード1）と「終了」（最終ノード）はラベル分の余白（半径 `+6mm`）を確保して配置し、最小距離 `minGap = Math.max(8, nodeDiameterMm * 0.8)` を保つ。配置打ち切り時は `rng.fork('retry-1')`, `'retry-2'` で最大2回再試行し、それでも不足なら配置できた数（Part B は偶数）に減らして `PLACEMENT_TRUNCATED` を警告する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 26: モジュール2（TMT様課題）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/attention/m02-tmt/render.ts`（新規）
  - `src/modules/attention/m02-tmt/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M02Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `src/print/answerParts.ts`: `answerPath`
  - `ARCHITECTURE.md`: §6（線系ハイライト規則）、§8（M02 `code` 1〜5）、§9（M02）
- **具体的な実装要件**:
  - `render.ts`:
    - 問題用紙：練習枠（`practice` 時、1→2 は薄い誘導破線つき）と本課題枠を描画する。各ノードは白塗り・黒縁の円＋中央テキスト。先頭ノード直下に「開始」、最終ノード直下に「終了」の小ラベルを付与する。
    - 解答用紙：正解経路 `answerPath`（赤＋破線＋太線）を **ノード円の下層（背面）** に描画し、ノードの文字が線で潰れないようにする。教示帯に正解の結線順序を記載する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M02 パラメータ表（`code` 1〜5）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 27: モジュール2（TMT様課題）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/attention/m02-tmt/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.1(e), §11.3
- **具体的な実装要件**:
  - Part A / Part B のラベル順序テスト、全ノード間の中心距離が直径＋最小間隔以上であることの検証、過密条件（`nodeCount: 30`, `nodeDiameterMm: 16`, `portrait`）での打ち切り安全性テスト、解答用紙に赤破線（`stroke-dasharray`）が含まれることの検証を実装する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/attention/m02-tmt/logic.test.ts`

### - [x] Task 28: モジュール3（符号変換課題・SDMT様）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/attention/m03-symbol-digit/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M03Params`, `CommonParams`, `GenerateContext`, `SymbolDef`
  - `src/data/symbols.ts`: `getSdmtSymbols`
  - `ARCHITECTURE.md`: §8（M03）、§9（M03）
- **具体的な実装要件**:
  - `getSdmtSymbols()` から `pairCount`（6〜9種）個の記号を選び、数字 `1..pairCount` との対応表を作る（`shuffleMapping === true` なら記号順をシャッフル、`false` なら固定順）。
  - 問題グリッド `rows × cols` の各セルに記号を割り当てる。このとき **横方向に隣接するセルで同じ記号が2連続しない** ようにし、かつ各記号の出現回数が極端に偏らないよう（各記号の出現回数差が最大2以内）調整する。
  - 先頭 `practiceCells` 個のセルには `isPractice: true` フラグを付与する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 29: モジュール3（符号変換課題・SDMT様）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/attention/m03-symbol-digit/render.ts`（新規）
  - `src/modules/attention/m03-symbol-digit/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M03Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `ARCHITECTURE.md`: §8（M03 `code` 1〜5）、§9（M03）
- **具体的な実装要件**:
  - `render.ts`:
    - 本文上部に対応キー表（上段：記号 SVG、下段：数字 `1..pairCount`）を太枠で中央配置する。
    - 下部に `rows` 行 × `cols` 列の2段グリッド（上段：記号、下段：数字記入用の空欄）を描画する。
    - 先頭 `practiceCells` マスは外枠を太線にし、上部に「練習」ラベルを表示する。
    - 解答用紙では下段に正答数字を黒太字で表示し、教示帯に「練習を除く本課題マス数（`rows * cols - practiceCells`）」を明記する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M03 パラメータ表（`code` 1〜5）通りに定義する。`orientation` は常に `'portrait'`。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 30: モジュール3（符号変換課題・SDMT様）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/attention/m03-symbol-digit/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §9（M03）, §11.3
- **具体的な実装要件**:
  - 決定性・多様性テスト、隣接セルで同一記号が連続しないことの検証、各記号の出現頻度バランス検証、`pairCount`（6〜9）・`rows`（3〜10）・`cols`（8〜16）・`practiceCells`（0〜12）の境界値テストを実装する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/attention/m03-symbol-digit/logic.test.ts`

### - [x] Task 31: 読解コーパスデータ作成（1/3）：季節の話題（`season` 3編）・生活の知恵（`lifeTips` 3編）計6編
- **対象ファイルパス**:
  - `src/data/passages/passages-1.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Passage`, `ComprehensionQuestion`
  - `ARCHITECTURE.md`: §10（読解コーパス作成規約）
- **具体的な実装要件**:
  - `PASSAGES_1: readonly Passage[]` として、ID `pa-001`〜`pa-003`（`theme: 'season'`）および `pa-004`〜`pa-006`（`theme: 'lifeTips'`）の **計6編** を収録する（省略厳禁）。
  - 各 `kanaText` は成人・高齢者向けの落ち着いた自然な文章とし、**使用可能文字はひらがな（U+3041〜U+3096）・長音「ー」・読点「、」・句点「。」・半角スペースのみ**（漢字・カタカナ・数字・英字・括弧は不可）。
  - 文節間は半角スペース1個で分かち書きし、**半角スペースを除いた文字数を 180〜300 文字** とする。
  - 各編に内容確認3択問題（`questions`）をちょうど3問ずつ付与する。本文を読まなければ答えられない内容（登場した具体的な物・場所・行動・理由など）とし、`answerIndex`（0, 1, 2）が偏らないようにする。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 32: 読解コーパスデータ作成（2/3）：日常エピソード（`episode` 3編）・食と料理（`food` 3編）計6編
- **対象ファイルパス**:
  - `src/data/passages/passages-2.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Passage`
  - `ARCHITECTURE.md`: §10（読解コーパス作成規約）
- **具体的な実装要件**:
  - `PASSAGES_2: readonly Passage[]` として、ID `pa-007`〜`pa-009`（`theme: 'episode'`）および `pa-010`〜`pa-012`（`theme: 'food'`）の **計6編** を収録する（省略厳禁）。
  - Task 31 と同じく、`kanaText` の文字種制限（ひらがな・ー・、・。・半角スペースのみ）、スペース除外文字数 **180〜300 文字**、内容確認3択問題×3問を厳守する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 33: 読解コーパスデータ作成（3/3）：健康と運動（`health` 3編）・地域の暮らし（`local` 3編）計6編と全18編統合テスト
- **対象ファイルパス**:
  - `src/data/passages/passages-3.ts`（新規）
  - `src/data/passages/index.ts`（新規）
  - `src/data/passages/passages.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Passage`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §10（読解コーパス作成規約）
- **具体的な実装要件**:
  - `src/data/passages/passages-3.ts`: `PASSAGES_3: readonly Passage[]` として、ID `pa-013`〜`pa-015`（`theme: 'health'`）および `pa-016`〜`pa-018`（`theme: 'local'`）の **計6編** を収録する。
  - `src/data/passages/index.ts`: `PASSAGES = [...PASSAGES_1, ...PASSAGES_2, ...PASSAGES_3]`（全18編）を export する。
  - `src/data/passages/passages.test.ts`:
    - 総数が `DATA_MINIMUMS.passages`（18編）以上であること、ID `pa-001`〜`pa-018` が一意であること。
    - 全編の `kanaText` が `/^[ぁ-ゖー、。 ]+$/` にマッチし、連続スペースがなく、スペースを除いた文字数が 180〜300 文字の範囲内であること。
    - 全編の `questions` が3問あり、各問の3選択肢が互いに異なることをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/passages/passages.test.ts`

### - [x] Task 34: モジュール4（仮名拾い・二重課題）行折り返し・禁則処理レイアウト（`layout.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/attention/m04-kana-pickup/layout.ts`（新規）
  - `src/modules/attention/m04-kana-pickup/layout.test.ts`（新規）
- **参照する型・仕様**:
  - `src/utils/kana.ts`: `toCodePoints`, `classifyKana`
  - `ARCHITECTURE.md`: §5.4（ベタ組み／分かち書き・行頭禁則）、§9（M04）
- **具体的な実装要件**:
  - `formatPassageLines(kanaText: string, spacing: 'solid' | 'wakachi', maxColsPerLine: number): { chars: { ch: string; colOffset: number }[] }[]` を実装する：
    - `spacing === 'solid'` のときは半角スペースを除去した文字列を行あたり `maxColsPerLine` マスで折り返す。
    - `spacing === 'wakachi'` のときは半角スペースを `0.5` マス幅の空白（文字要素としては出力せず次の文字の `colOffset` を `+0.5` 進める）として扱い、文節の途中で改行しないことを優先する（1文節が `maxColsPerLine` を超える場合のみ途中で折る）。
    - **行頭禁則処理**：「、」「。」「ー」および小書き文字（`classifyKana(ch).isSmall`）が行頭に来る場合は、直前の行末にぶら下げる（最大1文字分 `maxColsPerLine` を超えてよい）。
  - `src/modules/attention/m04-kana-pickup/layout.test.ts`: ベタ組み・分かち書きの両方で、どの行の先頭文字も「、」「。」「ー」や小書き文字（っ・ゃ・ゅ・ょ等）にならないこと、文字欠落がないことを全18編の `PASSAGES` で検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/attention/m04-kana-pickup/layout.test.ts`

### - [x] Task 35: モジュール4（仮名拾い・二重課題）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/attention/m04-kana-pickup/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M04Params`, `CommonParams`, `GenerateContext`, `HIRAGANA_SEION`, `VOWEL_TARGETS`
  - `src/utils/kana.ts`: `isKanaTarget`, `dakuonVariantsOf`
  - `src/data/passages/index.ts`: `PASSAGES`
  - `ARCHITECTURE.md`: §5.4, §8（M04）、§9（M04）
- **具体的な実装要件**:
  - ターゲット文字列の決定：`targetPreset === 'vowels'` なら `VOWEL_TARGETS`（`'あいうえお'`）、`'custom'` なら `params.customTargets`。
  - **サブモードA（`subMode === 'random'`）**:
    - `rows` 行 × `charsPerRow` 文字のグリッドを生成する。
    - 各行で `targetRate`（%）に応じた個数のターゲット清音を配置する。
    - `dakuonDecoys === true` のとき、ターゲット清音に対応する濁音・半濁音（`dakuonVariantsOf`、例：ターゲットに「か」があれば「が」）を妨害刺激として各行に1〜3個意図的に混入させる（ただしこれらは `isKanaTarget` で `false` となる）。
    - 残りのマスはターゲット以外のひらがな清音（および `includeSmallKana === false` のときは小書き文字を少量混ぜてもよい）で埋める。
  - **サブモードB（`subMode === 'passage'`）**:
    - `ctx.draw('passages', PASSAGES, 1)` で本文1編を非復元抽出する。
    - `formatPassageLines` で行配列に変換し、各文字について `isKanaTarget(ch, { targets, includeSmall: params.includeSmallKana })` で正解フラグと行ごとの正解数・総正解数を算出する。
    - 内容確認問題は `passage.questions.slice(0, params.questionCount)` を抽出し、選択肢の並び順を `rng.fork('q-choices')` でシャッフルして正解インデックスを更新する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 36: モジュール4（仮名拾い・二重課題）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/attention/m04-kana-pickup/render.ts`（新規）
  - `src/modules/attention/m04-kana-pickup/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M04Params`, `ParamSchema`, `TaskModule`, `defineModule`, `HIRAGANA_SEION`
  - `src/print/answerParts.ts`: `answerCircle`
  - `ARCHITECTURE.md`: §6, §8（M04 `code` 1〜12）、§9（M04）
- **具体的な実装要件**:
  - `render.ts`:
    - 仮名本文領域を SVG の文字グリッドとして描画する（1文字ずつ座標指定）。
    - `subMode === 'passage'` のとき：
      - `questionPlacement === 'samePage'` なら本文下部に内容確認問題（2〜3問、①②③の3択）を同一ページ内に配置する。文字サイズが大きすぎて1ページに収まらない場合は、(1) 文字サイズ・行間を自動縮小して `LAYOUT_SCALED` 警告を出すか、(2) 確認問題を次ページ（2ページ目 `pageRole: 'problem', subLabel: '【内容確認問題】'`）へ自動で送り `LAYOUT_SCALED` 警告を出す。
      - `questionPlacement === 'nextPage'` なら最初から2ページ目に出力する。
    - 解答用紙：すべての文字を **黒のまま** 描き、正解文字の外周を `answerCircle`（赤の太線丸）で囲み、各行の右端にその行の正解数（例：`(3)`）、教示帯に総正解数と内容確認問題の正答番号を明記する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M04 パラメータ表（`code` 1〜12）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 37: モジュール4 単体テストと A.注意領域（M01〜M04）レジストリ統合
- **対象ファイルパス**:
  - `src/modules/attention/m04-kana-pickup/logic.test.ts`（新規）
  - `src/core/registry.ts`（編集）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.4, §11.3
- **具体的な実装要件**:
  - `logic.test.ts`:
    - `random` / `passage` 両モードの決定性・多様性テスト。
    - `dakuonDecoys: true` でターゲットを `'か'` にした際、生成された文字列に `'が'` が含まれ、かつ `'が'` が絶対に正解（`isTarget: true`）としてカウントされていないことを検証する。
    - `includeSmallKana: false` と `true` で小書き文字の正解判定が切り替わること、`spacing: 'solid'` と `'wakachi'` の両方で正解文字総数が一致することを検証する。
  - `src/core/registry.ts`: `m01Module`, `m02Module`, `m03Module`, `m04Module` を `ALL_MODULES` に登録する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

---

## Phase 2：B. 視空間認知・USN 領域 ＆ C. ワーキングメモリ領域（モジュール 5〜7）（Task 38 〜 Task 46）

### - [x] Task 38: モジュール5（線分抹消・線分二等分）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m05-lines/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M05Params`, `CommonParams`, `GenerateContext`, `QuadrantStats`, `ColumnStats`
  - `src/utils/geometry.ts`: `computeQuadrantStats`, `computeColumnStats`
  - `ARCHITECTURE.md`: §5.2（線分二等分の誤差測定スケール座標計算）、§8（M05）、§9（M05A, M05B）
- **具体的な実装要件**:
  - **サブモードA（`subMode === 'cancellation'`）**:
    - 用紙本文を横3列（左・中・右）× 縦2段（上・下）＝ 6区画に分割し、各区画に `linesPerCell`（2〜6本）ずつランダム角度（`0..π`）の線分（長さ `lineLengthMm`）を互いに重ならないよう（中心間距離 `>= lineLengthMm * 0.85`）配置する。
    - `centerPractice === true` のときは用紙中央付近に練習用の線分4本を `isPractice: true` として配置し（本課題線分は練習線と重ならないようにする）、練習線は集計から除外する。
    - `computeQuadrantStats` と `computeColumnStats` の両方を算出する。
  - **サブモードB（`subMode === 'bisection'`）**:
    - `minLengthMm > maxLengthMm` の場合は値を入れ替えて `PARAM_CLAMPED` を警告する。
    - `ARCHITECTURE.md` §5.2 の計算式に完全準拠して、`bisectCount`（5〜10本）の水平線の長さ `L_i`（5mm刻み丸め＋シャッフル）、左右オフセット `o_i`（左右同数符号＋シャッフル＋用紙端余白5mm内に clamp）、端点 `(x1_i, x2_i)`、真の中点 `m_i = x1_i + L_i / 2`、y座標 `y_i` を算出する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 39: モジュール5（線分抹消・線分二等分）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m05-lines/render.ts`（新規）
  - `src/modules/visuospatial/m05-lines/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M05Params`, `ParamSchema`, `TaskModule`, `defineModule`, `ANSWER_STYLE`
  - `src/print/answerParts.ts`: `answerCircle`, `formatColumnSummary`, `formatQuadrantSummary`, `quadrantGuides`
  - `ARCHITECTURE.md`: §5.2（解答用紙スケール仕様）、§8（M05 `code` 1〜9）、§9（M05A, M05B）
- **具体的な実装要件**:
  - `render.ts`:
    - `cancellation`: 問題用紙は全線分を黒で描画（`centerPractice` 時は中央練習線を薄い点線枠で囲み「練習」と表記）。解答用紙は各線分の中点を `answerCircle` で囲み、区画境界線と `formatColumnSummary`・`formatQuadrantSummary` を出力する。
    - `bisection`: 問題用紙は左端に丸数字（①〜⑩）と水平線のみを描画する（両端に縦の端点マークは付けない）。解答用紙は **問題用紙と完全に同一座標** に水平線を描き、真の中点 `m`（`y-6..y+6` 赤太線）、`m±5`（`y-3..y+3` 赤線）、`m±10`（`y-4.5..y+4.5` 赤線）、`m-10..m+10` の 1mm 刻み補助目盛り、および「左10 左5 中 右5 右10」の小ラベルと各線の長さ `L`・半長 `L/2`・偏位記入欄を描画する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M05 パラメータ表（`code` 1〜9）通りに定義する。`subMode === 'bisection' && Math.max(p.minLengthMm, p.maxLengthMm) > 170` のときは `orientation()` で `'landscape'` を強制し、元の指定が `'portrait'` なら `generate` 内で `ORIENTATION_FORCED` を警告する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 40: モジュール5（線分抹消・線分二等分）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m05-lines/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.2, §11.3
- **具体的な実装要件**:
  - `cancellation` で左・中・右の3列（`columnStats`）のターゲット線分数が同数（`linesPerCell * 2`）であること、練習線が集計に含まれないことを検証する。
  - `bisection` で全線分について `m === (x1 + x2) / 2` であり、スケール目盛り座標が厳密に `m - 10`, `m - 5`, `m`, `m + 5`, `m + 10`（mm）であること、すべての線分が `x1 >= 5` かつ `x2 <= body.widthMm - 5` に収まっていることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/visuospatial/m05-lines/logic.test.ts`

### - [x] Task 41: モジュール6（点つなぎ図形模写・空間記憶マトリクス）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m06-dots-matrix/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M06Params`, `CommonParams`, `GenerateContext`
  - `ARCHITECTURE.md`: §8（M06）、§9（M06A, M06B）
- **具体的な実装要件**:
  - **サブモードA（`subMode === 'dotCopy'`）**:
    - `figureCount`（1〜3個）の図形を生成する。各図形は `dotGrid × dotGrid`（3×3〜6×6）の格子点上で、一筆書きまたは連結した `segmentCount` 本の線分をランダムウォークで選ぶ（`allowDiagonal === false` なら上下左右の隣接点のみ、`true` なら斜め隣接も許可。同じ線分の重複は不可）。
    - 左右対称でなく、かつ左半分・右半分の両方に線分が含まれる図形を優先採用する（USN評価のため）。
  - **サブモードB（`subMode === 'spatialMatrix'`）**:
    - `matrixCount`（1〜6個）の `matrixSize × matrixSize`（3×3〜6×6）マトリクスを生成する。
    - 黒塗りセル数 `filledCells` が `Math.floor(matrixSize * matrixSize / 2)` を超える場合はその上限に clamp して `PARAM_CLAMPED` を警告する。
    - 各マトリクスで `filledCells` 個のセルを非復元抽出で黒塗りに選ぶ。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 42: モジュール6（点つなぎ図形模写・空間記憶マトリクス）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m06-dots-matrix/render.ts`（新規）
  - `src/modules/visuospatial/m06-dots-matrix/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M06Params`, `PageBody`, `ParamSchema`, `TaskModule`, `defineModule`
  - `ARCHITECTURE.md`: §8（M06 `code` 1〜10）、§9（M06A, M06B）
- **具体的な実装要件**:
  - `render.ts`:
    - `dotCopy`:
      - 問題用紙（`pageRole: 'problem'`）：`copyLayout`（`'leftRight'` または `'topBottom'`）に従い、見本ドットグリッド（ドット＋太黒線）と模写用ドットグリッド（ドットのみ）のペアを `figureCount` 組描画する。
      - 解答用紙（`pageRole: 'answer'`）：見本図形（各線分に①..Nの番号つき）と、右（または下）に採点チェック表（総線分数・左半側線分数・右半側線分数・正答本数記入欄）を描画する。
    - `spatialMatrix`:
      - **3ページ構成（`pages: [stimulusPage, problemPage, answerPage]`）** を返す：
        1. `pageRole: 'stimulus'`, `subLabel: '【提示用シート】'`: 黒塗りセルを描画した見本マトリクス群（患者記入欄なし）。
        2. `pageRole: 'problem'`, `subLabel: '【回答シート】'`: 空マスのマトリクス群（患者記入欄あり）。
        3. `pageRole: 'answer'`: 黒塗りセル＋各問の正解セル座標・正答数記入欄。
  - `index.ts`: `ARCHITECTURE.md` §8 の M06 パラメータ表（`code` 1〜10）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 43: モジュール6（点つなぎ図形模写・空間記憶マトリクス）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/visuospatial/m06-dots-matrix/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §9（M06）, §11.3
- **具体的な実装要件**:
  - `dotCopy` で線分数が指定通りで重複線分がないこと、`allowDiagonal: false` のときに斜め線分が一切含まれないことを検証する。
  - `spatialMatrix` で `pages` が `['stimulus', 'problem', 'answer']` の3ページを返し、`runJob` で `outputMode: 'problemOnly'` にしたとき `stimulus` と `problem` の2ページが出力されることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/visuospatial/m06-dots-matrix/logic.test.ts`

### - [x] Task 44: モジュール7（連続計算・紙面N-back）生成ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/memory/m07-serial-nback/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M07Params`, `CommonParams`, `GenerateContext`, `STIMULUS_CHARSETS`
  - `ARCHITECTURE.md`: §8（M07）、§9（M07A, M07B）
- **具体的な実装要件**:
  - **サブモードA（`subMode === 'serialAddition'`）**:
    - `additionRows`（5〜20行）× `additionDigits`（10〜30個）の1桁数字列を生成する。
    - 使用する数字は `3〜9`（簡単すぎる `0, 1, 2` を除外）とし、同じ数字が3回連続しないようにする。
    - 隣り合う数字の和の1の位 `(d[i] + d[i+1]) % 10`（各行 `additionDigits - 1` 個）を正答配列として計算する。
  - **サブモードB（`subMode === 'nBack'`）**:
    - `n = Number(params.nBackLevel)`（1 または 2）。
    - `nBackRows`（3〜10行）× `nBackLength`（10〜20個）の独立した系列を生成する。
    - 各行の判定対象位置 `i = n .. nBackLength - 1`（`nBackLength - n` 箇所）のうち、`Math.round((nBackLength - n) * matchRate / 100)` 箇所（最低1箇所）をランダムに選んで「一致位置（`seq[i] === seq[i - n]`）」とし、それ以外の位置では必ず `seq[i] !== seq[i - n]` となるように刺激文字（`digit` は `0〜9`、その他は `STIMULUS_CHARSETS`）を割り当てる。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 45: モジュール7（連続計算・紙面N-back）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/memory/m07-serial-nback/render.ts`（新規）
  - `src/modules/memory/m07-serial-nback/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M07Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `src/print/answerParts.ts`: `answerCircle`
  - `ARCHITECTURE.md`: §6, §8（M07 `code` 1〜8）、§9（M07A, M07B）
- **具体的な実装要件**:
  - `render.ts`:
    - `serialAddition`: 各行に数字列を並べ、数字と数字の間（やや下段）に1の位を書き込む小枠（または下線）を配置する。行数・桁数に応じて本文領域（186×237mm）に確実に収まるよう文字サイズと行高を計算する。解答用紙では小枠内に正答の1の位を黒太字で描画し、行末に計上欄を設ける。
    - `nBack`: 各行を横並びのマス目として描画し、先頭 `n` マスには斜線または薄枠で「開始」と示す。解答用紙では一致マスの文字を黒のまま `answerCircle`（赤太線丸）で囲み、各行末に正解数と総正解数を表示する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M07 パラメータ表（`code` 1〜8）通りに定義する。`orientation` は常に `'portrait'`。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 46: モジュール7 単体テストと B・C 領域（M05〜M07）レジストリ統合
- **対象ファイルパス**:
  - `src/modules/memory/m07-serial-nback/logic.test.ts`（新規）
  - `src/core/registry.ts`（編集）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §9（M07）, §11.3
- **具体的な実装要件**:
  - `logic.test.ts`:
    - `serialAddition` の全数字が `3..9` であり、正答配列が `(a + b) % 10` と完全一致することを検証する。
    - `nBack`（1-back / 2-back）で、`isMatch` フラグが実際の `seq[i] === seq[i - n]` と100%一致し、一致率が指定通りであることを検証する。
  - `src/core/registry.ts`: `m05Module`, `m06Module`, `m07Module` を `ALL_MODULES` に追加登録する（計7モジュール）。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

---

## Phase 3：D. 失語・言語機能領域マスターデータ＆モジュール 8（Task 47 〜 Task 56）

### - [x] Task 47: 語彙カテゴリ定義（`categories.ts`）と語彙データ Group 1（`furniture`, `kitchen`, `clothing` 計60語以上）の作成
- **対象ファイルパス**:
  - `src/data/vocabulary/categories.ts`（新規）
  - `src/data/vocabulary/group1.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `VocabCategory`, `VocabCategoryId`, `VOCAB_CATEGORY_IDS`, `VocabEntry`
  - `ARCHITECTURE.md`: §10（語彙マスターデータ作成規約）
- **具体的な実装要件**:
  - `src/data/vocabulary/categories.ts`: 全12カテゴリ（`VOCAB_CATEGORY_IDS` の順：`furniture`, `kitchen`, `clothing`, `food`, `stationery`, `vehicle`, `body`, `nature`, `appliance`, `animal`, `plant`, `place`）の `VOCAB_CATEGORIES: readonly VocabCategory[]` と `VOCAB_CATEGORY_MAP: Readonly<Record<VocabCategoryId, VocabCategory>>` を定義する。
  - `src/data/vocabulary/group1.ts`: `VOCAB_GROUP_1: readonly VocabEntry[]` として、以下の3カテゴリを **各20語以上・合計60語以上** 手書きで収録する（省略厳禁）：
    - `furniture`（家具・室内用品：`furniture-001`〜`furniture-020` 以上）
    - `kitchen`（台所用品・食器：`kitchen-001`〜`kitchen-020` 以上）
    - `clothing`（衣類・身につけるもの：`clothing-001`〜`clothing-020` 以上）
  - 各エントリは `kanaLength === Array.from(kana).length` を満たし、各カテゴリに3〜5文字の語を12語以上含めること。`hint` には答えの単語やその一部の仮名を含めないこと。他カテゴリとも重複しうる語には `alsoCategories` を適切に設定すること。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 48: 語彙データ Group 2（`food`, `stationery`, `vehicle` 計60語以上）の作成
- **対象ファイルパス**:
  - `src/data/vocabulary/group2.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `VocabEntry`
  - `ARCHITECTURE.md`: §10（語彙マスターデータ作成規約）
- **具体的な実装要件**:
  - `VOCAB_GROUP_2: readonly VocabEntry[]` として、以下の3カテゴリを **各20語以上・合計60語以上** 手書きで収録する（省略厳禁）：
    - `food`（食材・料理・飲み物：`food-001`〜`food-020` 以上。野菜・果物など `plant` とも解釈できる語には `alsoCategories: ['plant']` を付与）
    - `stationery`（文房具・日用小物：`stationery-001`〜`stationery-020` 以上）
    - `vehicle`（乗り物・交通：`vehicle-001`〜`vehicle-020` 以上）
  - Group 1 の語と `kana` が重複しないこと。各カテゴリに3〜5文字の語を12語以上含めること。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 49: 語彙データ Group 3（`body`, `nature`, `appliance` 計60語以上）の作成
- **対象ファイルパス**:
  - `src/data/vocabulary/group3.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `VocabEntry`
  - `ARCHITECTURE.md`: §10（語彙マスターデータ作成規約）
- **具体的な実装要件**:
  - `VOCAB_GROUP_3: readonly VocabEntry[]` として、以下の3カテゴリを **各20語以上・合計60語以上** 手書きで収録する（省略厳禁）：
    - `body`（身体部位・健康：`body-001`〜`body-020` 以上）
    - `nature`（自然・天気・季節：`nature-001`〜`nature-020` 以上）
    - `appliance`（家電・生活機器：`appliance-001`〜`appliance-020` 以上。台所家電には `alsoCategories: ['kitchen']` を適切に付与）
  - Group 1〜2 の語と `kana` が重複しないこと。各カテゴリに3〜5文字の語を12語以上含めること。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 50: 語彙データ Group 4（`animal`, `plant`, `place` 計60語以上）と全240語統合・整合性テストの作成
- **対象ファイルパス**:
  - `src/data/vocabulary/group4.ts`（新規）
  - `src/data/vocabulary/index.ts`（新規）
  - `src/data/vocabulary/vocabulary.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `VocabEntry`, `DATA_MINIMUMS`, `VOCAB_CATEGORY_IDS`
  - `ARCHITECTURE.md`: §10（語彙マスターデータ作成規約）
- **具体的な実装要件**:
  - `src/data/vocabulary/group4.ts`: `VOCAB_GROUP_4: readonly VocabEntry[]` として、以下の3カテゴリを **各20語以上・合計60語以上** 手書きで収録する（省略厳禁）：
    - `animal`（動物・鳥・魚・虫：`animal-001`〜`animal-020` 以上）
    - `plant`（植物・花・木：`plant-001`〜`plant-020` 以上）
    - `place`（場所・建物・施設：`place-001`〜`place-020` 以上）
  - `src/data/vocabulary/index.ts`: `VOCABULARY: readonly VocabEntry[] = [...VOCAB_GROUP_1, ...VOCAB_GROUP_2, ...VOCAB_GROUP_3, ...VOCAB_GROUP_4]` および `VOCAB_CATEGORIES`, `VOCAB_CATEGORY_MAP` を再 export する。
  - `src/data/vocabulary/vocabulary.test.ts`:
    - 総語数が `DATA_MINIMUMS.vocabulary`（240語）以上であり、全12カテゴリそれぞれが `DATA_MINIMUMS.vocabPerCategory`（20語）以上かつ3〜5文字の語を12語以上持つこと。
    - 全エントリの `id` と `kana` が全240語の中で完全に一意（重複ゼロ）であること。
    - 全エントリの `kanaLength === Array.from(kana.normalize('NFC')).length` が成り立つこと。
    - `hint` が空でなく、`hint` の中に答えの `kanji` や3文字以上の `kana` がそのまま含まれていないことをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/vocabulary/vocabulary.test.ts`

### - [x] Task 51: 短文データ（助詞補充 `particle.ts`：60文以上）の作成
- **対象ファイルパス**:
  - `src/data/sentences/particle.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `ParticleSentence`, `Particle`, `PARTICLES`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §10（短文作成規約）
- **具体的な実装要件**:
  - `PARTICLE_SENTENCES: readonly ParticleSentence[]` として、ID `ps-001`〜`ps-060` 以上の **計60文以上** を手書きで収録する（省略厳禁）。
  - 助詞（`が`, `を`, `に`, `で`, `へ`, `と`, `から`, `まで`, `は`, `の`, `より`）をバランスよく出題対象にし、成人・高齢者の日常生活に即した自然な短文とする。
  - 各文の `distractors: [Particle, Particle]` は `answer` および `acceptable` と重複せず、空欄に入れると明確に不自然になる助詞2個を設定する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 52: 短文データ（意味正誤判定 `judgement.ts`：60文以上）と短文整合性テストの作成
- **対象ファイルパス**:
  - `src/data/sentences/judgement.ts`（新規）
  - `src/data/sentences/sentences.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `JudgementSentence`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §10（短文作成規約）
- **具体的な実装要件**:
  - `src/data/sentences/judgement.ts`: `JUDGEMENT_SENTENCES: readonly JudgementSentence[]` として、ID `js-001`〜`js-060` 以上の **計60文以上**（意味的に正しい文 `isValid: true` 30文以上＋意味的に矛盾している文 `isValid: false` 30文以上）を手書きで収録する（省略厳禁）。
  - `isValid: false` の文は文法ミスではなく「主語・道具・場所と述語の意味的矛盾」（例：「冷蔵庫の中で魚を焼きました。」「傘をさして布団で眠りました。」）とし、`reason` に簡潔な根拠を記載する。
  - `src/data/sentences/sentences.test.ts`:
    - `PARTICLE_SENTENCES` が60文以上、ID一意、`distractors` が `answer` や `acceptable` と重複しないこと。
    - `JUDGEMENT_SENTENCES` が60文以上、ID一意、`isValid: true` が30文以上、`isValid: false` が30文以上、全件に `reason` があることをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/sentences/sentences.test.ts`

### - [x] Task 53: モジュール8 共通ヘルパー（`common.ts`）とサブモードA（単語穴埋め `fill.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/language/m08-lexical/common.ts`（新規）
  - `src/modules/language/m08-lexical/fill.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M08Params`, `GenerateContext`, `VocabEntry`
  - `src/utils/kana.ts`: `toCodePoints`
  - `src/data/vocabulary/index.ts`: `VOCABULARY`, `VOCAB_CATEGORY_MAP`
  - `ARCHITECTURE.md`: §5.4（穴埋めの伏せ字）、§8（M08）、§9（M08）
- **具体的な実装要件**:
  - `common.ts`:
    - 表記変換関数 `formatVocabWord(entry: VocabEntry, notation: M08Params['notation']): string`（`kanjiRuby` は漢字と仮名が異なる場合に `漢字（かな）` または `<ruby>漢字<rt>かな</rt></ruby>`、`hiragana` は `entry.kana`、`kanji` は `entry.kanji`）。
    - 指定カテゴリ群・文字数範囲 `[minLength, maxLength]` で `VOCABULARY` をフィルタし、`ctx.draw` で非復元抽出するヘルパーを実装する（`minLength > maxLength` の場合は入れ替えて `PARAM_CLAMPED` 警告）。
  - `fill.ts`:
    - サブモードA（単語穴埋め・喚語書字）の問題データを生成する。
    - `fillHint`:
      - `'initial'`: 先頭1文字のみ表示し残りを空欄マス（`null`）にする。
      - `'final'`: 末尾1文字のみ表示し残りを空欄マスにする。
      - `'initialFinal'`: 3文字以上の語を対象とし（`minLength < 3` なら3に引き上げ）、先頭と末尾を表示し中間を空欄マスにする。
      - `'random'`: `Math.ceil(len / 3)` 個の位置を `ctx.rng` で選んで表示し残りを空欄マスにする（全表示・全伏せには絶対にしない）。
    - `showCategoryHint === true` のときはカテゴリヒント（例：「台所にあるもの」）＋意味ヒント（`entry.hint`）を提示し、`false` のときは意味ヒントのみを提示する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 54: モジュール8 サブモードB（アナグラム `anagram.ts`）とサブモードC（意味カテゴリ分類 `category.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/language/m08-lexical/anagram.ts`（新規）
  - `src/modules/language/m08-lexical/category.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M08Params`, `GenerateContext`, `VocabCategoryId`
  - `ARCHITECTURE.md`: §5.4（アナグラム）、§8（M08）、§9（M08）、§10（`alsoCategories` による除外判定）
- **具体的な実装要件**:
  - `anagram.ts`:
    - 対象文字数を `3..5` 文字に clamp（範囲外なら `PARAM_CLAMPED` 警告）し、全文字が同一の語を除外して `ctx.draw` で抽出する。
    - `toCodePoints(entry.kana)` を `ctx.rng.shuffle` で並べ替える。元の並び順と一致してしまった場合は最大10回再シャッフルし、必ず元の語順と異なる並び（例：`['け', 'と', 'い']`）を作る。
  - `category.ts`:
    - `categoryTask === 'oddOneOut'`（仲間外れ選択）：
      - 各問で親カテゴリ `C_main` と異カテゴリ `C_odd`（`C_odd !== C_main`）を選ぶ。
      - `C_main` から `groupSize - 1`（3〜4個）の語を選び、`C_odd` から `C_main` を `alsoCategories` に持たない語を1個選んで（かつ `C_main` 側の語も `C_odd` を `alsoCategories` に持たないものに限定）、`groupSize` 個の選択肢をシャッフルする。
    - `categoryTask === 'findAll'`（指定カテゴリ探索）：
      - ターゲットカテゴリ `C_target` を1つ選び、総数 `findAllCount`（20〜30個）のうち約30%〜40%（6〜10個）を `C_target` から、残りを他のカテゴリ（かつ `alsoCategories` に `C_target` を含まない語）から抽出してシャッフルする。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 55: モジュール8 サブモードD（短文課題 `sentence.ts`）と HTML 組版描画（`render.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/language/m08-lexical/sentence.ts`（新規）
  - `src/modules/language/m08-lexical/render.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M08Params`, `PageBody`, `ChecklistItem`
  - `src/data/sentences/particle.ts`: `PARTICLE_SENTENCES`
  - `src/data/sentences/judgement.ts`: `JUDGEMENT_SENTENCES`
  - `ARCHITECTURE.md`: §6, §9（M08）
- **具体的な実装要件**:
  - `sentence.ts`:
    - `sentenceTask === 'particleBlank'`: `PARTICLE_SENTENCES` から `ctx.draw` で抽出し、`before + [ 　 ] + after` の穴埋め問題を生成する。
    - `sentenceTask === 'particleChoice'`: 各文の `[answer, ...distractors]`（3択）をシャッフルして提示する。
    - `sentenceTask === 'judgement'`: `JUDGEMENT_SENTENCES` の正（`isValid: true`）と誤（`isValid: false`）がほぼ半数ずつになるよう抽出し、シャッフルして提示する。
  - `render.ts`:
    - 全4サブモード（`fill`, `anagram`, `category`, `sentence`）の問題用紙（`kind: 'html'`）と解答用紙（`kind: 'html'`）を mm 単位の厳密なレイアウトで描画する。
    - `itemCount` と `textScale` に応じて1ページ（高さ 237mm）に確実に収まる行高を計算し、収まらない場合は設問数を減らして `ITEMS_REDUCED` を警告する。
    - 解答用紙では、穴埋め・アナグラム・助詞補充（許容解 `acceptable` も「（〇〇も正解）」として併記）・正誤判定（理由 `reason` つき）の模範解答を黒太字で表示し、`oddOneOut` と `findAll` では正解語を赤太枠（`border: 0.6mm solid #D00000`、文字色は黒のまま）で囲む。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 56: モジュール8 モジュール定義・単体テスト・レジストリ登録
- **対象ファイルパス**:
  - `src/modules/language/m08-lexical/index.ts`（新規）
  - `src/modules/language/m08-lexical/logic.test.ts`（新規）
  - `src/core/registry.ts`（編集）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §8（M08 `code` 1〜12）、§11.3
- **具体的な実装要件**:
  - `index.ts`: `ARCHITECTURE.md` §8 の M08 パラメータ表（`code` 1〜12、`categories` の `options` は `VOCAB_CATEGORY_IDS` の順）通りに定義する。
  - `logic.test.ts`:
    - 4サブモードすべての決定性・多様性テスト。
    - `anagram` でシャッフル後の文字列が元の単語と決して同一にならないこと、文字集合が一致することの検証。
    - `oddOneOut` で仲間外れの語が親カテゴリにも `alsoCategories` にも属さないことの検証。
    - バッチ5枚連続生成時に同一シート・隣接シート間で単語や短文が重複しないことの検証。
  - `src/core/registry.ts`: `m08Module` を `ALL_MODULES` に追加登録する（計8モジュール）。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/language/m08-lexical/logic.test.ts`

---

## Phase 4：E. 遂行機能・IADL 領域マスターデータ＆モジュール 9〜12（Task 57 〜 Task 74）

### - [x] Task 57: モジュール9（迷路・ルート探索）反復型迷路生成・BFS最短路探索ロジック（`logic.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m09-maze/logic.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M09Params`, `CommonParams`, `GenerateContext`
  - `ARCHITECTURE.md`: §5.6（迷路 M09）、§8（M09）、§11.1（再帰禁止）
- **具体的な実装要件**:
  - `gridSize × gridSize`（8×8〜25×25）の完全迷路（閉路なし・全セル連結）を **反復アルゴリズム（明示的スタック配列を用いた `backtracker` またはフロンティア配列を用いた乱択 `prim`、再帰呼び出し禁止）** で生成する。
  - `route` パラメータに応じたスタート／ゴール座標と外周開口壁：
    - `'tlToBr'`: `(0, 0)` 左壁開口 → `(N-1, N-1)` 右壁開口
    - `'trToBl'`: `(0, N-1)` 右壁開口 → `(N-1, 0)` 左壁開口
    - `'rightToLeft'`: `(Math.floor(N/2), N-1)` 右壁開口 → `(Math.floor(N/2), 0)` 左壁開口（左USN患者の左側探索誘導用）
    - `'leftToRight'`: `(Math.floor(N/2), 0)` 左壁開口 → `(Math.floor(N/2), N-1)` 右壁開口
  - BFS（幅優先探索）でスタートからゴールまでの最短セル経路 `solutionPath: { row: number; col: number }[]` を求める。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 58: モジュール9（迷路・ルート探索）SVG 描画とモジュール定義の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m09-maze/render.ts`（新規）
  - `src/modules/iadl/m09-maze/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M09Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `src/print/answerParts.ts`: `answerPath`
  - `ARCHITECTURE.md`: §6（線系ハイライト）、§8（M09 `code` 1〜4）、§9（M09）
- **具体的な実装要件**:
  - `render.ts`:
    - 本文領域の中央に正方セル（`cellMm = Math.min(body.widthMm - 24, body.heightMm - 16) / gridSize`）の迷路壁を黒実線（`TYPOGRAPHY.baseStrokeMm * 1.5 * strokeScale / 100`）で描画する。
    - スタート開口部の外側に「スタート」＋矢印、ゴール開口部の外側に「ゴール」＋矢印を明瞭に配置する。
    - 解答用紙では `solutionPath` のセル中心を結ぶ `answerPath`（赤＋破線＋太線）を描画し、教示帯に最短ステップ数を記載する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M09 パラメータ表（`code` 1〜4）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 59: モジュール9（迷路・ルート探索）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/iadl/m09-maze/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.6（迷路）, §11.3
- **具体的な実装要件**:
  - `backtracker` / `prim` 両アルゴリズム、全4種類の `route`、`gridSize` 8〜25 で生成した迷路について：
    - `solutionPath` の先頭が `start`、末尾が `goal` であること。
    - 経路上の連続する2セルが上下左右に隣接し、かつその間の壁が開いている（壁を貫通していない）こと。
    - 同じセルを2度通らない単純路であることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/iadl/m09-maze/logic.test.ts`

### - [x] Task 60: 買い物商品マスターデータ（`src/data/shop-items.ts`：72品目以上）と整合性テストの作成
- **対象ファイルパス**:
  - `src/data/shop-items.ts`（新規）
  - `src/data/shop-items.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `ShopItem`, `ShopCategory`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §9.4, §10（買い物マスターデータ規約）
- **具体的な実装要件**:
  - `SHOP_ITEMS: readonly ShopItem[]` として、全12カテゴリ（`vegetable`, `fruit`, `meat`, `fish`, `dairy`, `bread`, `staple`, `drink`, `snack`, `seasoning`, `frozen`, `daily`）× 各6品目以上 ＝ **計72品目以上**（ID `shop-001`〜`shop-072` 以上）を手書きで収録する（省略厳禁）。
  - 価格は `10..1500` 円の整数とし、10%引き計算で端数が出ない `price % 10 === 0` の品目を全体の30%以上（24品目以上）、半額計算で端数が出ない `price % 2 === 0` の品目を50%以上（36品目以上）、個数指定可能な `countable: true` の品目を40品目以上含めること。
  - `src/data/shop-items.test.ts`: 総数72品目以上、ID・品名の一意性、12カテゴリすべて収録、10の倍数価格・偶数価格・`countable` の件数条件を検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/shop-items.test.ts`

### - [x] Task 61: モジュール10 硬貨・紙幣の白黒ハイコントラスト模式図 SVG ビルダ（`coins.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m10-money/coins.ts`（新規）
  - `src/modules/iadl/m10-money/coins.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Denomination`, `COIN_SPECS`, `BILL_SPECS`, `BILL_DRAW_SCALE`, `DENOMINATIONS`
  - `ARCHITECTURE.md`: §9（M10 硬貨・紙幣の模式図仕様）、§11.2
- **具体的な実装要件**:
  - `renderMoneySvgItem(denom: Denomination, cx: number, cy: number, scale = 1, strokeScale = 100): { svg: string; widthMm: number; heightMm: number }` を実装する：
    - **硬貨（1, 5, 10, 50, 100, 500）**: `COIN_SPECS[denom].diameterMm * scale` の円。
      - `1`: 白塗り・細黒縁・中央に太字「1」＋下に「円」。
      - `5`: 淡灰塗り（`#D9D9D9`）・黒縁・中央に直径 `5.0 * scale` mm の白抜き丸穴・穴の上部に太字「5」・下部に「円」。
      - `10`: 灰塗り（`#BFBFBF`）・黒縁・中央に太字「10」＋「円」。
      - `50`: 白塗り・二重黒縁・中央に直径 `4.0 * scale` mm の白抜き丸穴・穴の上部に太字「50」・下部に「円」。
      - `100`: 白塗り・二重黒縁・中央に太字「100」＋「円」。
      - `500`: 淡灰塗り（`#D9D9D9`）・太い外周＋二重縁・中央に大きな太字「500」＋「円」。
    - **紙幣（1000, 5000, 10000）**: `BILL_SPECS[denom]` × `BILL_DRAW_SCALE * scale` の長方形。
      - `1000`: 白塗り・一重黒枠・中央に太字「1000」・下部に「千円」。
      - `5000`: 白塗り・二重黒枠・中央に太字「5000」・下部に「五千円」。
      - `10000`: 白塗り・太い二重黒枠・中央に太字「10000」・下部に「一万円」。
  - `src/modules/iadl/m10-money/coins.test.ts`: 全9金種（`DENOMINATIONS`）で有効な SVG が返り、5円・50円に穴の円要素が含まれ、金額文字列が含まれることをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/iadl/m10-money/coins.test.ts`

### - [x] Task 62: モジュール10 サブモードA（硬貨・紙幣の合計と支払い選択 `money.ts`：逆算一意解保証つき）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m10-money/money.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M10Params`, `Denomination`, `COIN_DENOMINATIONS`, `DENOMINATIONS`, `GenerateContext`
  - `ARCHITECTURE.md`: §5.6（金銭 M10 の逆算生成）
- **具体的な実装要件**:
  - 日本の金種に対する貪欲法おつり枚数計算 `greedyBreakdown(amount: number, includeBills: boolean): Map<Denomination, number>` と枚数合計 `countGreedyCoins(amount: number)` を実装する。
  - **サブモード `coinTotal`（お金の合計）**:
    - `problemCount`（2〜6問）それぞれで、指定枚数（`3..maxPieces` 枚）の硬貨・紙幣の組み合わせを生成し（同じ合計金額が問題間で重複しないこと）、合計金額を算出する。
  - **サブモード `payment`（支払い選択）**:
    - 1ページ内に見やすく収めるため `problemCount` が4を超える場合は4に clamp（`ITEMS_REDUCED` 警告）。
    - `paymentTask === 'exact'`（ちょうど支払う）：
      - 支払額 `price`（`10..priceMax`）を決め、それをちょうど構成する硬貨・紙幣集合 `S_exact` にダミー硬貨・紙幣を2〜5枚追加して手持ち財布 `wallet`（総組み合わせ数 `<= 4096`）を作る。
      - `wallet` の全部分集合を走査し、合計 `=== price` となる金種マルチセットが **1通り（一意）** になるまで最大50回再生成する。
    - `paymentTask === 'minChange'`（おつりの枚数が最も少ない出し方）：
      - 支払額 `price` と手持ち財布 `wallet` を生成し、合計 `>= price` となる全部分集合のうち `(おつり枚数, 支払枚数)` の辞書式最小を達成する金種マルチセットが **一意** になるまで最大50回再生成する（例：730円に対して1000円札＋200円＋30円を出しておつり500円玉1枚にする等、または最小おつり枚数解）。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 63: モジュール10 サブモードB（買い物リストと予算・割引・お釣り計算 `shopping.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m10-money/shopping.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M10Params`, `ShopItem`, `GenerateContext`
  - `src/data/shop-items.ts`: `SHOP_ITEMS`
  - `ARCHITECTURE.md`: §5.6（budget 逆算・割引の整数保証）、§8（M10）、§9（M10）
- **具体的な実装要件**:
  - `SHOP_ITEMS` から `ctx.draw('shop-items', ...)` で価格表用の `shopItemCount`（8〜15品目）を抽出する。
  - `shoppingLevel === 'basic'`:
    - 価格表から `listCount`（2〜6品目）を買い物リストに選ぶ（`includeQuantity === true` のときは `countable` 品目のうち1〜2品目を2〜3個にする）。
    - 合計金額 `total` に対し、キリの良い所持金（例：`ceilTo(total + 100, 500)` または `1000` 円単位）を設定し、「合計金額」と「おつり」を正答とする。
  - `shoppingLevel === 'discount'`:
    - 買い物リストに含まれる品目のうち1〜2品目に「10%引き」（必ず `price % 10 === 0` の品目を選び `price * 0.9`）または「半額」（必ず `price % 2 === 0` の品目を選び `price / 2`）を設定し、端数（小数）が絶対に発生しないように合計金額とおつりを算出する。
  - `shoppingLevel === 'budget'`:
    - `ARCHITECTURE.md` §5.6 に従い、候補品目（5〜6品）から `listCount` 品を選ぶ全部分集合を列挙し、「予算 `B` 円以内で全部買えて、かつ合計金額が最も高くなる組み合わせ」が **一意** になるよう予算 `B`（10円または50円単位）を逆算して設定する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 64: モジュール10 描画（`render.ts`）とモジュール定義（`index.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m10-money/render.ts`（新規）
  - `src/modules/iadl/m10-money/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M10Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `src/modules/iadl/m10-money/coins.ts`: `renderMoneySvgItem`
  - `src/print/answerParts.ts`: `answerCircle`, `answerRect`
  - `ARCHITECTURE.md`: §6, §8（M10 `code` 1〜10）、§9（M10）
- **具体的な実装要件**:
  - `render.ts`:
    - `coinTotal`: 各問の枠内に硬貨・紙幣 SVG を重ならないよう整列描画し、右端に「合計 ＿＿＿＿ 円」の記入欄を配置する。解答用紙では正答金額と金種内訳を黒太字で記載する。
    - `payment`: 各問の左側に「支払う金額：〇〇〇円」、右側に手持ちの硬貨・紙幣 SVG を並べる。解答用紙では支払いに使う硬貨を `answerCircle`、紙幣を `answerRect`（赤太線）で囲み、支払合計とおつりを記載する。
    - `shopping`: 上部に「商品価格表」（品名・単位・価格・割引表示）、下部に「買い物リスト（または候補リスト）」「所持金（または予算）」と「合計金額」「おつり」の計算・記入枠を描画する。解答用紙には計算式（単価×個数・割引後価格の内訳）と正答を明記する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M10 パラメータ表（`code` 1〜10）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 65: モジュール10（金銭管理・買い物計算）単体テストの実装
- **対象ファイルパス**:
  - `src/modules/iadl/m10-money/logic.test.ts`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §5.6（金銭 M10）, §11.3
- **具体的な実装要件**:
  - `coinTotal` の合計金額が各金種の和と一致すること。
  - `payment`（`exact` / `minChange`）で解答の硬貨・紙幣が財布の部分集合であり、`exact` では合計が支払額に厳密一致すること、`minChange` ではおつり金額 `>= 0` かつおつり枚数が最小であること。
  - `shopping`（`basic` / `discount` / `budget`）で割引後価格・合計・おつりがすべて非負整数（端数なし）であり、`budget` で正解組み合わせの合計が予算以下であることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/iadl/m10-money/logic.test.ts`

### - [x] Task 66: スケジュール用マスターデータ（用事テンプレート30件以上・順序ペア12件以上 `errands.ts`）の作成
- **対象ファイルパス**:
  - `src/data/schedule/errands.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `ErrandTemplate`, `OrderPairTemplate`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §9.6, §10（スケジュールデータ規約）
- **具体的な実装要件**:
  - `ERRAND_TEMPLATES: readonly ErrandTemplate[]` として、ID `er-001`〜`er-030` 以上の **計30件以上**（うち `kind: 'errand'` 24件以上、`'meal'`（昼食等）2件以上、`'appointment'`（歯科受診・内科受診・美容院予約・リハビリ予約等）4件以上）を手書きで収録する（省略厳禁）。
  - すべての `openFromMin`・`openToMin`・`durationsMin` の要素は `30` の倍数（分単位、例：9:00 = `540`, 12:00 = `720`, 15:00 = `900`, 17:00 = `1020`）とする。
  - `ORDER_PAIR_TEMPLATES: readonly OrderPairTemplate[]` として、ID `op-001`〜`op-012` 以上の **計12件以上**（例：銀行でお金をおろす→スーパーで買い物をする、内科を受診する→薬局で薬を受け取る、図書館で本を借りる→喫茶店で読書をする等）を収録する。`beforeId` と `afterId` は必ず `ERRAND_TEMPLATES` に存在する ID とする。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 67: カレンダー予定テンプレート（20件以上 `calendar-events.ts`）とスケジュールデータ整合性テストの作成
- **対象ファイルパス**:
  - `src/data/schedule/calendar-events.ts`（新規）
  - `src/data/schedule/schedule.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `CalendarEventTemplate`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §9.6, §10
- **具体的な実装要件**:
  - `src/data/schedule/calendar-events.ts`: `CALENDAR_EVENT_TEMPLATES: readonly CalendarEventTemplate[]` として、ID `ce-001`〜`ce-020` 以上の **計20件以上**（外来リハビリ、歯科受診、資源ごみの日、燃えないごみの日、町内会、理容室、図書館返却日、体操教室、入浴サービス、訪問看護など）を手書きで収録する（省略厳禁）。`shortLabel` は全角4文字以内（`Array.from(shortLabel).length <= 4`）とする。
  - `src/data/schedule/schedule.test.ts`:
    - `ERRAND_TEMPLATES` 30件以上（`errand >= 24`, `meal >= 2`, `appointment >= 4`）、全時刻・所要時間が30の倍数であること。
    - `ORDER_PAIR_TEMPLATES` 12件以上、全 `beforeId` / `afterId` が実在し、かつ `before.openFromMin + min(before.durationsMin) <= after.openToMin - min(after.durationsMin)`（時間的に成立可能）であること。
    - `CALENDAR_EVENT_TEMPLATES` 20件以上、全 `shortLabel` が4文字以内であることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/schedule/schedule.test.ts`

### - [x] Task 68: モジュール11 サブモードA（月間カレンダーの読み取り・予定記入・質問逆算生成 `calendar.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m11-schedule/calendar.ts`（新規）
  - `src/modules/iadl/m11-schedule/calendar.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M11Params`, `Weekday`, `WEEKDAY_LABELS`, `GenerateContext`
  - `src/data/schedule/calendar-events.ts`: `CALENDAR_EVENT_TEMPLATES`
  - `ARCHITECTURE.md`: §5.6（カレンダー M11A）
- **具体的な実装要件**:
  - `calendarSource === 'actual'` のときは `Date.UTC(year, month - 1, 1)` から1日の曜日と月末日数を正確に算出する。`'practice'` のときは月（1〜12）と1日の曜日（0〜6）を `ctx.rng` で決定する（2月は28日）。
  - `CALENDAR_EVENT_TEMPLATES` から `conditionCount`（3〜6個）の予定を `ctx.draw` で抽出し、先にカレンダー上の正解日付を割り当ててから条件文を生成する（1日に重なる予定は最大2件まで）：
    - `'weekly'`: 「毎週〇曜日は〇〇」（最大2件まで）
    - `'nthWeekday'`: 「第N〇曜日は〇〇」（N = 1..4）
    - `'lastWeekday'`: 「最終〇曜日は〇〇」
    - `'relativeDays'`: 「〇日のK日後（またはK日前）は〇〇」（`K ∈ {2, 3, 5, 7, 10}`、同月内に収まる日付）
    - `'specificDate'`: 「〇月〇日は〇〇」
  - `calendarTask` が `'question'` または `'both'` のとき、条件文から導かれる質問3問（例：「〇〇は何月何日ですか」「〇月に〇〇は全部で何回ありますか」「〇日の予定は何ですか」）と一意の正答を生成する。
  - `calendar.test.ts`: 曜日・日数計算（うるう年を含む実在年月）、全条件文の日付が `1..daysInMonth` 内にあり、1日の予定数が2件以下であり、質問の正答がカレンダー配置と一致することをテストする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/iadl/m11-schedule/calendar.test.ts`

### - [x] Task 69: モジュール11 サブモードB タイムスケジュール制約検証ソルバ（`solver.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m11-schedule/solver.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `MinuteOfDay`, `ChecklistItem`
  - `ARCHITECTURE.md`: §5.3（スケジュール課題の逆算生成・`PlannedItem` / `Constraint` / `TimetableProblem` / `verifyPlan`）
- **具体的な実装要件**:
  - `ARCHITECTURE.md` §5.3 のデータ型 `PlannedItem`, `Constraint`（`window`, `fixed`, `deadline`, `notBefore`, `order`）, `TimetableProblem`, `VerifyResult` および時刻フォーマット関数 `formatTime(min: MinuteOfDay): string`（例：`570 -> '9:30'`）を定義・export する。
  - `verifyPlan(problem: TimetableProblem, plan: readonly PlannedItem[]): { allOk: boolean; results: { id: string; label: string; expected?: string; ok: boolean }[] }`:
    - 一般条件4項目：(1) 全用事が1回ずつ含まれている、(2) 全ての用事が `dayStart..dayEnd` 内に収まり所要時間が指定通り、(3) 時間帯の重複がない、(4) `includeTravel === true` のとき場所が変わる用事間に必要な移動時間（`travelMin`）が確保されている。
    - 個別制約 `problem.constraints` の全項目を検査し、1つでも違反があれば `allOk: false` とする。
  - `buildTimetableChecklist(problem: TimetableProblem): ChecklistItem[]`: 解答用紙の採点基準表に渡す `ChecklistItem[]` を生成する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 70: モジュール11 サブモードB 逆算タイムスケジュール生成（`timetable.ts`）と単体テストの実装
- **対象ファイルパス**:
  - `src/modules/iadl/m11-schedule/timetable.ts`（新規）
  - `src/modules/iadl/m11-schedule/timetable.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M11Params`, `GenerateContext`
  - `src/data/schedule/errands.ts`: `ERRAND_TEMPLATES`, `ORDER_PAIR_TEMPLATES`
  - `src/modules/iadl/m11-schedule/solver.ts`: `verifyPlan`, `TimetableProblem`
  - `ARCHITECTURE.md`: §5.3（逆算生成アルゴリズム）
- **具体的な実装要件**:
  - `ARCHITECTURE.md` §5.3 の擬似コードに完全準拠して実装する：
    1. `dayStartHour >= dayEndHour - 3` の場合は少なくとも4時間以上の幅になるよう補正して `PARAM_CLAMPED` を警告する。
    2. 先に30分刻みの時間軸上で、営業時間（`openFromMin..openToMin`）・移動時間（`travelMin`）・昼食時間帯（`meal` があれば 11:30〜13:30）をすべて満たす完成スケジュール `solution: PlannedItem[]` を1つ組み立てる（200回試行して入らなければ用事数を1つ減らして `GENERATION_RETRY` 警告）。
    3. 完成した `solution` が必ず満たす制約条件（`fixed`, `window`, および `constraintLevel` に応じた `order` 1〜2件・`deadline` / `notBefore` 0〜1件）を逆算抽出する。
    4. 生成直後に必ず `verifyPlan(problem, problem.solution)` を実行し、`!allOk` なら内部バグとして例外を投げる（解なし問題の出題を100%阻止する）。
  - `timetable.test.ts`: `easy` / `normal` / `hard`、`includeTravel: true / false`、`errandCount: 3..6`、seed 1〜50 の全組み合わせで生成したスケジュールが `verifyPlan(problem, problem.solution).allOk === true` を100%満たすこと、および意図的に時間をずらした不正プランを `verifyPlan` が `allOk: false` として検出することを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/iadl/m11-schedule/timetable.test.ts`

### - [x] Task 71: モジュール11（スケジュール調整・カレンダー）描画（`render.ts`）とモジュール定義（`index.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m11-schedule/render.ts`（新規）
  - `src/modules/iadl/m11-schedule/index.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M11Params`, `ParamSchema`, `TaskModule`, `defineModule`
  - `ARCHITECTURE.md`: §8（M11 `code` 1〜12）、§9（M11A, M11B）
- **具体的な実装要件**:
  - `render.ts`:
    - `calendar`: 上部に月間カレンダー表（`sun` 日曜始まりまたは `mon` 月曜始まり、各日付セルに予定書き込みスペースを確保）、下部に「予定の条件」一覧と、`calendarTask` に応じた設問・回答欄を1ページ内に収めて描画する。解答用紙ではカレンダーの各日付セルに正解の `shortLabel` を黒太字で記入し、質問の正答と採点チェックリストを出力する。
    - `timetable`: 左側（または上部）に「今日行う用事リスト（用事名・場所・所要時間）」と「守る条件（箇条書き）」、右側（または下部）に30分刻みの白紙タイムテーブル（時刻｜場所・予定内容の記入欄）を描画する。解答用紙には完成タイムテーブル例（「※条件をすべて満たしていれば他の順番・時刻でも正解です」と明記）と `checklistTableHtml` による全条件チェックリストを描画する。
  - `index.ts`: `ARCHITECTURE.md` §8 の M11 パラメータ表（`code` 1〜12）通りに定義する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 72: 服薬管理マスターデータ（架空薬剤24種以上 `src/data/medicines.ts`）と整合性テストの作成
- **対象ファイルパス**:
  - `src/data/medicines.ts`（新規）
  - `src/data/medicines.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `MedicineTemplate`, `DOSE_TIMINGS`, `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §9.7, §10（服薬マスターデータ規約）
- **具体的な実装要件**:
  - `MEDICINE_TEMPLATES: readonly MedicineTemplate[]` として、ID `md-001`〜`md-024` 以上の **計24種以上** を手書きで収録する（省略厳禁）。
  - `fictionalName` は実在の医薬品名・商品名と一致しないカタカナ4〜6文字の架空名（例：`ケツアール`, `イマモール`, `コレナール`, `トウサール`, `ネムリード` 等）とし、`effect` は患者に分かりやすい効能（例：`血圧の薬`, `胃を守る薬`, `コレステロールの薬`, `血糖値を下げる薬`, `眠りを助ける薬` 等）とする。
  - 睡眠導入系の薬は `timingPatterns: [['bedtime']]` のみにするなど、用法パターン（朝のみ、朝・夕、朝・昼・夕、寝る前のみ、昼のみ等）が臨床的に自然であること。
  - `src/data/medicines.test.ts`: 総数24種以上、ID・`fictionalName` の一意性、`timingPatterns` と `doseOptions` が空でないことを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/medicines.test.ts`

### - [x] Task 73: モジュール12（服薬管理・残薬計算）生成ロジック（`logic.ts`）と描画（`render.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/iadl/m12-medication/logic.ts`（新規）
  - `src/modules/iadl/m12-medication/render.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `M12Params`, `DOSE_TIMINGS`, `DOSE_TIMING_LABELS`, `DOSE_TIMING_SHORT`, `GenerateContext`
  - `src/data/medicines.ts`: `MEDICINE_TEMPLATES`
  - `ARCHITECTURE.md`: §5.6（服薬 M12）、§8（M12）、§9（M12）
- **具体的な実装要件**:
  - `logic.ts`:
    - `MEDICINE_TEMPLATES` から `ctx.draw('medicines', ..., params.drugCount)` で3〜6種を抽出し、アルファベット順ラベル（A, B, C...）を付与する。
    - `labelStyle` に応じて表示名を構築する：
      - `'letterEffect'`: `A錠（血圧の薬）`（カプセルなら `Aカプセル（…）`）
      - `'fictionalEffect'`: `ケツアール錠（血圧の薬）`
      - `'letterOnly'`: `A錠`
    - 各薬剤の用法 `timings` と1回量 `dosePerTime`（1または2）を決定する。少なくとも朝・夕・寝る前の複数区分が使われるように組み合わせを選ぶ。
    - 1日合計量 `dailyTotal = dosePerTime * timings.length`、旅行日数 `days = Number(params.travelDays)`（7または14）に対する必要総数 `requiredTotal = dailyTotal * days` を算出する。
    - `includeStock === true` のとき、手持ち残薬数 `currentStock` を設定し、「あと何日分足りるか（割り切れる手持ち数 `dailyTotal * k`）」または「旅行に何錠（何カプセル）不足するか（`requiredTotal - currentStock`）」の設問と正答を逆算生成する。
  - `render.ts`:
    - 上部に「お薬説明書」テーブル（お薬名・効能・飲むタイミング・1回量）。
    - 中段に「設問1：お薬の仕分け」テーブル（`organizer === 'daily'` なら【朝食後｜昼食後｜夕食後｜寝る前】の4枠、`organizer === 'weekly'` なら【月〜日 × 朝・昼・夕・寝る前】の週間カレンダー枠）。
    - 下段（`includeCalc === true` 時）に「設問2：必要数・残薬の確認」（旅行日数分の必要数記入欄＋残薬・不足数計算欄）を1ページ内に収めて描画する。
    - 解答用紙には仕分け表の正答（服用しない区分は「なし」）、必要数・残薬計算の式と正答を明記する。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 74: モジュール12 モジュール定義・単体テストおよび全12モジュールレジストリ完成
- **対象ファイルパス**:
  - `src/modules/iadl/m12-medication/index.ts`（新規）
  - `src/modules/iadl/m12-medication/logic.test.ts`（新規）
  - `src/core/registry.ts`（編集）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `MODULE_IDS`
  - `ARCHITECTURE.md`: §8（M12 `code` 1〜6）、§11.3
- **具体的な実装要件**:
  - `index.ts`: `ARCHITECTURE.md` §8 の M12 パラメータ表（`code` 1〜6）通りに定義する。
  - `logic.test.ts`:
    - 4区分（朝・昼・夕・寝る前）ごとの配薬正解データと各薬剤の `timings` / `dosePerTime` が一致すること。
    - `requiredTotal === dailyTotal * Number(travelDays)` および残薬・不足数の計算結果が矛盾しないことを検証する。
  - `src/core/registry.ts`: `m09Module`, `m10Module`, `m11Module`, `m12Module` を追加し、`ALL_MODULES` に **M01〜M12 の全12モジュール** が `MODULE_IDS` 順で揃うようにする。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run`

---

## Phase 5：単一 HTML ビルド・全モジュール総合検証・院内配布対応（Task 75 〜 Task 80）

### - [x] Task 75: `vite-plugin-singlefile` による単一 HTML ビルド（`dist/index.html`）と通信遮断 CSP 注入の構成
- **対象ファイルパス**:
  - `vite.config.ts`（編集）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §12（単一 HTML 配布・file:// 起動）
- **具体的な実装要件**:
  - `vite.config.ts` を編集し、`mode === 'single'`（`npm run build:single`）のときに `viteSingleFile()`（`vite-plugin-singlefile`）を有効化する。
  - `build.assetsInlineLimit: 100_000_000`、`build.cssCodeSplit: false` を設定し、すべての JS と CSS が `dist/index.html` 1ファイル内にインライン展開されるようにする。
  - `mode === 'single'` のときのみ動作するカスタム Vite プラグイン（`transformIndexHtml`）を追加し、`<head>` 内に厳格なオフライン保証用 CSP メタタグ：
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'" />`
    を自動注入する（通常 `vite` dev 時は HMR 用 WebSocket を妨げないよう注入しない）。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npm run build:single`

### - [x] Task 76: 全12モジュール横断スモーク＆契約遵守テスト（`src/modules/all.test.ts`）の実装
- **対象ファイルパス**:
  - `src/modules/all.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `MODULE_IDS`, `COMMON_PARAM_CODES`, `MODULE_PARAM_CODE_MAX`, `MODULE_PARAM_CODE_MIN`
  - `src/core/registry.ts`: `ALL_MODULES`, `getModule`
  - `src/utils/seedCode.ts`: `encodeSeedCode`, `parseSeedCode`
  - `ARCHITECTURE.md`: §4, §8, §11.3
- **具体的な実装要件**:
  - `ALL_MODULES` に `MODULE_IDS`（M01〜M12）の全12モジュールが登録されていることを検証する。
  - 各モジュールの `paramSchema` について：
    - `code` が `1..29` の範囲内で重複がないこと。
    - `default` 値が自身の範囲・選択肢内に含まれていること。
  - 全12モジュール × シード3通り × バッチ2枚で `runJob`（`outputMode: 'withAnswer'`）を実行し：
    - 例外なく `pages` が生成され、空文字列の `markup` がないこと。
    - 同一シード・同一パラメータでの2回実行が1文字の狂いなく完全一致すること（100%再現性）。
  - 全12モジュールそれぞれでランダムにパラメータを変更した30ケースずつ `encodeSeedCode` → `parseSeedCode` の往復テストを行い、100%元の差分パラメータとシード・シート番号に復元できることを検証する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/modules/all.test.ts`

### - [x] Task 77: 全マスターデータ最低収録件数・品質基準の一括検証テスト（`src/data/all-data.test.ts`）の実装
- **対象ファイルパス**:
  - `src/data/all-data.test.ts`（新規）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `DATA_MINIMUMS`
  - `ARCHITECTURE.md`: §10（マスターデータ作成規約）
- **具体的な実装要件**:
  - `DATA_MINIMUMS` の全11項目（語彙240語以上・各カテゴリ20語以上、読解コーパス18編以上、助詞文60文以上、正誤判定文60文以上、買い物商品72品目以上、用事30件以上、順序ペア12件以上、カレンダー予定20件以上、架空薬剤24種以上、抹消記号12種以上、符号変換記号9種以上）を一括アサートする。
  - 全マスターデータ文字列の中に `'TODO'`, `'FIXME'`, `'以下同様'`, `'ダミー'`, `'...'` といった省略・未完成文字列が一切含まれていないことを検査する。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run src/data/all-data.test.ts`

### - [x] Task 78: 単一 HTML 出力（`dist/index.html`）の自動検証スクリプト（`scripts/verify-single.mjs`）の実装
- **対象ファイルパス**:
  - `scripts/verify-single.mjs`（新規）
  - `package.json`（`verify:single` スクリプト追加）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §12（`scripts/verify-single.mjs` の検査項目）
- **具体的な実装要件**:
  - Node 標準モジュール（`node:fs`, `node:path`）のみで動作する `scripts/verify-single.mjs` を実装し、以下の項目を検査する（違反があればエラー内容を標準エラーに出して `process.exit(1)`）：
    1. `dist/` ディレクトリ内のファイルが `index.html` ただ1つであること（別ファイルの `.js` や `.css` が残っていないこと）。
    2. `dist/index.html` のファイルサイズが 50KB 以上 3MB 未満であること。
    3. 外部参照（`<script src=`, `<link rel="stylesheet"`）が存在しないこと。
    4. `connect-src 'none'` を含む Content-Security-Policy メタタグが存在すること。
    5. SVG/XHTML の名前空間 URI（`http://www.w3.org/2000/svg`, `http://www.w3.org/1999/xhtml`）を除き、`http://` や `https://` の外部 URL が一切含まれないこと。
  - `package.json` の `"scripts"` に `"verify:single": "npm run build:single && node scripts/verify-single.mjs"` を追加する。
- **完了確認コマンド**:
  - `npm run verify:single`

### - [x] Task 79: 院内オフライン PC 配布・運用・印刷設定ガイド（`DISTRIBUTION.md`）の作成
- **対象ファイルパス**:
  - `DISTRIBUTION.md`（新規）
- **参照する型・仕様**:
  - `ARCHITECTURE.md`: §3.7（印刷設定案内）、§12（単一 HTML 配布）
- **具体的な実装要件**:
  - 開発環境のない院内オフライン PC へ導入・運用するための手順書を日本語で作成する：
    1. ビルド手順（開発機での `npm run verify:single` 実行と `dist/index.html` の取り出し）。
    2. 院内 PC への配置手順（USBメモリや院内共有フォルダ経由で `index.html` 1ファイルを任意のフォルダにコピーし、ダブルクリックで Chrome / Edge から `file://` 起動する手順）。
    3. A4 印刷時のブラウザ設定手順（用紙サイズ A4、倍率「100%」または「実際のサイズ」、余白「なし」または「デフォルト」、ヘッダーとフッターのチェックを外す、フッターの 50mm 校正バーでの実寸確認方法）。
    4. 条件・シードコードによる過去プリントの 100% 再現手順と、プリセット JSON エクスポート／インポート手順。
- **完了確認コマンド**:
  - `npx tsc --noEmit`

### - [x] Task 80: プリセット JSON エクスポート／インポート機能と最終総合ビルド検証
- **対象ファイルパス**:
  - `src/core/presets.ts`（編集）
  - `src/core/presets.test.ts`（編集）
  - `src/ui/presetPanel.ts`（編集）
- **参照する型・仕様**:
  - `src/types/schema.ts`: `Preset`, `PresetStore`, `MODULE_IDS`
  - `ARCHITECTURE.md`: §12
- **具体的な実装要件**:
  - `src/core/presets.ts`:
    - `exportPresetsJson(storage: StorageLike): string`: 保存済みプリセット一式を整形済み JSON 文字列として出力する。
    - `importPresetsJson(storage: StorageLike, jsonText: string): { imported: number; total: number; error?: string }`: JSON を検証し、有効な `Preset` エントリ（`moduleId` が `MODULE_IDS` に含まれるもの）を既存のプリセットにマージ保存する（不正な JSON の場合は例外を投げず `error` メッセージを返す）。
  - `src/ui/presetPanel.ts`:
    - プリセットパネルに「ファイルへ書き出し（JSON）」（Blob + `<a download="reha-print-presets.json">`）と「ファイルから読み込み」（`<input type="file" accept=".json">`）ボタンを追加し、`file://` 環境や複数 PC 間でもプリセットを共有・バックアップできるようにする。
  - `src/core/presets.test.ts`: エクスポート→インポートの往復テスト、重複 ID の上書き・新規 ID の追加、不正 JSON 入力時の安全なエラー返却をテストする。
  - 最後に全テスト・型チェック・単一 HTML ビルド検証を通してプロジェクト全体を完成させる。
- **完了確認コマンド**:
  - `npx tsc --noEmit && npx vitest run && npm run verify:single`
