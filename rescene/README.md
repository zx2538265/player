# RESCENE 應援練習室

以 BABYMONSTER 練習室為基礎，建立獨立 `/rescene/`，主題為 Pretty Girl 粉紅音樂房。

- 奶油白、柔粉紅、莓果粉為本網站設計配色，並非官方應援色。
- `songs.json` 為獨立歌單，收藏與偏好儲存在 `rescene-practice`。
- 收錄 9 首官方應援教學影片；非演出歌單。Pretty Girl 與 LOVE ATTACK 保留原編號，一般官方影片保留為參考連結。
- 保留搜尋、收藏、切歌、速度、連續播放、專注模式與應援／字幕引擎。9 首已加入共 342 張應援提示，依官方畫面定位，逐句聽校待完成；未加入整首歌詞字幕。
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
