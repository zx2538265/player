# BIGBANG 應援練習室

依 2026/9/11 MetLife Stadium 場的觀眾歌單紀錄排列 32 首（不含 VCR、band jam 與預錄串場）。可切換單曲、播放 YouTube 教學、調整速度、倒退 5 秒，並開啟各首應援來源。FANTASTIC BABY、HANDS UP、TONIGHT 提供應援大字與進場倒數；不含 A–B 循環或段落儲存功能。

## 應援大字示範

- FANTASTIC BABY 依 `5eiytN0_YR8` 教學影片的黃色提示整理 37 段；不將白色歌詞翻譯當成應援。韓文段落沿用影片所印中文空耳作為發音提示；原羅馬拼音保留於處理紀錄，不自行改稱官方版本。
- HANDS UP 依指定的 `0o7qE6pCxI0` 紅字整理 12 段，只收錄 `HEY HO HEY HO` 與 `HANDS UP HIGH HIGH & LOW`，不加入白字歌詞或藍字舉手／移動說明。
- TONIGHT 依指定的 `pJGOF3l2_88` 黃色大字整理 38 段；`na na na` 使用原片中文空耳「娜 娜 娜」，不使用上排意思「我 我 我」。`O A O`／`O A O O O` 原片沒有中文空耳，保留原片字母提示並列為缺少中文空耳項目。重複的 BIG BANG、NO WAY、OK、SO WHAT、NO MORE、TONIGHT 與三次 MOVIN’ 依動畫分開記錄。
- `songs.json` 的 `chant.videoId` 必須符合實際嵌入影片；其他歌曲顯示尚未建立提示。`chant.js` 以目前影片時間決定提示，切歌、倒退與拖曳進度不沿用前一次狀態。
- 進場前最多倒數 3 個實際秒數，依播放速度換算；密集應援先顯示當前句，空檔不足時從剩餘秒數接續，不硬塞完整倒數。暫停、緩衝、未播放時不顯示「現在喊」或繼續倒數。
- 提示放在影片下方，可關閉；YouTube 自身全螢幕不包含本站提示區。
- 畫面證據、逐段紀錄與 QA 保存在 `video/5eiytN0_YR8/`，不打包進公開網站。已人工閱讀 37 段及邊界聯絡表，使用 0.1 秒取樣輔助校時；尚未完成全片逐句聽校或確認 2026 現場編排。
- 第二、三首的原始影片、SHA-256、候選／邊界／定稿畫面與 `chant-ledger.json`、`chant-qa.json`、`PROCESSING.md` 分別保存在 `video/0o7qE6pCxI0/`、`video/pJGOF3l2_88/`。50 段均經畫面閱讀與邊界核對；時間依教學提示動畫，不等於已完成音訊起訖聽校。沒有自行補寫中文空耳。
- 本次實播抽查 HANDS UP 的 HEY HO、長句及半速倒數，TONIGHT 的「娜 娜 娜」、倒退及兩倍速倒數；另測切歌與暫停。手機 390px、320px 檢查，修正影片最小高度搭配寬高比在窄版撐寬的問題。這是瀏覽器尺寸模擬，非實體手機或全片逐句聽校驗收。
- 驗證：`node tests/test_bigbang_chant.cjs`、`node tests/test_bigbang_continuous.cjs`。

## 連續播放

「連續播放」預設關閉。開啟並播放影片後，結束時按歌單順序接續，跳過沒有嵌入影片的曲目與 YouTube 明確回報播放失敗的影片；最後一首結束即停止。播放中手動切歌會繼續播放，暫停時切歌不會自動播放。載入較慢不會跳過；瀏覽器阻擋自動播放時會提示點擊播放。

以 `node tests/test_bigbang_continuous.cjs` 驗證切歌狀態、缺少影片、錯誤、結尾停止與關閉開關等行為。測試模擬 YouTube API 事件，不代表全部外部影片實播驗收。

## 本機開啟

在 repository 根目錄執行 `python -m http.server 8766 --bind 127.0.0.1`，開啟 `http://127.0.0.1:8766/bigbang/`。需透過 HTTP / HTTPS 開啟並可連線至 YouTube，不使用 file URL。`#song-15` 等網址片段可直達指定曲目。

## 來源

- [9/11 場 setlist.fm 觀眾紀錄](https://www.setlist.fm/setlist/bigbang/2026/metlife-stadium-east-rutherford-nj-1b7555fc.html)：作為指定排序，非官方固定巡演歌單
- `songs.json` 保存原始短網址、解析後網址、來源標題、YouTube ID 與版本備註。短網址於 2026-09-22 解析；不代表所有目的頁內容或影片均已完整驗收

## 已知差異

- Wings、POWER：應援為 Threads 外連
- IF YOU、Look at Me, Gwisun、SOBER、FEELING：沒有應援影片，顯示應援來源待補
- BAD、FLOWER ROAD：尚未找到應援，提供官方影片／音源
- MY HEAVEN：表格應援實際連到韓文 Heaven（천국），已標示語言版本差異
- STILL LIFE：表格收錄太陽演唱會版本，與團體巡演的適用性待核對
- 全部來源尚未逐句聽校或確認 2026 現場編排

## 驗證

32 首編號及 29 個來源資料檢查、JavaScript 語法檢查通過。瀏覽器驗證首尾曲與 Threads／無來源／官方影片切換，來源及播放器顯示符合曲目，未出現 JavaScript console error。FANTASTIC BABY 嵌入已可載入；未逐支播放驗收所有影片。手機版面檢查無水平溢出。

本頁已加入既有 Pages 建置流程，公開路徑為 `/bigbang/`；README 不包含在網站發布產物。
