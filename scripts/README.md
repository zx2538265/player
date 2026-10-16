# Notion 同步與網站發布

`.github/workflows/notion-preview.yml` 在推送 main、每日排程及手動執行時，預設只更新指定 Notion 檢視的前五筆作品（依檢視順序，非依修改時間排序），並重新取得這五筆的分享封面。其餘作品資料與封面沿用 `https://allenka.com/` 已發布版本，不再逐筆讀取 Notion。

前五筆會放在清單最前方，其餘維持已發布的相對順序；前五筆明確取消公開的作品會移除。其餘作品的修改、刪除、取消公開及排序變更，需要全量同步才會反映。字幕複製、網站建置、差異比較與發布流程維持原有行為。

## 手動全量同步

在 GitHub 的 **Actions → Notion 同步與網站發布 → Run workflow**，勾選 **全量同步 Notion** 後執行。這會重新取得完整檢視、所有作品與封面，不依賴已發布清單，並依目前 Notion 檢視重建網站資料。

首次發布、已發布資料不可用，或需更新前五筆以外作品時，使用此選項。不勾選則仍為前五筆同步。排程與 push 都使用前五筆同步。

本機指令（需設定 `NOTION_TOKEN`）：

```sh
python scripts/sync_notion.py --output .notion-preview/library.json
python scripts/sync_notion.py --full-sync --output .notion-preview/library.json
```

前五筆同步若無法取得有效的已發布清單或舊封面，會停止，不會以五筆清單覆蓋網站。沿用封面從正式網站平行下載，並核對 SHA-256；不重新壓圖，保留已發布的圖片內容。
