# UBike 通勤即時查詢工具 (ubike-easy-checker)

一個可於手機及電腦瀏覽的YouBike（台灣公共自行車）查詢小工具，讓上下班/捷運進出人流可即時掌握最近UBike站點的車輛與空位狀況，規劃「借用站點」與「歸還站點」是否有可用資源。純HTML前端設計，含最愛追蹤，以及地圖連結。

## 主要功能
- **✅ 即時資料**：顯示站點可借車輛 (available bikes) 與可還空位 (available docks)。
- **✅ 地理定位**：自動抓取您目前的位置，計算並排序出最近的站點。
- **✅ 距離顯示**：清楚標示每個站點與您的距離（公里）。
- **✅ 我的最愛**：一鍵收藏常用站點，並在獨立區塊快速查看。
- **✅ 地圖連結**：快速開啟Google地圖，直接導航至目標站點。
- **✅ 跨裝置使用**：響應式網頁設計(RWD)，在手機、平板、電腦上都有良好瀏覽體驗。

## 安裝與使用
本專案為純前端應用，但需要一個簡單的步驟來獲取最新的YouBike資料。

1. **Clone或下載本專案。**

2. **安裝Python依賴**
   本專案使用一個Python腳本來抓取資料，需要安裝 `requests` 套件：
   ```bash
   pip install requests
   ```

3. **抓取最新的YouBike資料**
   執行根目錄下的 `fetch_data.py` 腳本。這會將最新的站點資料下載到 `src/stations.json`。
   ```bash
   python fetch_data.py
   ```
   **注意**: 每當您想更新站點資料時，都需要重新執行此步驟。

4. **在瀏覽器中開啟應用**
   直接在瀏覽器中開啟 `src/index.html` 檔案即可開始使用。
   - **建議**: 為了讓地理定位和API請求功能正常運作，建議透過本地伺服器 (如 VSCode 的 Live Server) 方式開啟，或將其部署至網頁伺服器上。直接開啟本地檔案 (`file:///...`) 可能會因瀏覽器安全策略而遇到問題。

## 專案架構
本專案採用模組化的純JavaScript編寫，不依賴任何外部框架，以求輕量與高效。

- **`/src`**: 包含主要的 `index.html`, `main.js`, `styles.css`。
- **`/doc`**: 存放專案的規劃文件，如架構圖、流程分析等。
- **`main.js`**: 程式邏輯核心，分為以下幾個部分：
    - **API 服務**: 負責與YouBike公開資料API溝通。
    - **地理定位服務**: 取得使用者經緯度。
    - **距離計算服務**: 使用Haversine公式計算距離。
    - **UI 服務**: 負責渲染頁面元素。
    - **主應用程式**: 負責調度以上所有模組，完成業務邏輯。

詳細的架構規劃請參閱 `doc/architecture.md`。

## 如何協作
歡迎對本專案提出建議或貢獻程式碼！
1. Fork 本專案。
2. 建立您的功能分支 (`git checkout -b feature/AmazingFeature`)。
3. Commit 您的變更 (`git commit -m 'Add some AmazingFeature'`)。
4. Push 到分支 (`git push origin feature/AmazingFeature`)。
5. 開啟一個 Pull Request。

## 作者
- Jules the Pirate Coder 🏴‍☠️
