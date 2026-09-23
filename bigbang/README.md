# BIGBANG 應援練習室

依 2026/9/11 MetLife Stadium 場的觀眾歌單紀錄排列 32 首（不含 VCR、band jam 與預錄串場）。可切換單曲、播放 YouTube 教學、調整速度、倒退 5 秒，並開啟各首應援來源。FANTASTIC BABY、HANDS UP、TONIGHT、BLUE、LOSER、BAD BOY、BAE BAE、LIES、Universe 提供應援大字與進場倒數；不含 A–B 循環或段落儲存功能。

## 應援大字示範

- LIES 使用 `KBTJI9oxcI8` 現場影片，僅保留指定 Threads 三人新版開場的 7 句空耳（約 5.62～12.52 秒），分成 3 張提示以減少快速切換與空檔倒數閃爍：三個名字、VIP 與中間口號、最後 BIGBANG 口號。備註「後面跟著合唱」。開場後沒有其他應援提示，舊五人開場不採用。HARU HARU 維持原來源。
- LIES 開場喊點仍暫定，尚未逐句聽校；畫面與音訊偏移依據保存在本機 `video/KBTJI9oxcI8/`。自動時鐘測試與本機副本播放不等於 YouTube 實播驗收。

- FANTASTIC BABY 依 `5eiytN0_YR8` 教學影片的黃色提示整理 37 段；不將白色歌詞翻譯當成應援。韓文段落沿用影片所印中文空耳作為發音提示；原羅馬拼音保留於處理紀錄，不自行改稱官方版本。
- HANDS UP 依指定的 `0o7qE6pCxI0` 紅字整理 12 段，只收錄 `HEY HO HEY HO` 與 `HANDS UP HIGH HIGH & LOW`，不加入白字歌詞或藍字舉手／移動說明。
- TONIGHT 依指定的 `pJGOF3l2_88` 黃色大字整理 38 段；`na na na` 使用原片中文空耳「娜 娜 娜」，不使用上排意思「我 我 我」。`O A O`／`O A O O O` 原片沒有中文空耳，保留原片字母提示並列為缺少中文空耳項目。重複的 BIG BANG、NO WAY、OK、SO WHAT、NO MORE、TONIGHT 與三次 MOVIN’ 依動畫分開記錄。
- BLUE 依 `BaZAcJYawPI` 黃色大字及原片空耳整理 14 段，時間依提示動畫。LOSER 依 `d-y_er6QS1k` 黃字及粉紅空耳整理 13 段；整行歌詞提早出現，改用音訊候選時間，全部仍待逐句聽校，頁面明示暫定。
- 第四、五首的影片、畫面、逐段時間與驗證紀錄保存在各自 `video/<videoId>/PROCESSING.md`、`chant-ledger.json`、`chant-qa.json`。BLUE 已抽查半速倒數、進出、暫停、倒退與切歌；LOSER 嵌入回報無法播放，實播同步未完成。320px／390px 預覽無水平溢出，不代表全片聽校或所有長句驗收。
- `songs.json` 的 `chant.videoId` 必須符合實際嵌入影片；其他歌曲顯示尚未建立提示。`chant.js` 以目前影片時間決定提示，切歌、倒退與拖曳進度不沿用前一次狀態。
- 進場前最多倒數 3 個實際秒數，依播放速度換算；密集應援先顯示當前句，空檔不足時從剩餘秒數接續，不硬塞完整倒數。暫停、緩衝、未播放時不顯示「現在喊」或繼續倒數。
- 提示放在影片下方，可關閉；YouTube 自身全螢幕不包含本站提示區。
- 畫面證據、逐段紀錄與 QA 保存在 `video/5eiytN0_YR8/`，不打包進公開網站。已人工閱讀 37 段及邊界聯絡表，使用 0.1 秒取樣輔助校時；尚未完成全片逐句聽校或確認 2026 現場編排。
- 第二、三首的原始影片、SHA-256、候選／邊界／定稿畫面與 `chant-ledger.json`、`chant-qa.json`、`PROCESSING.md` 分別保存在 `video/0o7qE6pCxI0/`、`video/pJGOF3l2_88/`。50 段均經畫面閱讀與邊界核對；時間依教學提示動畫，不等於已完成音訊起訖聽校。沒有自行補寫中文空耳。
- 本次實播抽查 HANDS UP 的 HEY HO、長句及半速倒數，TONIGHT 的「娜 娜 娜」、倒退及兩倍速倒數；另測切歌與暫停。手機 390px、320px 檢查，修正影片最小高度搭配寬高比在窄版撐寬的問題。這是瀏覽器尺寸模擬，非實體手機或全片逐句聽校驗收。
- 驗證：`node tests/test_bigbang_chant.cjs`、`node tests/test_bigbang_continuous.cjs`。

## 第七、八首核對狀態（2026-09-23）

- BAD BOY 保留 `-PCCobymTas`，加入 26 段黃字應援；只取 MEAN、REAL、BAD BOY、GOOD GIRL、LEAVE ME、LOVE ME、LADY 及結尾接唱，不加入整行白字歌詞。結尾每頁兩次黃字接唱合併為一段，排除前面的白字主唱。
- BAE BAE 保留 `6iF7adiEHVk`，加入 12 段；韓文使用原片粉紅空耳，最長句固定換行。`5 X 5` 空耳經使用者確認為「喔扣趴gi喔」，已加入 84.8–86.3 秒提示，時間仍暫定；原片畫面與候選時間保留於 ledger。
- 兩首整行歌詞均提前顯示，網站喊點使用音訊候選，BAD BOY 部分段落另依重複樂句暫估，全部仍待聽校。BAE BAE 最後一句的模型進場差異超過兩秒，不能當成已確認時間。
- BAD BOY 可考慮 00:24 跳過片頭，僅列建議，未套用；BAE BAE 不建議跳過。BLUE 原有 `startSeconds: 17` 與其應援絕對時間保持不變。
- 每首 `video/<videoId>/` 保存原片、音訊、畫面、0.1 秒邊界圖、逐段 `chant-ledger.json`、`chant-qa.json`、`PROCESSING.md` 與手機截圖。自動應援 8/8、連播 6/6 通過，包含新增兩首的模擬時鐘與控制事件。320px／390px 正式頁面及原先 37 段文字帶倒數無水平溢出；這是瀏覽器尺寸模擬。
- 兩首 YouTube 嵌入都回報「無法播放這部影片」，因此實際進出、倒數、調速、暫停、倒退與播放中切歌未驗收；沒有換片。人工逐句聽校 0 段，模型比對不算聽校，未宣稱全片驗收。

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
- IF YOU、Look at Me, Gwisun、BAD、SOBER、FEELING：沒有應援影片，顯示應援來源待補
- FLOWER ROAD：尚未找到應援，提供官方影片／音源
- MY HEAVEN：表格應援實際連到韓文 Heaven（천국），已標示語言版本差異
- STILL LIFE：表格收錄太陽演唱會版本，與團體巡演的適用性待核對
- 全部來源尚未逐句聽校或確認 2026 現場編排

## 驗證

32 首編號及 29 個來源資料檢查、JavaScript 語法檢查通過。瀏覽器驗證首尾曲與 Threads／無來源／官方影片切換，來源及播放器顯示符合曲目，未出現 JavaScript console error。FANTASTIC BABY 嵌入已可載入；未逐支播放驗收所有影片。手機版面檢查無水平溢出。

本頁已加入既有 Pages 建置流程，公開路徑為 `/bigbang/`；README 不包含在網站發布產物。

## Universe（2026-09-23）

- 使用指定影片 `DxlZVaEO9B4`，移除舊教學片 `Su2kSDRdy5s` 的 00:25–01:21 限制，從新影片開頭播放至結尾
- 依全片每秒畫面及邊界畫面核對，收錄 19 段藍色粉絲喊唱／黃色合唱提示，排除白字一般歌詞；空耳依新片畫面
- 時間採字幕顯示區間暫定，可能早於實際喊點；逐句聽校 0/19，YouTube 實播同步尚未驗收
- `video/DxlZVaEO9B4/` 保存原片、metadata、完整抽幀圖、邊界圖及含 SHA-256 的 chant-ledger.json；舊來源證據保留
