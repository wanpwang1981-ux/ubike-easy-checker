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
    -   開發者執行 `python fetch_data.py`，可選擇性地加上 `--source tdx` 參數。
    -   **預設 (`original`)**: 腳本分別向台北市及新北市的 YouBike 原始API 發送請求。
    -   **TDX (`tdx`)**: 腳本需要 `TDX_CLIENT_ID` 和 `TDX_CLIENT_SECRET` 環境變數。它會先向TDX認證伺服器請求一個暫時的 `access_token`，然後用該 token 向交通部TDX平台的API發送請求。
    -   腳本對收到的資料進行解析，並統一成一個標準化的結構。
    -   將合併且標準化後的資料寫入 `src/stations.json`。
2.  **使用者開啟網頁 (初始化)**:
    -   瀏覽器載入 `src/index.html`。
    -   `main.js` 中的 `DOMContentLoaded` 事件被觸發。
    -   `init()` 函式開始執行，非同步地從 `src/stations.json` 抓取所有站點資料，並存入記憶體。
    -   同時，`init` 函式會嘗試取得使用者地理位置，並從 `localStorage` 讀取「我的最愛」列表。
3.  **畫面首次渲染**:
    -   資料載入後，`renderAll()` 函式被呼叫。
    -   **我的最愛**: 根據 `favorites` Set 過濾出所有最愛站點，並渲染到畫面上。
    -   **附近站點**: 根據地理位置排序，顯示最近的5個站點（已排除最愛）。
4.  **手動資料更新 (Refresh)**:
    -   使用者點擊任一「更新」按鈕。
    -   `handleRefresh()` 函式被觸發。
    -   函式重新從 `src/stations.json` 抓取最新的車位資料。
    -   將新資料的車位數 (`sbi`, `bemp`) 更新到記憶體中對應的站點物件上，而非取代整個物件。
    -   再次呼叫 `renderAll()` 以最新的記憶體資料重新渲染畫面。

## 5. JavaScript 模組化設計 (`main.js`)
`main.js` 的內部邏輯雖然在單一檔案中，但透過將功能切分到不同的常數物件 (Services) 中來實現模組化，並由一個主 `init` 函式來驅動。

- **`apiService`**: 負責所有 `fetch` 相關的網路請求，包括抓取站點資料 (`stations.json`) 和版本資訊。
- **`favoriteService`**: 封裝對 `localStorage` 的所有操作（讀取、儲存、切換）。
- **`geolocationService`**: 封裝瀏覽器的 `navigator.geolocation` API，以 Promise 形式提供位置資訊。
- **`distanceService`**: 包含用於計算兩點之間距離的 Haversine 公式。
- **`uiService`**: 負責所有與 DOM 操作相關的任務，如渲染站點卡片、更新狀態訊息、填寫篩選器選項等。
- **核心邏輯函式**:
    - `init`: 應用程式進入點，負責資料初始化與首次渲染。
    - `renderAll`: 根據記憶體中的 `stations` 陣列與篩選條件，渲染「我的最愛」與「附近站點」列表。
    - `toggleFavorite`: 切換單一站點的最愛狀態並觸發重繪。
    - `handleRefresh`: 處理手動更新邏輯，重新抓取資料、更新記憶體並觸發重繪。
