# RESCENE 應援練習室

以 BABYMONSTER 練習室為基礎，建立獨立 `/rescene/`，主題為 Pretty Girl 粉紅音樂房。

- 奶油白、柔粉紅、莓果粉為本網站設計配色，並非官方應援色。
- `songs.json` 為獨立歌單，收藏與偏好儲存在 `rescene-practice`。
- 收錄 11 首應援教學影片，包含 9 首官方教學與使用者指定的 YoYo、Busy Boy 教學；非演出歌單。Pretty Girl 與 LOVE ATTACK 保留原編號，一般官方影片保留為參考連結。
- 保留搜尋、收藏、切歌、速度、連續播放、專注模式與應援／字幕引擎。11 首已加入共 419 張應援提示，依來源畫面定位或詞句校時，逐句聽校待完成；未加入整首歌詞字幕。
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

- Banner 改用 Mnet Plus 官方橫向素材 `banner.png`，滿版照片下方獨立標題色帶，手機照片高度 290px、置中裁切。來源：https://artist.mnetplus.world/main/stg/rescene-official/home

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
| UhUh | 46 |
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
