# Notion 社群分享頁

既有 `.github/workflows/notion-preview.yml` 讀取 Notion 翻譯清單後，由 `scripts/prepare_pages.py` 在發布目錄產生 `share/<影片 ID>/index.html` 和 `data/share.json`。每小時同步、手動執行及 main 推送均沿用原工作流程；分享頁內容也納入版本雜湊，沒有變更就不重新部署。

- 標題取自 Notion，說明由藝人／團體、內容類型與「中文字幕｜翻譯收藏室」組成。
- 分享圖片使用 Notion 內文第一張上傳圖片（含巢狀區塊與分頁），找不到時使用上傳的頁面 cover；不使用外部嵌入圖片，也不代用 YouTube 縮圖。沒有上傳圖片時產生純文字分享頁。
- 同步時下載圖片並驗證格式，以 SHA-256 檔名保存到 `data/covers/`；分享頁提供網站永久圖片網址、實際寬高與 MIME。圖片變更會產生新網址，短效簽名網址不寫入公開清單。圖片下載或驗證失敗時中止同步，保留已發布版本。
- 翻譯清單的 `image` 縮圖維持原設定；分享圖片另存 `shareImage`，來源是 Notion。
- 分享圖片自動製成 1200 × 630 JPEG，原圖依 EXIF 方向校正後等比例完整放入中央 1080 × 540 安全區，四周補深色背景；不裁切原圖、不修改 Notion。透明圖片合成於背景上，動態圖片使用第一幀。即使卡片置中裁成 2:1，仍保留上下邊界；其他平台比例須另行確認。
- 只為指向本站播放器且有對應 SRT 的作品產生分享頁；外部翻譯網站不轉成本站播放器。重複影片 ID 會中止建置，需先整理來源資料。
- 分享頁原始 HTML 包含 Open Graph 和 Twitter Card metadata。一般瀏覽器自動前往播放器；JavaScript 停用時仍有封面、標題及觀看連結。
- 播放器的「複製分享連結」僅在該影片列於同一版本的分享頁索引時出現。剪貼簿權限不可用時提供手動複製。
- 既有 `?v=` 播放網址不會自動變成專屬預覽，對外分享請使用 `https://allenka.com/share/<影片 ID>/`。

## 本機驗證

```powershell
python -m pip install -r scripts/requirements.txt
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/test_share_button.cjs
python -c "from pathlib import Path; from scripts.prepare_pages import prepare; prepare(Path('.'), Path('data/library.json'), Path('.notion-preview/site'))"
python -m http.server 8000 --directory .notion-preview/site
```

輸出目錄必須尚未存在。這裡的 `data/library.json` 是儲存庫快照，正式工作流程使用當次 Notion 同步結果。分享頁跳轉使用相對網址，可在本機驗證；metadata 和複製結果固定為正式網域。

部署後仍需在實際使用的社群平台貼上分享網址確認預覽。各平台的快取、抓取政策和卡片版型不同，本機測試不代表已完成平台預覽驗收。
