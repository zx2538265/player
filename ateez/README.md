# ATEEZ 應援練習室

由 BIGBANG 練習室複製，入口 `/ateez/`。炭黑、鏽紅、舊紙白搭配航線與破旗圖形，表現海盜冒險與不受框架束縛的風格。

- 歌單依序為 BAD（`bnGARWNOuRw`，41 張卡）、Adrenaline（`HlINJYsRw3U`，45 張卡），使用指定 MBCkpop 影片右側 ATINY 應援；目前為畫面核對／空耳草稿，實際喊聲校時與空耳聽校未完成。
- `songs.json` 管理曲目與來源；`practice.js`、`chant.js` 保留播放器及應援提示功能。
- 收藏與偏好使用獨立的 `ateez-practice` 儲存鍵。
- 已加入 Pages 建置；部署結果以 GitHub Actions 為準。
- 本機預覽：在專案根目錄執行 `python -m http.server 8774 --bind 127.0.0.1`，開啟 `http://127.0.0.1:8774/ateez/`。
- 已檢查桌面、390px 手機排版及收藏篩選，並通過 Pages 建置測試。模擬播放器檢查不代表 YouTube 實播驗收；本次嵌入影片載入逾時，外部連結保留。

2026-09-24 大字卡本機校對：`node tests/test_ateez_chant.cjs` 5/5 通過；兩份 SRT 結構 QA 通過。已抽樣檢查本機 MP4 的控制、390px／320px 特大字人名與英文卡。詳細範圍及待確認項目在 `video/<video-id>/source.ko.gpu-rescan.qa.json`、`UNRESOLVED.md`，不代表完整聽校或 YouTube 實播通過。

重建資料：`python scripts/build_ateez_chants.py`。本機 MP4 預覽：先執行 `python scripts/prepare_ateez_preview.py`，再執行 `python scripts/serve_ateez_preview.py`，開啟 `http://127.0.0.1:8766/video/ateez-preview/`。這份預覽使用忽略於 Git 的副本與本機 MP4；正式 `/ateez/` 仍使用原 YouTube 來源。
