# RESCENE 應援練習室

## With 影片優先全曲畫面複核（2026-11-06）

- 完整閱讀 72 組來源歌詞畫面，並逐一檢視全部應援字卡的 0.5 秒連續圖；另做 0.1 秒像素變色掃描與更動處完整畫面邊界核對。未新增 OCR、ASR，未直接聽校或正常速度完整播放
- 第二段副歌同樣有兩次 You：151.7–152.5、154.7–155.4 秒；第一段維持 93.2–94.0、96.2–96.9 秒。With 現為 27 張，全歌單 485 張
- task 49–50 歡呼在 177.3 秒消失，原 178.8 秒是下層一般歌詞結束，因此只修正歡呼尾端，起點維持 173.7 秒
- 影片字幕保留 b-b-breaks 和兩段 Outro 的 Oh；外部歌詞的額外伴唱未見於這支教學畫面，不加入應援或小本
- 決策仍由 `with-repeat-corrections.json` 疊加，原 OCR／ledger／SRT 不覆寫；每次共用 catalog writer 寫入會另存 `chant.with-repeat-v2.json`／`.srt`
- 複核紀錄：`video/RESCENE應援/With-影片複核.md`；這次網站僅更新本機資料與快取版本，未推送或部署

## With 第一段副歌重複 You（2026-11-06）

- 依使用者回報核對 01:36：同一字幕的追加 You 有兩次變黑。第一張 93.2–94.0 秒，94.0 秒恢復藍色；新增第二張 96.2–96.9 秒。With 現為 26 張，全歌單 484 張
- 依 0.1 秒來源畫面核對重設與第二次進入；保留原片，證據在 `video/RESCENE應援/assets/you-repeat-review/`。未新增 OCR、未直接聽校或驗收正式網站實播
- 決策保存於 `with-repeat-corrections.json`；執行 `scripts/fix_rescene_with_repeats.py` 可重套。共用 catalog writer 會套用此修正，因此官方 builder 重建不會遺失
- 原 OCR ledger／SRT 保持原證據版本；本次修正版另存 `video/cLtl2aFq_6M/chant.with-repeat-v1.srt` 與對應 JSON，來源映射由上述 correction 疊加現行 catalog
- 小本第一段副歌同步排兩次 You, you【You】。本次更新本機網站資料與快取版本，未 commit、push 或部署

## Inside Out 空耳校訂與 3:51 補漏（2026-11-03）

- 依使用者校訂，`백! 화! 요! 란! Inside out!` 空耳改成「貝! 花! 唷! 蘭! Inside out!」；`꽃처럼` 改成「勾秋隆」
- 補回片尾藍色 `inside out`，231.8–233.2 秒，來源 ID `cL_B5W4gBRU-95`；排除白字 `from the`。此卡先前誤列一般歌詞，現為 34 張、全歌單 483 張
- 人工檢視 230.0–233.9 秒共 40 張、每 0.1 秒的完整來源畫面；新清單 `omission-0351-tasks.json` 與 `omission-0351-review.jpg`。沿用已完成 v2 OCR，未新增辨識執行；最後採用 `chant-boundary-tasks-blue-v3.json` 邊界清單
- 既有 SRT、ledger 與 refined 快照以 `.before-0351` 保留在影片目錄；更新 builder 後重建資料、SRT、QA、diff 與空耳對照，不修改原片。保留原先音樂播放區間及其他提示時間
- 此次為文字與畫面邊界核對，未完成直接聽校或正常速度播放驗收；未提交或推送

## With、Inside Out 音樂播放區間（2026-11-03）

- 依本次指定，沿用 LOVE ATTACK 的 `startSeconds`／`endSeconds` 播放限制：With 32–221 秒（0:32–3:41），Inside Out 24–237 秒（0:24–3:57）
- With 前奏從約 32 秒淡入，Inside Out 音樂約 24.1 秒進入；起點稍留餘裕。結束保留最後應援及歡呼尾巴，於後續聊天前停止；未更動 58 張提示、原文及絕對時間碼，也未重剪來源影片
- 判斷依來源畫面、0.1 秒音訊 RMS 與立體聲差分分析；分析保存在各影片 `music-boundary-analysis.json`，不宣稱已完成直接聽校
- 播放範圍同步於兩首 builder、來源資料及本機 ledger／QA，重建會保留。新增模擬測試確認起點、結束、再播放與提示全數落在區間內

## 新增 With、Inside Out 與固定歌曲網址（2026-11-03）

- 新增官方〈With〉（`cLtl2aFq_6M`，25 張）及〈백화요란 (Inside Out)〉（`cL_B5W4gBRU`，33 張）；目前 13 首、482 張。保留原歌單順序，新歌附於末尾
- 每首保存固定 `slug`，分享網址使用 `#with`、`#inside-out`、`#love-attack` 等歌名，不依顯示編號或陣列位置定位。調整排序或編號時保留 slug；歌名日後修改也保留既有 slug
- 舊 `#song-1` 至 `#song-11` 依原歌曲對照轉成歌名網址，重排後仍連到原曲。未知或無效片段回到歌單首曲；`#practice` 保留原本頁內練習定位行為
- 新歌僅收錄藍色應援，排除白色一般歌詞、括號內一般伴唱、片尾聊天與人物旁的小字；`노래 부르듯이` 為演唱指示，不列為要喊的文字。`함성` 在歌詞中的藍字保留韓文，有括號的歡呼標記顯示「（歡呼）」
- 兩首有效 GPU OCR 共 178 筆、零辨識執行錯誤。逐張檢視來源卡片及完整畫面 0.1 秒邊界；可辨識變黑時依變黑定位，Inside Out 的「보여줘」無變黑，依字幕出現。With 4 張另用連續畫面人工修正進入時間
- 原未標版本 inventory 因奇數裁切高度發生 YUV420 錯位，僅保留供追溯，沒有採用；有效來源是 `chant-ocr-tasks-v2.json`、`chant-ocr-results-v2.jsonl`。Paddle cuDNN 版本警告仍存在，但有效辨識完整完成且無 row error
- 本機證據保存在各自 `video/<id>/`，含原片、metadata、append-only OCR、ledger、原文 SRT、QA、diff 與邊界圖。新韓文卡片同步空耳初稿，仍待直接聽校
- 重建：`python scripts/build_rescene_with_inside_out.py --prepare`，再對 With 執行 `python scripts/rescene_chant_boundaries.py --id cLtl2aFq_6M --revision=-blue-v3`，Inside Out 使用 `--id cL_B5W4gBRU --revision=-blue-v3`；最後執行 `python scripts/build_rescene_with_inside_out.py` 與 `python scripts/apply_rescene_phonetics.py`。一般 finalizer 已委派新 builder；修改時間需另立邊界 revision
- 26 項播放器／應援／空耳測試、10 項 Pages 打包測試及兩首 SRT／OCR audit 通過；尚未完整逐句直接聽校、正常速度全卡可讀性／同步與實際 YouTube 播放驗收。未 commit、push 或部署

## 全歌單句尾顯示比對（2026-10-26）

- 依使用者確認，以來源字幕顯示為結束依據；同一行的分段提示仍在下一張卡的起點切換。11 首、424 張均檢視句尾對照圖，延長 273 張，起點、韓文原文、來源 ID 與核定空耳不變。
- 決策與全部卡片前後時間保存在 `cue-end-review.json`；摘要及逐卡表見 [CUE-END-REVIEW.md](CUE-END-REVIEW.md)。`python scripts/fix_rescene_cue_ends.py` 重套結束時間，之後執行 `python scripts/apply_rescene_phonetics.py` 更新空耳對照表。
- 官方、YoYo、Busy Boy builder 共用的 catalog 寫入程序會重新套用句尾決策；保留原始辨識與對齊證據，網站的 `displayEndBasis` 標記為 `reviewed-source-caption`。
- YoYo 第 4 張 `RESCENE!` 的現有時間與來源畫面不一致，保留原時間並列入起點待核對，不延長到後續一般歌詞。完整聽校、正常速度全卡可讀性與正式網站部署未驗收。

## UhUh 漏詞補回（2026-10-26）

- 官方影片 56.5–58.7、58.7–60.7 秒各補一張 `even know that`；112.2–113.1 秒補 `Oh!`，UhUh 現為 49 張，全歌單 424 張。
- 已以官方影片暫停逐格核對兩次重複字幕及 Oh! 的變黑；`Don't` 與前面的白色一般歌詞不加入。時間為約 0.1 秒畫面邊界精度，未量測喊聲尾音或完成正常速度聽校。
- 決策及畫面觀察保存於 `uhuh-omission-corrections.json`；執行 `python scripts/fix_rescene_uhuh_omissions.py` 可重套，官方歌單 finalizer 亦套用，重複執行不增加卡片。
- 本次為人工官方畫面檢查，未執行 GPU OCR；本機舊 OCR／ledger／SRT 未重建，網站資料為此次修正版。

## Pretty Girl 句尾顯示修正（2026-10-26）

- `안된다는 맘은` 結束由 206.7 改為 207.7 秒；`어디서나 당당하게 걷기` 由 216.3 改為 217.9 秒，起點、原文及來源 ID 保留。
- 依官方影片暫停逐格畫面核對字幕切換，邊界約 0.1 秒精度；未量測喊聲尾音，未完成全曲聽校或正常速度同步驗收。
- 決策保存於 `pretty-girl-timing-corrections.json`，執行 `python scripts/fix_rescene_pretty_girl_timing.py` 重套，再執行 `python scripts/apply_rescene_phonetics.py` 同步空耳對照表；官方歌單 finalizer 也會套用。
- 本機舊 OCR／ledger／SRT 未重建，本次更新網站提示與空耳對照表。

## 韓文應援空耳初稿（2026-10-26）

- 11 首、122 張含韓文卡片（97 種完整卡片文字）新增 `phoneticZh`：大字英文名字／空耳，小字保留韓文原文，預覽與下一句同步套用。原文、來源 ID、421 張卡片及時間軸保留。
- 藝名用 Woni、Liv、Minami、May、Zena，團名用 RESCENE，粉絲名用 REMINE。依使用者校訂，정원이 使用「衝丸妮」、진경은 使用「金ㄍㄧㄛ恩」、미나미 使用 Minami；이예빈 使用「伊耶彬」、김가영 使用「金嘎勇」，皆為使用者指定的空耳寫法。拆拍團名使用 RE! SCE! NE!，依韓文喊三拍。
- 全部為 `draft`，依韓文文字讀音製作，尚未逐句直接聽校；不能視為正式讀音、同步或全卡版面驗收。中文字不依國語聲調念，收尾注音不另喊一拍；保留少量拉丁音節輔助近似發音。
- 用字維護於 [phonetics.zh.json](phonetics.zh.json)，逐卡對照為 [phonetic-review.tsv](phonetic-review.tsv)。執行 `python scripts/apply_rescene_phonetics.py` 更新網站與對照表。全歌單、YoYo、Busy Boy builder 共用的 catalog 寫入程序也會重新套用對照；原 OCR ledger 與 SRT 仍是韓文證據，不改成空耳。
- 本次驗證涵蓋資料覆蓋率、來源與時間軸不變、重套一致性、倒數／暫停／切歌／結束顯示。內嵌瀏覽器無法連線本機預覽，320px／390px／桌機實際版面、YouTube 實播及全曲聽校待完成。

以 BABYMONSTER 練習室為基礎，建立獨立 `/rescene/`，主題為 Pulse 霧藍應援練習室。

- 霧藍、紙白與石墨灰為本網站設計配色，並非官方應援色。
- `songs.json` 為獨立歌單，收藏與偏好儲存在 `rescene-practice`。
- 收錄 13 首應援教學影片，包含 11 首官方教學與使用者指定的 YoYo、Busy Boy 教學；非演出歌單。Pretty Girl 與 LOVE ATTACK 保留原編號，一般官方影片保留為參考連結。
- 保留搜尋、收藏、切歌、速度、連續播放、專注模式與應援／字幕引擎。13 首已加入共 482 張應援提示，依來源畫面定位或詞句校時，逐句聽校待完成；未加入整首歌詞字幕。

## LOVE ATTACK 重複應援修正（2026-10-21）

- 「I am all you need」兩段字幕各有兩次變色，原擷取只保留每段第一次，現補入 154.1–155.4、158.5–159.7 秒，該句共四張卡，歌曲共 42 張卡。
- 核對官方來源 `xn12KH78Dx4` 的 151–161 秒全幅連續畫面及 151.5–159.9 秒每 0.1 秒文字變色；時間依畫面，不代表喊聲尾音已量測。未完成全曲聽校或實際 YouTube 同步驗收。
- 可追溯修正來源為 `love-attack-repeat-corrections.json`，疊加於既有網站卡片；執行 `python scripts/fix_rescene_love_attack_repeats.py` 可重建，重複執行不增加重複卡片。全歌單 finalizer 在輸出網站資料前亦套用此修正。
- 本機舊 OCR ledger／SRT 屬修正前版本；本次只重建網站提示，未重新產生全曲 OCR 產物。來源影片與新核對圖留在 `video/xn12KH78Dx4/`。
- 應援與播放器測試共 18 項通過，包含四次進入、回跳及非應援空檔；尚未提交或推送。
- Pretty Girl 影片：https://www.youtube.com/watch?v=qZlu2j2SiBA
- LOVE ATTACK 影片：https://www.youtube.com/watch?v=9XttLI0oH0I
- `pretty-girl.jpg` 為官方概念照原檔：https://pbs.twimg.com/media/HMCiE2DW4AAcDaQ.jpg
- 圖片出處：https://x.com/RESCENEofficial/status/2071881438056820939
- 設計概念參考：https://www.themuze.kr/prettygirl_
- 圖片與音樂權利屬原權利人；本站為非官方粉絲練習室。
- Pages 打包僅加入網站執行檔與圖片，不包含本文件。

本機預覽：於專案根目錄執行 `python -m http.server 8765 --bind 127.0.0.1`，開啟 `http://127.0.0.1:8765/rescene/`。

## 驗證紀錄（2026-09-25）

- Node 模擬播放器測試 6 項通過，涵蓋切歌、連續播放、錯誤、過期回呼與無提示資料的停用狀態。
- Pages 打包與差異比較測試 9 項通過，核對 RESCENE 執行檔及圖片納入、README 排除。
- 已檢視 1280px 桌機版與 390px 手機版，手機沒有橫向溢出；瀏覽器確認搜尋、收藏、切歌與專注模式。
- 本機內嵌瀏覽器中，兩支 YouTube 影片均回報無法播放，已確認錯誤提示及外部連結顯示；不視為實際影片播放驗收。
- 尚未提交、推送或部署。

- Banner 使用使用者提供的 Pulse 團體照 `pulse-banner.webp`（2640×1056），保留滿版照片下方獨立標題色帶；桌面與手機均按原始比例完整顯示五位成員。霧藍樣式由 `pulse.css` 覆寫共用的 `practice.css`，頁首維持原本架構。官方網站：https://artist.mnetplus.world/main/stg/rescene-official

## 官方應援教學來源（2026-09-26）

已核對官方頻道的影片標題與連結，並下載原片、擷取及逐一檢視可見應援文字。9 首的 `hasChant` 均已啟用，提示只綁定各自的官方教學影片。

| 編號 | 歌曲 | 官方應援影片 |
| --- | --- | --- |
| 1 | Pretty Girl | [RX592yMx7P0](https://www.youtube.com/watch?v=RX592yMx7P0) |
| 2 | LOVE ATTACK | [xn12KH78Dx4](https://www.youtube.com/watch?v=xn12KH78Dx4) |
| 3 | UhUh | [s1S-lnU-yMI](https://www.youtube.com/watch?v=s1S-lnU-yMI) |
| 4 | Pinball | [YyixhiYpkkY](https://www.youtube.com/watch?v=YyixhiYpkkY) |
| 5 | Glow Up | [-55bUrG1qjg](https://www.youtube.com/watch?v=-55bUrG1qjg) |
| 6 | Deja Vu | [9FlQOv6-Mjc](https://www.youtube.com/watch?v=9FlQOv6-Mjc) |
| 7 | Heart Drop | [VKlrVbgJG-g](https://www.youtube.com/watch?v=VKlrVbgJG-g) |
| 8 | Bloom | [Ma6IENHO584](https://www.youtube.com/watch?v=Ma6IENHO584) |
| 9 | Runaway | [7DZlkZ4bMpU](https://www.youtube.com/watch?v=7DZlkZ4bMpU) |

製作工作提示詞：[CHANT_PRODUCTION_PROMPT.md](CHANT_PRODUCTION_PROMPT.md)。

## 應援卡交付（2026-09-26）

| 歌曲 | 卡片數 |
| --- | ---: |
| Pretty Girl | 52 |
| LOVE ATTACK | 40 |
| UhUh | 49 |
| Pinball | 35 |
| Glow Up | 34 |
| Deja Vu | 46 |
| Heart Drop | 28 |
| Bloom | 30 |
| Runaway | 31 |
| 合計 | 342 |

- 原片、GPU OCR 紀錄、畫面證據、`chant-ledger.json`、原文 SRT、QA、`PROCESSING.md` 與 `UNRESOLVED.md` 均保存在各自的 `video/<video-id>/`。此目錄依專案規則留在本機，不納入網站打包。
- 3,334 筆 OCR 紀錄完成，執行裝置 `gpu:0`；原始 JSONL 未覆寫。每個接受事件都經看圖確認；0.1 秒邊界取樣與原始 OCR 分開保存，最終邊界清單為 `chant-boundary-tasks-final2.json`。
- 只收錄有應援標記的文字，排除白色普通歌詞與片尾談話。Pretty Girl 同行不同時機的回應已拆卡，UhUh 兩次縮短後重複的句子各自保留。
- 提示起點依畫面變色或字幕出現定位。短詞盡量顯示至少 0.6 秒，受原字幕結束及下一卡限制；歡呼顯示至標記結束。顯示終點不是實際喊聲尾音。
- `timingBasis: caption` 保留「本句應援」標示；尚未逐句聽校，也未設定未驗證的音樂段落裁切。
- 韓文保留原文，英文保留原文，歡呼顯示「（歡呼）」。長連續句換行，手機韓文名字優先整詞換行，未加入中文諧音。

### 驗證

- `node tests/test_rescene_practice.cjs`：7 項通過，包含切歌、連播、暫停、倍速倒數、重練與單句循環的模擬驗證。
- `node tests/test_rescene_chant.cjs`：4 項通過，檢查全部 342 張卡片的來源綁定、邊界、回跳、重複事件與已知來源修正。
- `python -m unittest discover -s tests -p test_prepare_pages.py`：9 項通過。
- 9 首均通過 skill 的 OCR JSONL 與 SRT 結構 audit；每首報告為 `chant-skill-audit.json`。
- 瀏覽器確認 Pretty Girl / UhUh 切換及提示、標準／特大字級、專注模式；檢視 320px、390px 與 1280px，沒有橫向溢出。這是代表性卡片的版面檢查，並非全部卡片的逐張瀏覽器驗收。
- 本機內嵌 YouTube 載入逾時；未完成實際影片播放同步與全曲聽校。自動播放器模擬不替代這兩項驗收。

### 重建資料

`python scripts/finalize_rescene_chants.py` 會從保存的 reviewed events 建立 ledger，再從 ledger 產生網站卡片、SRT 與 QA。修改時間後先用 `--prepare` 固定顯示區間，另建新版本邊界清單並更新 finalizer 的清單名稱；原始 OCR 和既有邊界清單不得覆寫。

本次只完成本機製作，尚未提交、推送或部署。


## 播放起訖與片尾歡呼（2026-09-26）

依使用者要求設定各官方教學來源的 `startSeconds` / `endSeconds`。起點為音訊初查候選前約 0.2 秒；UhUh 與 Bloom 採較早候選，保留可能的前奏與倒數。結束包含歌曲後的應援歡呼，延伸至片尾談話附近。應援卡維持原影片絕對時間，不隨起點平移。

| 歌曲 | 開始（秒） | 結束（秒） |
| --- | ---: | ---: |
| Pretty Girl | 26.3 | 234.2 |
| LOVE ATTACK | 19.1 | 201 |
| UhUh | 25.6 | 230 |
| Pinball | 20.6 | 214 |
| Glow Up | 32.8 | 183 |
| Deja Vu | 63.1 | 254 |
| Heart Drop | 39.4 | 227 |
| Bloom | 24.9 | 200 |
| Runaway | 33.4 | 220 |

依本機來源音訊的波形、頻譜與片尾抽樣畫面設定；尚未完成逐段聽校與實際 YouTube 裁切驗收。結尾以保留歡呼為優先，可能包含緊接歡呼的少量談話。所有 342 張應援卡均完整落在播放範圍內。

## YoYo 應援提示（2026-10-01）

- 第 10 首 YoYo 使用指定影片 [ykVJo0wFlQ4](https://www.youtube.com/watch?v=ykVJo0wFlQ4)，發布者為ゆっぴー，非 RESCENE 官方頻道。原有 9 首來源、順序與提示均未變。
- 新增 29 張提示，總計 371 張。只擷取藍色應援文字，排除黑色普通歌詞；韓文與英文保留原文，日文「歓声」顯示為「（歡呼）」。未製作中文諧音。
- 原片與證據保存在 `video/ykVJo0wFlQ4/`。全片 0.1 秒畫面取樣，99 個候選區間及 5 張 review sheets 全部檢視；GPU OCR 99/99，裝置 `gpu:0`，無辨識執行錯誤。執行時有 cuDNN 9.9/9.5 版本警告，未視為已修復。
- 29 個接受事件另存 290 筆全幅邊界畫面參照，檢視 3 張邊界裁切對照表。提示依字幕顯示區間定位，最後歡呼卡止於片尾淡出前 217.4 秒；尚未逐句聽校，不宣稱喊聲已同步。保留完整指定影片，不設定未驗證裁切。
- `node tests/test_rescene_chant.cjs` 5 項、`node tests/test_rescene_practice.cjs` 8 項、Pages 打包測試 9 項全部通過。skill OCR／SRT audit 通過：29 區塊、連續編號、有效時間、無空白、無重疊。
- 瀏覽器確認切換 YoYo 與首張提示；首張名字卡在 320px、390px、1280px 可讀且無橫向溢出。這是代表性版面檢查，不是 29 張卡的逐張瀏覽器驗收。內嵌 YouTube 回報無法播放，實際播放同步與全曲聽校待完成。
- YoYo 單獨重建：`python scripts/build_rescene_yoyo.py --prepare`，再執行 `python scripts/rescene_chant_boundaries.py --id ykVJo0wFlQ4 --revision=-yoyo-v2`，最後 `python scripts/build_rescene_yoyo.py`。既有 v1 邊界清單保留，v2 為最終清單。既有全歌單 finalizer 亦會委派此 builder 處理 YoYo。
- 本次僅本機製作，未 commit、push 或部署。本機預覽：`http://127.0.0.1:8765/rescene/#song-10`。

## Busy Boy 應援提示（2026-10-01）

- 第 11 首使用指定影片 [hc1HS71j6oY](https://www.youtube.com/watch?v=hc1HS71j6oY)，發布者為농담곰탕탕후루，非官方頻道。新增 36 張提示，歌單總計 407 張；原有 10 首順序與資料保留。
- 只收錄粉紅應援文字，排除黑白普通歌詞；韓文／英文保留原文，`함성` 顯示「（歡呼）」，共 4 張。名字依畫面保留韓文，未加入中文諧音。
- 全片粉紅文字層 0.1 秒取樣，52 個候選、3 張候選對照表及 3 張邊界對照表全部檢視。GPU OCR 52/52，gpu:0，0 錯誤；cuDNN 9.9/9.5 警告保留，未宣稱修復。
- 36 個事件有 357 筆全幅邊界參照；v1 清單保留，v2 排除片尾超出解碼取樣範圍的參照。提示使用絕對字幕區間；同句兩個粉紅 busy 保留為 `busy busy`，兩次喊聲的個別起點未量測。保留完整來源，不設定未聽校的裁切。
- `node tests/test_rescene_chant.cjs` 6 項、`node tests/test_rescene_practice.cjs` 9 項及 Pages 打包測試 9 項通過；OCR／SRT audit 通過，36 區塊，連續編號、有效時間、無空白或重疊。
- 瀏覽器確認切換 Busy Boy、影片來源與首張提示；320px、390px、1280px 名字卡可讀且無橫向溢出。實際 YouTube 已成功播放，抽查 42 秒的歡呼提示與 8.5 秒名字卡；尚未完成全曲逐句聽校、所有卡片逐張版面或全曲同步驗收。
- 證據及產物在 `video/hc1HS71j6oY/`，包含原片、ledger、原文 SRT、QA、diff、待驗證清單及桌機／手機截圖。單曲重建：`python scripts/build_rescene_busy_boy.py --prepare`，`python scripts/rescene_chant_boundaries.py --id hc1HS71j6oY --revision=-busy-boy-v2`，`python scripts/build_rescene_busy_boy.py`；全歌單 finalizer 亦會委派此 builder。
- 本次僅本機製作，未 commit、push 或部署。[本機預覽](http://127.0.0.1:8765/rescene/#song-11)。

### Busy Boy 進入時間修正 v3（2026-10-01）

- 初版把整句字幕時間當成應援進入點，並在等待期間以大字預覽下一句，造成提早感。Busy Boy 現改為 entry-only：等待或倒數時，大字區留白，下一句只在小字區預告
- 36 個原事件全部有決策：19 個調整進入時間、12 個 busy busy 拆成第二／第四個 busy、5 個保留；修正後 48 張提示，歌單共 419 張
- 例如 behind 16.7 → 19.0、dream 29.0 → 30.1、Busy boy 56.5 → 58.1 秒；每個事件按本次詞位置修正，未做整首固定平移
- 校時證據：Whisper large-v3／medium 全曲 ASR與各 32 個局部對齊視窗、英文 CTC 24 個及韓文 CTC 17 個視窗、5 個重複段落波形比對。ASR 幻覺、零長度重複及 CTC 錯配不採用；韓文短音節與歡呼仍為候選，並非完整人工聽校
- 477 筆新邊界畫面與 4 張對照表完成檢視，確認原應援內容；原 caption-v2 ledger、SRT 與處理紀錄保留。新時間由 entry-timing-reviewed.v3.json → chant-refined.v3.json → ledger／SRT／songs.json 產生
- 應援測試 7 項、播放器測試 9 項及 Pages 打包測試 9 項通過；新 SRT 結構 audit 通過
- 重建：python scripts/build_rescene_busy_boy.py --prepare，python scripts/rescene_chant_boundaries.py --id hc1HS71j6oY --revision=-busy-boy-v3 --events chant-refined.v3.json，python scripts/build_rescene_busy_boy.py
- 未 commit、push 或部署；全曲逐句聽校及全曲 YouTube 同步待完成

- 瀏覽器修正版抽查：16.7 秒為等待、19.1 秒顯示 behind、53.2 秒為等待、53.7 秒顯示單次 busy；截圖 browser-entry-v3.png。這是指定時點行為驗證，不是全曲聽校或全曲同步驗收

### 大字預告恢復（2026-10-01）

依使用者要求恢復原本提示邏輯：未進場時先以大字顯示下一句，進入前 3 秒顯示倍速換算倒數，到達 cue.start 才切換正式應援狀態。移除 entry-only 設定，沒有「等待進場」文字；Busy Boy 的 48 張卡片及 v3 校正時間保留

### YoYo 整首進入時間核對（2026-10-21）

- 29 張卡片均重新比對指定來源畫面。12 張改用對應應援詞的進入時間，17 張保留；大字預告與倒數行為維持原設定
- 原資料把整句字幕的出現時間套到句尾藍色應援詞。例：찾아내 10.8 → 13.1、집중해 14.6 → 17.6、날리면 28.3 → 31.4、소나기 104.3 → 106.8 秒；五次 We're going 後的 Up down 分別校正
- 逐卡原值、新值、修正／保留理由及來源雜湊在 `yoyo-entry-timing.json`。使用 `python scripts/build_rescene_yoyo.py --retime` 可重套用；完整 builder 亦會套用此版本，避免重建回退
- Whisper large-v3／medium 各完成 9 個重疊全曲視窗，另完成 56 個局部 DTW 與 27 個 Qwen 對齊視窗。幻覺、零長度與貼齊裁切邊界的結果不直接採用。這些為模型證據，未完成全曲人工聽校或實際 YouTube 同步驗收
- 3 張歡呼與保留卡片仍待聽校；리센느 23.9 秒為模型候選，其顯示延至 24.7 秒以保留 0.8 秒閱讀時間，並非喊聲尾音量測
- 本機證據及完整表格：`video/ykVJo0wFlQ4/TIMING-REVIEW-v3.md`；原畫面時間快照為 `caption-v2.snapshot.json`。舊 OCR 產物與 `chant.gpu-rescan.srt` 代表 caption-v2；目前網站時間以 entry-v3 review 為準
- 應援／播放器 17 項測試通過，包含實際重現並修復提前進入的回歸案例。未提交、推送或部署

## 練習室 UI／UX 調整（2026-11-14）

- 改版前狀態已保存於本機提交 `58f27e4`（含現有設計預覽）；本輪新版尚未提交或推送。
- 頁首、完整比例團體照與完整逐句應援清單保留；放大練習區仍顯示頁首與團體照。
- 1280px 以上歌單置左，影片與應援並排；較窄螢幕歌單置下，900px 以下影片與應援上下排列。
- 播放、上一句／下一句、重練、倒退、循環與速度移出設定，常駐應援清單下方；設定只保留顯示方式與字級。
- 應援列顯示時間與目前句／下一句文字標記；來源文字、時間軸、收藏與播放邏輯保持原有資料。
- 29 項 Node 功能測試及 10 項 Pages 打包測試通過。內嵌瀏覽器存取本機預覽逾時，實際響應式畫面及 YouTube 播放同步尚未驗收。

## With 現場版（2026-11-14）

- With 新增「影片版本」選單，保留官方教學並加入使用者指定的 KBS Kpop 現場版 `pUNac5ECLeg`。歌曲仍為 13 首，原收藏與編號不變。
- `#with` 為教學版，`#with/live` 直接開啟現場版；切換版本後暫停等待播放，失敗重試沿用所選版本。
- 現場版 27 張提示以音訊互相關確認整曲偏移 -31.437 秒，保留核定原文及空耳，播放範圍 0–189.563 秒。跳句、倒數與單句循環使用該來源的時間軸。
- `scripts/add_rescene_with_live.py` 可重建，共用 catalog writer 已接入；現場版資料保存在對應 source 的 `chant`，不修改教學版 track。
- 來源、逐卡比對、代表畫面、SHA-256、SRT 與 QA 保存在 `video/pUNac5ECLeg/`。開頭與片尾歡呼的音訊匹配信心較低，採整曲音樂映射，並非實際觀眾喊聲辨識。
- 31 項 Node 測試、10 項 Pages 打包測試通過；原教學版資料保持相等、重建可重複。尚未正常速度全片播放、直接聽校或 YouTube 實播驗收。未提交、推送或部署本輪變更。

## Inside Out 現場版（2026-11-14）

- 新增使用者指定的 Show Champion 現場版 `_hvATW8DixU`，按鈕可切換官方教學與現場版；`#inside-out/live` 可直接開啟，歌曲與收藏編號不變。
- 34 張原文／空耳依全曲與逐卡音訊比對平移 -23.100 秒，現場練習範圍 0–213.9 秒；倒數、跳句、循環使用獨立時間軸，原教學版保持不變。
- 重建腳本 `scripts/add_rescene_inside_out_live.py` 已接入共用 catalog writer。來源、比對、抽樣畫面與 QA 保存在 `video/_hvATW8DixU/`。
- 32 項 Node 測試、10 項 Pages 打包測試通過；部分現場喊聲／歡呼附近比對分數較低，使用整曲音樂映射，完整播放與直接聽校未完成。本輪未提交或推送。

## LOVE ATTACK 現場版（2026-11-14）

- 新增指定 M COUNTDOWN 現場版 `ajhEFz1zNMQ`，固定網址 `#love-attack/live`；原官方教學與 MV 來源保留。
- 依使用者指定由 00:09 開始，播放至 194.939 秒；42 張應援依全曲及逐卡音訊比對平移 -6.061 秒，倒數、跳句、循環使用現場原影片絕對時間。
- 重建腳本 `scripts/add_rescene_love_attack_live.py` 已接入共用 writer；來源與 QA 留存 `video/ajhEFz1zNMQ/`。
- 33 項 Node 測試、10 項打包測試通過；正常速度播放、直接聽校及嵌入實播尚未完成。未提交或推送本輪變更。
