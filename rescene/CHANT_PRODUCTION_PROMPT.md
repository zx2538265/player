# RESCENE 應援提示製作指令

將以下內容交給 AI 執行，可一次處理全部歌曲，或明確指定其中一首。

```text
請在 D:\Project\Github\player 的 rescene 專案製作隨影片播放的大字應援提示卡。

先讀 AGENTS.md、rescene/README.md、rescene/songs.json 及相關應援引擎與測試，確認分支和 Git 狀態，保留所有既有未提交變更。使用 korean-hardsub-gpu-rescan skill 擷取與核對畫面文字。

來源與範圍：
1. Pretty Girl — https://www.youtube.com/watch?v=RX592yMx7P0
2. LOVE ATTACK — https://www.youtube.com/watch?v=xn12KH78Dx4
3. UhUh — https://www.youtube.com/watch?v=s1S-lnU-yMI
4. Pinball — https://www.youtube.com/watch?v=YyixhiYpkkY
5. Glow Up — https://www.youtube.com/watch?v=-55bUrG1qjg
6. Deja Vu — https://www.youtube.com/watch?v=9FlQOv6-Mjc
7. Heart Drop — https://www.youtube.com/watch?v=VKlrVbgJG-g
8. Bloom — https://www.youtube.com/watch?v=Ma6IENHO584
9. Runaway — https://www.youtube.com/watch?v=7DZlkZ4bMpU

製作要求：
1. 只使用上列指定官方 Fanchant Guide 的實際畫面作為應援內容依據。逐首確認顏色、框線或其他應援標記的意義，分清普通歌詞、成員談話、示範及應援文字；不得把一般歌詞全部轉成應援卡。
2. 保存原始影片與辨識證據至 video/<video-id>/。先盤點既有產物再續跑，不覆寫或清空原始影片及 append-only OCR 紀錄。OCR 文字必須人工看圖確認；辨識不清楚、人名讀法或顏色意義不確定時列為待核對，不猜測。
3. 建立 chant-ledger.json，記錄每個應援事件的原文、畫面證據、絕對影片起訖秒數、卡片文字及核對狀態，從 ledger 產生播放器資料。邊界以 0.1 秒精掃；畫面出現時間與實際喊聲時機不同時分開記錄。未聽校不得宣稱喊聲已精準同步。
4. 使用者閱讀的提示要簡短易讀。英文保留原文，歡呼等指令使用自然台灣繁中；韓文保留可核對原文，未核實的中文諧音不得當成確認讀音。重複應援在不同時間各建獨立事件；有停頓的句子分卡，不跨空白時段合併。長句依節奏拆卡，避免手機畫面擠字。
5. 保留現有歌曲編號及順序。將核對完成的資料寫入 rescene/songs.json：chant.videoId 必須等於實際播放來源，cues 使用絕對秒數，起訖有效、排序且不重疊；只有具備有效提示的歌曲才設 hasChant=true。未解決項目寫入各影片的 UNRESOLVED.md，不塞入猜測的提示。
6. 確認每首教學影片的音樂練習段落，再決定 startSeconds/endSeconds；不要按影片總長或推測刪掉前後段。保留來源影片與原始時間基準。
7. 延用 RESCENE 的應援引擎、暫停、倍速、倒數、重練本句、切歌與連播功能。避免改動其他團體頁面。資料變更後更新快取版本。
8. 增補有意義的來源綁定與提示行為測試，執行 node tests/test_rescene_practice.cjs 及新增的應援測試、git diff --check。檢查 320px、390px 與桌機版的卡片可讀性，並在瀏覽器驗證切歌與提示顯示；實際 YouTube 播放或聽校受阻時明確記錄。
9. 更新 rescene/README.md 與各影片 PROCESSING.md，交付每首卡片數、使用來源、核對範圍、未解決項目與可操作預覽。分開報告自動檢查、人工畫面核對、聽校、實際 YouTube 同步；抽樣不等於全片驗收。
10. 本次完成本機製作與驗證即可，不自行 commit、push 或部署。
```
