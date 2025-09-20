# 專案架構與流程規劃

## 1. 核心目標
本專案旨在提供一個輕量、快速的YouBike即時查詢工具，特別針對通勤族在捷運站周邊的借、還車需求。透過純前端技術實現，確保在行動裝置和桌機上皆有良好體驗。

## 2. 技術選型
- **前端框架**: 無，使用純 HTML5 / CSS3 / JavaScript (ES6+)。
- **地理定位**: Browser `navigator.geolocation` API。
- **資料儲存**: `localStorage` 用於儲存「我的最愛」站點。
- **YouBike API**: 政府開放資料平台 (預計使用新北市API作為起點)。
- **距離計算**: Haversine 公式，計算兩點間的直線距離。

## 3. 主要模組劃分
程式碼將圍繞以下幾個核心模組進行組織 (`src/main.js`):

- **`apiService.js`**:
    - `fetchStations()`: 負責從本地的 `stations.json` 檔案獲取站點資料。這個JSON檔案需要透過執行外部的 `fetch_data.py` 腳本來產生與更新。
- **`geolocationService.js`**:
    - `getCurrentPosition()`: 封裝 `navigator.geolocation.getCurrentPosition`。回傳一個 Promise，解析後得到經緯度 `{ lat, lng }`。處理用戶拒絕定位的錯誤情況。
- **`distanceService.js`**:
    - `calculateDistance(pos1, pos2)`: 實現 Haversine 公式，接收兩個經緯度物件，回傳它們之間的距離（單位：公里）。
- **`favoriteService.js`**:
    - `getFavorites()`: 從 `localStorage` 讀取並回傳最愛站點的ID陣列。
    - `addFavorite(stationId)`: 將站點ID新增至 `localStorage`。
    - `removeFavorite(stationId)`: 從 `localStorage` 移除站點ID。
    - `isFavorite(stationId)`: 檢查某站點是否為最愛。
- **`uiService.js`**:
    - `renderStations(stations, containerId, favorites)`: 將站點資料渲染成 HTML，並插入到指定的容器中。根據 `favorites` 標記最愛狀態。
    - `showLoading()` / `hideLoading()`: 控制載入中提示的顯示與隱藏。
    - `showError(message)`: 顯示錯誤訊息（如定位失敗、API請求失敗）。
- **`app.js` (主流程控制器)**:
    - `init()`: 應用程式進入點。
    - 協調以上所有模組，執行主要業務邏輯：
        1. 顯示載入提示。
        2. 請求使用者地理位置。
        3. 獲取YouBike資料 (從 `stations.json`)。
        4. 計算各站點與使用者位置的距離。
        5. 根據距離排序站點。
        6. 獲取最愛列表。
        7. **動態填入行政區篩選器**。
        8. **綁定搜尋框與篩選器的事件監聽**。
        9. 呼叫 `uiService` 渲染畫面 (此時會根據預設篩選條件顯示)。
        10. 隱藏載入提示。
        11. 處理過程中任何可能的錯誤。

## 4. 資料結構
- **站點物件 (Station)**: 從API獲取後，整理成統一格式。
  ```json
  {
    "id": "500101001", // 站點唯一ID
    "name": "捷運三重站(3號出口)",
    "lat": 25.06619,
    "lng": 121.48536,
    "capacity": 20, // 車位總數
    "availableBikes": 5, // 可借車輛
    "availableDocks": 15, // 可還空位
    "timestamp": "2023-10-27 18:30:00",
    "distance": 0.5 // (計算後動態加入)
  }
  ```

## 5. 業務流程與邏輯檢討
1. **啟動應用**:
   - `[User]` 開啟網頁。
   - `[App]` 執行 `app.init()`。
   - `[UI]` 顯示載入動畫。
2. **定位請求**:
   - `[App]` 呼叫 `geolocationService.getCurrentPosition()`。
   - `[Browser]` 彈出授權請求。
   - **(分支A) 用戶同意**: Promise 返回經緯度。
   - **(分支B) 用戶拒絕**: Promise reject。`[App]` 捕捉錯誤，`[UI]` 顯示提示 "無法定位，請手動搜尋或開啟權限"。 (初期版本可簡化為僅顯示錯誤)。
3. **資料獲取與處理**:
   - `[App]` 呼叫 `apiService.fetchStations()`。
- **(檢討)**: 由於資料改為從本地 `stations.json` 讀取，前端API請求失敗的可能性降低，但仍需處理檔案不存在或格式錯誤的狀況。主要的失敗點轉移到 `fetch_data.py` 腳本的執行。
   - `[App]` 遍歷站點，呼叫 `distanceService.calculateDistance()` 計算每個站點與用戶的距離，並將 `distance` 屬性附加到站點物件上。
   - `[App]` 對站點陣列進行排序 ( `Array.sort()` )。

**資料更新流程 (新)**:
1. `[User]` 在終端機執行 `python fetch_data.py`。
2. `[Script]` 請求 YouBike API。
3. `[Script]` 將回傳的 JSON 資料儲存至 `src/stations.json`。
4. `[User]` 重新整理或開啟 `src/index.html` 頁面以查看最新資料。
4. **渲染畫面**:
   - `[App]` 呼叫 `favoriteService.getFavorites()` 取得最愛列表。
   - `[App]` 呼叫 `uiService.renderStations()`，將排序後的站點資料和最愛列表傳入。
   - `[UI]` 根據資料產生站點卡片，包含站名、距離、可借/可還數量、地圖連結、最愛按鈕。最愛按鈕的狀態（加入/移除）根據最愛列表決定。
5. **使用者互動**:
   - `[User]` 點擊「加入/移除最愛」按鈕。
   - `[Event Listener]` 觸發，呼叫 `favoriteService.addFavorite()` 或 `removeFavorite()`。
   - `[UI]` 即時更新按鈕的視覺狀態（例如，星星變實心/空心）。
   - `[User]` 點擊「Google Map」連結。
   - `[Browser]` 開啟新分頁，導向 `https://www.google.com/maps?q=<lat>,<lng>`。

**潛在邏輯漏洞與對策**:
- **API 延遲**: API 回應可能比定位慢，或反之。使用 `Promise.all` 可以確保兩者都完成後才進行下一步處理，提升效率。
- **定位不準確**: 行動裝置的GPS可能不準。UI上應標示「距離為估算值」。
- **`localStorage` 限制**: 若使用者關閉 `localStorage` 功能或使用無痕模式，最愛功能會失效。應在程式中優雅地處理此類錯誤，避免程式崩潰。
- **資料即時性**: API 資料有更新週期（通常是數分鐘）。應在UI上顯示「最後更新時間」，讓使用者了解資訊的即時性。
