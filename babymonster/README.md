# BABYMONSTER 應援練習室

- 韓文應援空耳 v1：8 首歌曲、40 張韓文提示卡新增獨立 `phoneticZh` 欄位，大字顯示中文空耳、小字保留 `text` 原文；下一句亦顯示空耳，歌詞字幕不變。BATTER UP 的 3 張沿用來源影片空耳，其餘 37 張為自製近似讀音初稿，尚未逐句聽校，非官方文字。`phoneticStatus` 區分 `source`／`draft`，`phoneticNote` 保存發音與驗證說明；原時間碼、影片 ID 與來源文字保留。中文版包含少量注音收尾提示，中文字不依國語聲調念。

- FOREVER（第 21 首）使用指定 Moon Light 非官方應援影片 `6qGzeS2zfOk`，共 30 張藍字應援、拍手與歡呼提示。以 Whisper large-v3／medium 及英韓 CTC 輔助校正句中進入點，快速韓文三詞拆開顯示；黑字歌詞與成員反應字幕不納入。九次 Forever 與拍手保留，副歌及部分短詞的定位仍有分歧，維持「本句應援」標示。尚未完成全段人工聽校或 YouTube 實播同步驗收；原始畫面證據、模型結果及逐項決策保存於 `video/6qGzeS2zfOk/timing-review.v2.json`，以 `build_chant_v2.py` 重建。

以 BIGBANG 練習室為基礎，採用使用者提供的 CHOOM 海報、深藍與冰藍配色。

- 入口：`babymonster/index.html`，需透過 HTTP 靜態伺服器開啟
- 歌單：[2026-06-28 Jamsil Arena](https://www.setlist.fm/setlist/babymonster/2026/jamsil-arena-seoul-south-korea-4376a3d7.html)，於 2026-09-24 核對
- 30 個歌曲項目；第 15～17 項依序為 Stuck in the Middle、Love, Maybe、DREAM，分開列出；不含 Ment / VCR，保留個人舞台、安可與重複版本
- `songs.json` 為獨立資料來源，收藏及偏好使用 `babymonster-practice` 儲存
- WE GO UP 使用指定影片 `x4b_9YdhT8M`，播放範圍 00:31～03:40，已加入 50 張應援提示；依星號文字與綠色提示逐段核對，快速短句合併顯示，未加入一般歌詞或自製中文空耳
- 提示時間依畫面暫定；已完成文字與 0.1 秒邊界畫面檢查，尚未完成全段聽校與 YouTube 實播驗證。證據、決策表及產生程式位於 `video/x4b_9YdhT8M/`
- CHOOM 使用指定影片 `9DlDGxKQsDg`，播放範圍 00:30～03:25，已加入 37 張應援提示；依白字轉黃字標示核對，排除深藍色一般歌詞，短促 Choom 與後續 Watch out 合併顯示。已核對文字與 0.1 秒邊界候選，尚未完成全段聽校與 YouTube 實播驗證；證據位於 `video/9DlDGxKQsDg/`
- BATTER UP（第 3 首）使用指定影片 `CRSVJA-dKWo`（艾倫Allen），已加入 34 張紅字應援提示；韓文提示保留原文與影片提供的羅馬字、中文／注音空耳，白色歌詞不納入。開場先在心中數兩個八拍
- BATTER UP 原版已核對 8 張逐秒總覽及 204 張 0.1 秒邊界畫面；v2 以音訊詞語對齊修正 16 處行內接唱進入點，包含兩次 Move on、Monsters of the world、어디든，避免把整行字幕出現時間當成喊唱時間。完成模型交叉校時與狀態回歸測試，尚未完成全段聽校與 YouTube 實播驗證。原版證據與 v2 決策表、產生程式位於 `video/CRSVJA-dKWo/`；第 28 首 Encore Remix 保持待補
- DRIP（第 4 首）使用指定影片 `X2GfGkH-3hg`，播放範圍 00:52～03:52，加入 42 張粉紅字應援提示；副歌七聲 Drip 只喊第 1、3、5、7 聲，保留握拳高舉指示。已核對全段逐秒畫面與 252 張邊界畫面，並以兩個模型輔助接唱校時；部分時間仍為暫定，尤其結尾第二組 Drip，尚未完成全段聽校與 YouTube 實播驗證。證據與決策表位於 `video/X2GfGkH-3hg/`
- SUGAR HONEY ICE TEA（第 24 首）使用指定影片 `xN3X_tl4zlQ`，播放範圍 00:30～03:25，加入 55 張黃字應援提示；排除深紅色一般歌詞，保留兩次開場拼字，合併短句 this / You wish 與閃爍的結尾歡呼。已核對逐秒總覽及 216 張邊界候選畫面；01:31.5 的 yeah you know it 在來源中提早轉黃，時間依畫面暫定，尚未完成全段聽校與 YouTube 實播驗證。證據位於 `video/xN3X_tl4zlQ/`
- CLIK CLAK（第 6 首）播放 `S9JKTaTRQ1w`，於 02:54（174 秒）結束，應援內容來自 `X8XeiElkI34`；加入 49 段提示及 76 段字幕（48 段應援句、28 段一般歌詞）。字幕保留應援句的白色歌詞前後文，紅字應援部分改成黃色粗體，從字幕出現時就固定變色；自動疊在影片上，沒有字幕開關，一般歌詞以全白字顯示，來源沒有字幕時才隱藏。結尾歡呼另留在大字提示中
- CLIK CLAK 已核對逐秒總覽、49 段紅字及 196 張 0.1 秒邊界畫面，另查 10 張邊界細節；16 個音訊比對視窗的偏移為 -0.02～-0.03 秒，統一對齊 -0.03 秒。提示以字幕畫面時段為準，標示「本句應援」，尚未校準各字開口點或完成全段聽校。原始資產、決策表、產生程式及 QA 位於 `video/X8XeiElkI34/`
- 疊加字幕使用 `subtitles.js`，綁定播放影片 ID，以播放器時間更新；暫停保留、拖曳重算、切歌與結束清空，文字以 DOM textContent 安全顯示。一般影片操作不受圖層阻擋；支援 Element Fullscreen 的瀏覽器另提供「全螢幕（含字幕）」與退出按鈕，YouTube 自身的影片全螢幕不包含網頁字幕層
- 其餘歌曲的影片來源與逐句應援提示待補，`hasChant` 仍為 false
- HOT SAUCE（第 23 首）使用指定 `wBHKLsujSNA`，播放範圍 00:28～02:53，加入 32 張紅字應援提示。每組快速 Hot / sauce 合成一張，三輪共 12 組分開；結尾四次 Hot sauce 各自保留，白字歌詞不納入。lemonade、remedy、fire like this、vibe like this 依火焰提示進入，避免整行字幕出現時提早啟動。
- HOT SAUCE 已核對全片逐秒上方字幕總覽、360 張 0.1 秒邊界候選畫面及 108 張細查畫面。時間依紅字與火焰動畫暫定，尚未完成全段人工聽校與 YouTube 實播同步驗收；來源、決策表、產生器及 QA 位於 `video/wBHKLsujSNA/`。
- `share-cover.png` 為使用者提供的 640 × 1126 ASIA & OCEANIA 新海報原檔
- Pages 打包包含本目錄的網站資產，不包含 README

- CLIK CLAK 一般歌詞補齊：核對 162 格非應援時段畫面與 88 格邊界畫面，`lyric-ledger.json` 保留來源文字與 0.1 秒邊界決策；應援提示、原有黃字範圍及 02:54 結束設定不變

- CLIK CLAK 提示校時 v2：全數 49 段來源提示經 large-v3、medium 及 CTC 模型交叉比對，拆成 57 個進入點，修正行內接唱提早啟動及分開的重複回應；啟動時顯示「現在喊！」。76 段字幕與固定黃字、02:54 播放終點保持不變。校時決策與生成器位於 `video/X8XeiElkI34/timing-review.v2.json`、`build_chant_v2.py`；這是全段模型輔助校時，尚未完成全段人工聽校，不能視為聽感驗收

- SHEESH（第 7 首）播放指定 `QHf-2xSJzYE`，歌詞與應援來自 `cvQv225_Bs0`；70 段字幕、27 段紅字應援提示。一般歌詞白色、應援字從字幕出現時即固定黃色粗體，來源空白處隱藏；相連的 High 與 Baby! Monster! 提示合併。第 29 首維持原狀
- SHEESH 已核對全段 0.1 秒畫面變化、70 段文字與 280 張邊界畫面；14 個完整音訊視窗一致支持延後 3.65～3.68 秒，套用 +3.66 秒。來源 130～140 秒的局部音訊比對存在歧義，沿用前後一致偏移，不另猜測局部校時。提示依字幕時段標為「本句應援」，尚未逐字校準行內接唱或完成全段人工聽校、YouTube 實播同步驗收；原始影片、決策表、生成器與 QA 位於 `video/cvQv225_Bs0/`

- SHEESH 提示校時 v2：27 段全部重新檢查，以 large-v3、medium 與英／韓 CTC 交叉證據修正 21 個進入點；`축복`、`춤춰`、`boom, boom, pow` 分別延後 1.071、0.869、0.670 秒，排除前面普通歌詞。6 段保留來源標記：額外 Baby! Monster! 呼喊，以及模型仍有分歧的短 Sheesh、High、兩次拼字與 Let’s go；保留項目仍待聽校。提示切換為「現在喊！」，70 段字幕及固定黃字不變。決策及生成器：`video/cvQv225_Bs0/timing-review.v2.json`、`build_chant_v2.py`。已做模型證據審核，尚未完成全段人工聽校與 YouTube 實播同步驗收

- MOON（第 5 首）播放指定 `jfqBPlcBGtE`，使用官方 `453459?cd=cheer` 應援表，加入 94 段歌詞字幕與 38 張應援提示。103 行英文／韓文歌詞完整保留，快速饒舌相鄰短行合併，排除日文讀音；一般歌詞白字、紅色應援改為固定黃色粗體，句中 thickens / vision / digger / figure 另按接唱字進入，四次 If you wanna ride 分開顯示。影片連結不含 si、官方來源不含 ima。
- MOON 已全表人工核對文字與紅字，使用 large-v3、medium 強制對齊及英文 CTC 輔助檢查。部分模型邊界差異仍超過 0.4 秒，時間為暫定，尚未完成全段人工聽校與 YouTube 實播同步驗收。原圖、影片、原始 ASR、對齊結果、決策表、QA 及產生器位於 `video/jfqBPlcBGtE/`。

- Really Like You（第 19 首）播放指定 `x5iLrIZ7YPY`（MCOUNTDOWN 2026.2.5 FanCam）；依使用者上傳的官方應援表加入 75 段韓文／英文字幕與 36 段應援提示。一般歌詞白字、紅字固定黃色粗體，開場四句只顯示歌詞；日文讀音與日文歡呼註記不納入。三次副歌、三次 Okay okay／Hey 分開，moonlight 只標示 light。
- Really Like You 已逐行核對文字與紅字、完成 large-v3／medium 強制對齊及英韓 CTC 輔助檢查，保留完整影片。時間仍為暫定，尤其前兩次 light 與結尾 Hey；尚未完成全段人工聽校及 YouTube 實播同步驗收。來源圖、影片、校時證據、決策表及產生器位於 `video/x5iLrIZ7YPY/`。

- BILLIONAIRE（第 20 首）使用指定官方 PERFORMANCE VIDEO `MN2RlOy8y8k`，加入 54 段英文歌詞字幕與 33 張紅字應援提示。文字及顏色依使用者附圖，排除日文歡呼註記與 Arigato；保留原表拼法。時間使用 large-v3／medium 輔助定位，修正開頭留白，模型分歧保存於 `video/MN2RlOy8y8k/chant-qa.json`。全片人工聽校與 YouTube 實播同步仍待確認。歌詞及應援 SRT、來源圖片、音訊、生成器與紀錄位於該影片資料夾。

- Stuck in the Middle（第 15 首）使用指定 KaM7ZxoGQuE LIVE STAGE，依使用者附圖加入 86 段英文歌詞與最後副歌 10 段紅字應援，排除日文及歡呼註記。時間經 large-v3、medium 與英文 CTC 輔助定位，仍待全曲人工聽校與 YouTube 實播同步驗收；SRT、來源圖與校時紀錄位於 video/KaM7ZxoGQuE/。

- Love, Maybe（第 16 首）使用指定 xPq1Oz_hzVc HELLO MONSTER WORLD TOUR KANAGAWA，依使用者附圖加入 52 段英文歌詞與 16 張紅字應援提示；一般歌詞白字、應援固定黃色粗體，最後一句非紅字歌詞保持白色，日文歡呼註記不納入。時間經 large-v3、medium 與英文 CTC 輔助定位，保留快唱段與延音分歧，仍待全曲人工聽校。本機頁面已確認曲目與來源載入，但內嵌 YouTube 回報無法播放，未完成實播同步驗收；來源圖、音訊、SRT、逐行對應與校時紀錄位於 video/xPq1Oz_hzVc/。

## 三首現場版（2026-11-15）

- WE GO UP 新增指定 M COUNTDOWN 現場版 `R_Zn4YqvQ1o`，50 張提示平移 −21.9175 秒。
- CHOOM 新增指定音樂中心現場版 `c1jLt0EarG4`，37 張提示平移 −28.1555 秒。
- BATTER UP 新增指定 HELLO MONSTER 現場版 `Y4BxIn0jpOU`，34 張提示平移 +1.083 秒；片尾歡呼匹配信心低，保留教學音樂映射並標示待聽校。現場延伸段超出原教學提示範圍，未自行補入。
- 現場時間軸放於各來源的 `chant`，原教學、原文／空耳、收藏編號及其他歌曲保持不變。以 `python scripts/add_babymonster_live.py` 重建。
- 來源音訊、全曲／逐卡比對、代表畫面、SHA-256 與 QA 保存於 `video/<live-id>/`；BATTER UP 另存頻譜交叉比對。
- 已完成結構與切換／跳句測試及代表畫面檢視；全曲正常速度播放、直接聽校與 YouTube 實播同步仍未完成。未提交推送本輪修改。

## DRIP、MOON 現場版（2026-11-15）

- DRIP 新增指定音樂中心影片 `nvMzXCBoiEQ`，42 張應援平移 −51.7595 秒，練習範圍 0.240–180.240 秒。
- MOON 新增指定音樂中心影片 `fuVaqtSfYvE`，38 張應援及 94 段歌詞字幕平移 +4.6527 秒，練習範圍 0–187.653 秒；原舞台與官方應援表來源保留，字幕標色不變。
- 兩首完成全曲及逐卡波形比對、35 秒間隔代表畫面檢視；MOON 局部音訊候選有約 0.1 秒差異，保留整曲中位數映射，完整直接聽校與實播同步未完成。
- 來源與 QA 保存在 `video/nvMzXCBoiEQ/`、`video/fuVaqtSfYvE/`，重建沿用 `scripts/add_babymonster_live.py`。
- 96 項 Node 測試、10 項 Pages 打包測試通過；既有三首現場版、原來源與其他歌曲均保持相等。本輪未提交推送。

## FOREVER、HOT SAUCE 現場版（2026-11-15）

- FOREVER 新增指定人氣歌謠影片 `Yb2m3FkIR_g`，30 張應援平移 +1.7975 秒，練習範圍 0–217.798 秒。
- HOT SAUCE 新增指定 M COUNTDOWN 影片 `QQQLDjLufNo`，32 張應援平移 +17.2108 秒，練習範圍 45.211–190.211 秒，略過較長片頭。
- 完成全曲／逐卡波形比對及 40 秒間隔代表畫面檢視，原應援與空耳、先前五首現場版及其他歌曲保持相等；片尾歡呼沿用音樂映射，並非觀眾喊聲辨識。
- 來源、逐卡比對、SHA-256 與 QA 保存於各影片資料夾；重建沿用 `scripts/add_babymonster_live.py`。
- 98 項 Node 測試、10 項 Pages 打包測試通過；全曲正常速度播放、直接聽校及實播同步未完成。未提交推送。

## SUGAR HONEY ICE TEA 現場版（2026-11-15）

- 新增指定 M COUNTDOWN 影片 `ISJForNHmA0`，55 張應援平移 −16.7105 秒，練習範圍 13.290–188.290 秒。
- 全曲及逐卡波形比對一致，完成 40 秒間隔代表畫面檢視；片尾歡呼沿用教學時間映射，非現場喊聲辨識。
- 來源、比對、SHA-256 與 QA 保存於 `video/ISJForNHmA0/`；重建沿用 `scripts/add_babymonster_live.py`。先前七首現場版、原來源及其他歌曲保持相等。
- 99 項 Node 測試、10 項 Pages 打包測試通過；全曲直接聽校、正常速度播放與實播同步尚未完成。未提交推送。
