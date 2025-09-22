# 專案架構規劃

## 1. 核心目標
建立一個輕量、高效能、易於維護的YouBike即時查詢工具。此工具需整合台北市與新北市的站點資料，並提供地理定位、站點搜尋、我的最愛等核心功能。

## 2. 技術選型
- **前端**: 純 HTML5 / CSS3 / JavaScript (ES6+)。不使用任何外部前端框架（如React, Vue），以保持專案的輕量化與純粹性。
- **資料儲存**: 使用瀏覽器的 `localStorage` API 來儲存使用者的「我的最愛」站點列表。
- **地理距離計算**: 使用 Haversine 公式，直接在前端計算使用者與各站點之間的直線距離。

## 3. 專案目錄結構
```
/
|-- /src
|   |-- index.html       # 主要的HTML入口檔案
|   |-- main.js          # 核心JavaScript邏輯
|   |-- styles.css       # CSS樣式表
|   `-- stations.json    # 合併後的YouBike站點資料 (由fetch_data.py產生)
|
|-- /doc
|   `-- architecture.md  # 本文件，架構說明
|
|-- fetch_data.py        # 用於抓取與合併兩市YouBike資料的Python腳本
|-- server.py            # 用於本地開發的簡易Python HTTP伺服器
|-- README.md            # 專案說明、安裝與使用指南
`-- version.md           # 版本歷史紀錄
```

## 4. JavaScript 模組化設計 (`main.js`)
`main.js` 的內部邏輯將以物件導向的方式，切分為數個獨立的服務 (Service) 物件，每個物件負責一項具體的任務。

- **`apiService`**: 負責從 `stations.json` 抓取資料。
- **`geolocationService`**: 負責處理瀏覽器地理定位。
- **`favoriteService`**: 負責所有 `localStorage` 的「我的最愛」操作。
- **`uiService`**: 負責渲染頁面元素、產生篩選器、更新狀態訊息。
- **`app` (主應用程式物件)**: 負責調度所有模組，處理使用者互動，完成業務邏輯。

## 5. 資料流程
1.  使用者開啟網頁。
2.  `app.init()` 觸發，開始取得使用者位置並非同步抓取 `stations.json`。
3.  資料抓取成功後，`app` 物件儲存站點列表。
4.  `uiService` 被呼叫，動態產生篩選器。
5.  `app.renderAll()` 首次被呼叫，渲染出預設的站點列表。
6.  使用者進行篩選、搜尋或收藏操作，都會觸發 `app.renderAll()` 重新渲染列表。
