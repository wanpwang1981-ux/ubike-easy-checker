# 雙北市 UBike 即時查詢工具 (Dual-City YouBike Checker)

一個可於手機及電腦瀏覽的YouBike 2.0查詢小工具，整合**台北市**與**新北市**的站點資料，讓通勤族可即時掌握最近站點的車輛與空位狀況，規劃「借用站點」與「歸還站點」是否有可用資源。

## 主要功能
- **✅ 雙北資料整合**: 同時查詢台北市與新北市的YouBike 2.0站點。
- **✅ 即時資料**: 顯示站點可借車輛 (sbi) 與可還空位 (bemp)。
- **✅ 地理定位**: 自動抓取您目前的位置，計算並排序出最近的站點。
- **✅ 多層級篩選**:
    -   可依**縣市** (台北市/新北市) 篩選。
    -   可依**行政區** (信義區/板橋區等) 篩選。
    -   可依**站點名稱**關鍵字即時搜尋。
- **✅ 我的最愛**:
    -   一鍵收藏常用站點，並在獨立區塊快速查看。
    -   按鈕會動態顯示「⭐ 新增」或「⭐ 移除」。
- **✅ 匯入/匯出最愛**:
    -   可將您的最愛列表**匯出**成 `ubike_favorites.txt` 檔案。
    -   可從之前匯出的檔案**匯入**您的最愛列表，輕鬆同步。
- **✅ 地圖連結**: 快速開啟Google地圖，直接導航至目標站點。
- **✅ 響應式設計**: 在手機、平板、電腦上都有良好瀏覽體驗。

---

## 安裝與使用

### 步驟1：下載專案
首先，Clone或下載本專案至您的本機電腦。

### 步驟2：設定Python環境與安裝依賴
為了執行資料抓取與啟動伺服器，您需要Python環境。推薦建立一個獨立的虛擬環境以避免套件版本衝突。

---
#### **選項A：使用 `uv` (推薦，速度最快)**
`uv` 是一個極速的Python套件安裝與管理工具。
1.  **建立並啟用虛擬環境** (此指令會在專案資料夾下建立 `.venv`):
    ```bash
    uv venv
    ```
    (如果您使用的是 Windows CMD，請執行 `source .venv/bin/activate` 來啟用環境)
2.  **安裝依賴套件**:
    ```bash
    uv pip install requests
    ```

---
#### **選項B：使用 `conda`**
1.  **建立新的 Conda 環境** (此處命名為 `ubike-checker`):
    ```bash
    conda create --name ubike-checker python=3.9
    ```
2.  **啟用環境**:
    ```bash
    conda activate ubike-checker
    ```
3.  **安裝依賴套件**:
    ```bash
    pip install requests
    ```
---

### 步驟3：抓取最新的YouBike資料 (推薦)
專案內已包含一份站點資料，但建議執行以下腳本以獲取最新資訊。
```bash
python fetch_data.py
```

### 步驟4：啟動本地伺服器
為了讓應用程式能正確讀取資料，請啟動內附的簡易伺服器：
```bash
python server.py
```
您將會看到伺服器啟動的訊息。請保持此終端機視窗開啟。

### 步驟5：在瀏覽器中開啟應用
打開您的網頁瀏覽器，並前往以下網址：
[http://localhost:8000/src/](http://localhost:8000/src/)

現在您可以開始使用此工具了！

---

## 專案架構
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
