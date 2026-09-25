# RESCENE 應援練習室

以 BABYMONSTER 練習室為基礎，建立獨立 `/rescene/`，主題為 Pretty Girl 粉紅音樂房。

- 奶油白、柔粉紅、莓果粉為本網站設計配色，並非官方應援色。
- `songs.json` 為獨立歌單，收藏與偏好儲存在 `rescene-practice`。
- 首波包含 Pretty Girl 官方 Special Video 與 LOVE ATTACK 官方 MV；非演出歌單。
- 保留搜尋、收藏、切歌、速度、連續播放、專注模式與應援／字幕引擎。尚未製作或校對逐句應援與字幕，相關控制會依資料狀態停用。
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
