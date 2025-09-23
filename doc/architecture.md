# 專案架構規劃

## 1. 核心目標
建立一個輕量、高效能、易於維護的YouBike即時查詢工具。此工具需整合台北市與新北市的站點資料，並提供地理定位、站點搜尋、我的最愛等核心功能。

## 2. 技術選型
- **前端**: 純 HTML5 / CSS3 / JavaScript (ES6+)。不使用任何外部前端框架（如React, Vue），以保持專案的輕量化與純粹性。
- **資料儲存**: 使用瀏覽器的 `localStorage` API 來儲存使用者的「我的最愛」站點列表。
- **地理距離計算**: 使用 Haversine 公式，直接在前端計算使用者與各站點之間的直線距離。
- **開發伺服器**: 使用 Python 內建的 `http.server` 模組，方便本地開發與測試。

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
|-- requirements.txt     # Python 依賴套件列表
|-- README.md            # 專案說明、安裝與使用指南
`-- version.md           # 版本歷史紀錄
```

## 4. 資料流程
1.  **資料抓取 (手動執行)**:
    -   開發者執行 `python fetch_data.py`。
    -   腳本分別向台北市及新北市的 YouBike API 發送請求。
    -   針對兩個來源的資料，進行解析並統一成一個標準化的結構（Unified Schema）。
    -   將合併且標準化後的資料寫入 `src/stations.json`。
2.  **使用者開啟網頁**:
    -   瀏覽器載入 `src/index.html`。
    -   `main.js` 中的 `DOMContentLoaded` 事件被觸發。
    -   `app.init()` 開始執行。
3.  **應用程式初始化**:
    -   `init` 函式首先嘗試取得使用者地理位置。
    -   同時，非同步地從 `src/stations.json` 抓取站點資料。
    -   從 `localStorage` 讀取已儲存的「我的最愛」列表。
4.  **畫面渲染**:
    -   資料載入後，`renderAll()` 函式被呼叫。
    -   **我的最愛**: 根據 `favorites` Set 過濾出所有最愛站點，並渲染到畫面上。此區塊**不受**任何縣市、行政區篩選影響。
    -   **附近站點**: 根據當前的篩選條件（縣市、行政區、搜尋關鍵字）過濾出符合條件的站點，並排除已在最愛列表中的站點，最後渲染到畫面上。

## 5. JavaScript 模組化設計 (`main.js`)
`main.js` 的內部邏輯雖然在單一檔案中，但透過將功能切分到不同的常數物件 (Services) 中來實現模組化，並由一個主 `init` 函式來驅動。

- **`apiService`**: 負責所有 `fetch` 相關的網路請求，包括抓取站點資料和版本資訊。
- **`favoriteService`**: 封裝對 `localStorage` 的所有操作（讀取、儲存、切換）。
- **`geolocationService`**: 封裝瀏覽器的 `navigator.geolocation` API，以 Promise 形式提供位置資訊。
- **`distanceService`**: 包含用於計算兩點之間距離的 Haversine 公式。
- **`uiService`**: 負責所有與 DOM 操作相關的任務，如渲染站點卡片、更新狀態訊息、填寫篩選器選項等。
- **核心邏輯函式**: 如 `init`, `renderAll`, `toggleFavorite` 等，負責協調上述服務，完成應用程式的核心業務邏輯。
