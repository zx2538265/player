# BABYMONSTER 應援練習室

以 BIGBANG 練習室為基礎，採用使用者提供的 CHOOM 海報、深藍與冰藍配色。

- 入口：`babymonster/index.html`，需透過 HTTP 靜態伺服器開啟
- 歌單：[2026-06-28 Jamsil Arena](https://www.setlist.fm/setlist/babymonster/2026/jamsil-arena-seoul-south-korea-4376a3d7.html)，於 2026-09-24 核對
- 28 個演出項目；不含 Ment / VCR，保留組曲、個人舞台、安可與重複版本
- `songs.json` 為獨立資料來源，收藏及偏好使用 `babymonster-practice` 儲存
- WE GO UP 使用指定影片 `x4b_9YdhT8M`，播放範圍 00:31～03:40，已加入 50 張應援提示；依星號文字與綠色提示逐段核對，快速短句合併顯示，未加入一般歌詞或自製中文空耳
- 提示時間依畫面暫定；已完成文字與 0.1 秒邊界畫面檢查，尚未完成全段聽校與 YouTube 實播驗證。證據、決策表及產生程式位於 `video/x4b_9YdhT8M/`
- CHOOM 使用指定影片 `9DlDGxKQsDg`，播放範圍 00:30～03:25，已加入 37 張應援提示；依白字轉黃字標示核對，排除深藍色一般歌詞，短促 Choom 與後續 Watch out 合併顯示。已核對文字與 0.1 秒邊界候選，尚未完成全段聽校與 YouTube 實播驗證；證據位於 `video/9DlDGxKQsDg/`
- BATTER UP（第 3 首）使用指定影片 `CRSVJA-dKWo`（艾倫Allen），已加入 34 張紅字應援提示；韓文提示保留原文與影片提供的羅馬字、中文／注音空耳，白色歌詞不納入。開場先在心中數兩個八拍
- BATTER UP 原版已核對 8 張逐秒總覽及 204 張 0.1 秒邊界畫面；v2 以音訊詞語對齊修正 16 處行內接唱進入點，包含兩次 Move on、Monsters of the world、어디든，避免把整行字幕出現時間當成喊唱時間。完成模型交叉校時與狀態回歸測試，尚未完成全段聽校與 YouTube 實播驗證。原版證據與 v2 決策表、產生程式位於 `video/CRSVJA-dKWo/`；第 26 首 Encore Remix 保持待補
- DRIP（第 4 首）使用指定影片 `X2GfGkH-3hg`，播放範圍 00:52～03:52，加入 42 張粉紅字應援提示；副歌七聲 Drip 只喊第 1、3、5、7 聲，保留握拳高舉指示。已核對全段逐秒畫面與 252 張邊界畫面，並以兩個模型輔助接唱校時；部分時間仍為暫定，尤其結尾第二組 Drip，尚未完成全段聽校與 YouTube 實播驗證。證據與決策表位於 `video/X2GfGkH-3hg/`
- SUGAR HONEY ICE TEA（第 22 首）使用指定影片 `xN3X_tl4zlQ`，播放範圍 00:30～03:25，加入 55 張黃字應援提示；排除深紅色一般歌詞，保留兩次開場拼字，合併短句 this / You wish 與閃爍的結尾歡呼。已核對逐秒總覽及 216 張邊界候選畫面；01:31.5 的 yeah you know it 在來源中提早轉黃，時間依畫面暫定，尚未完成全段聽校與 YouTube 實播驗證。證據位於 `video/xN3X_tl4zlQ/`
- 其餘歌曲的影片來源與逐句應援提示待補，`hasChant` 仍為 false
- `share-cover.png` 為使用者提供的 640 × 1126 ASIA & OCEANIA 新海報原檔
- Pages 打包包含本目錄的網站資產，不包含 README
