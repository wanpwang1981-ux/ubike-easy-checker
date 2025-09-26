# 雙北市 UBike 即時查詢工具 v2.0

一個從零開始重構、穩定可靠的YouBike 2.0查詢小工具。本工具整合了**台北市**與**新北市**的站點資料，讓通勤族可即時掌握最近站點的車輛與空位狀況，並規劃「借用站點」與「歸還站點」是否有可用資源。

## 主要功能
- **✅ 雙北資料整合**: 同時查詢台北市與新北市的YouBike 2.0站點。
- **✅ 即時資料**: 顯示站點可借車輛 (`sbi`) 與可還空位 (`bemp`)。
- **✅ 手動更新**: 我的最愛與附近站點列表提供手動刷新按鈕(🔄)，即時更新車位資訊。
- **✅ 地理定位**: 自動抓取您目前的位置，計算並排序出最近的**5個**站點。
- **✅ 多層級篩選**:
    -   可依**縣市** (台北市/新北市) 篩選。
    -   可依**行政區** (信義區/板橋區等) 篩選。
    -   可依**站點名稱**或**地址**關鍵字即時搜尋。
- **✅ 我的最愛**:
    -   一鍵收藏常用站點，並在獨立區塊快速查看。
    -   **「我的最愛」列表為常駐狀態，不受任何篩選條件影響**，方便您隨時查看。
- **✅ 匯入/匯出最愛**:
    -   可將您的最愛列表**匯出**成 `youbike_favorites.txt` 檔案。
    -   可從之前匯出的檔案**匯入**您的最愛列表，輕鬆同步。
- **✅ 地圖連結**: 快速開啟Google地圖，直接導航至目標站點。
- **✅ 響應式設計**: 在手機、平板、電腦上都有良好瀏覽體驗。
- **✅ 版本顯示**: 頁尾顯示目前應用程式版本號。

**資料說明**:
- 本工具現已整合兩種資料來源：
    1.  **原始版 (預設)**: 整合各市政府的公開資料API。
    2.  **TDX版**: 介接交通部TDX平台的API，資料更為統一。
- **新北市 "新莊區" 資料說明**: 原始版的資料來源不包含新莊區。若需查詢新莊區站點，請改用TDX資料來源。

---

## 安裝與使用

### 步驟1：下載專案
首先，Clone或下載本專案至您的本機電腦。

### 步驟2：設定Python環境與安裝依賴
為了執行資料抓取與啟動伺服器，您需要Python環境。推薦建立一個獨立的虛擬環境以避免套件版本衝突。

---
#### **選項A：使用 `uv` (推薦，速度最快)**
1.  **建立並啟用虛擬環境**:
    ```bash
    uv venv
    source .venv/bin/activate
    # Windows使用者請執行: .venv\Scripts\activate
    ```
2.  **安裝依賴套件**:
    ```bash
    uv pip install -r requirements.txt
    ```

---
#### **選項B：使用 `conda`**
1.  **建立新的 Conda 環境**:
    ```bash
    conda create --name ubike-checker python=3.9
    ```
2.  **啟用環境**:
    ```bash
    conda activate ubike-checker
    ```
3.  **安裝依賴套件**:
    ```bash
    pip install -r requirements.txt
    ```
---

### 步驟3：抓取YouBike資料 (手動)
若您想在**本機**測試或手動更新資料，請依照以下步驟操作。

#### **選項A：使用原始API (預設)**
```bash
python fetch_data.py
```

#### **選項B：使用TDX平台API (手動)**
1.  **設定環境變數**：
    您必須先[申請TDX平台會員](https://tdx.transportdata.tw/register)並取得您的 `Client ID` 和 `Client Secret`。
    ```bash
    # Linux / macOS
    export TDX_CLIENT_ID="您的Client ID"
    export TDX_CLIENT_SECRET="您的Client Secret"

    # Windows (Command Prompt)
    set TDX_CLIENT_ID="您的Client ID"
    set TDX_CLIENT_SECRET="您的Client Secret"
    ```
2.  **執行腳本**：
    ```bash
    python fetch_data.py --source tdx
    ```

### 步驟4：啟動本地伺服器
為了在本機瀏覽，請啟動內附的簡易伺服器：
```bash
python server.py
```
您將會看到伺服器啟動的訊息。請保持此終端機視窗開啟。

### 步驟5：在瀏覽器中開啟應用
打開您的網頁瀏覽器，並前往以下網址：
[http://localhost:8000/src/](http://localhost:8000/src/)

---
## 自動資料更新 (GitHub Actions)

本專案已設定好 GitHub Action，能**每小時自動抓取最新的 TDX 資料**並更新 `src/stations.json` 檔案。這讓您部署在網路上的版本能保持最新狀態。

### 設定教學

這個自動化流程需要您提供 TDX API 的金鑰。請依照以下步驟將金鑰安全地存放在 GitHub 中：

1.  **前往 GitHub Repo 設定**：
    在您的專案頁面，點擊右上角的 "Settings" 分頁。

2.  **找到 Secrets and variables**：
    在左側選單中，找到 "Secrets and variables"，然後點擊 "Actions"。

3.  **新增 `TDX_CLIENT_ID`**：
    -   點擊 "New repository secret" 按鈕。
    -   **Name**: `TDX_CLIENT_ID`
    -   **Secret**: 貼上您從TDX平台取得的 Client ID。
    -   點擊 "Add secret"。

4.  **新增 `TDX_CLIENT_SECRET`**：
    -   再次點擊 "New repository secret"。
    -   **Name**: `TDX_CLIENT_SECRET`
    -   **Secret**: 貼上您的 Client Secret。
    -   點擊 "Add secret"。

### 如何確認自動更新成功？

1.  **前往 Actions 分頁**：
    在您的專案頁面，點擊上方的 "Actions" 分頁。
2.  **查看 Workflow 紀錄**：
    您會看到一個名為 "Update YouBike Data" 的 workflow。每一次成功的自動更新都會顯示一個**綠色的打勾 (✅)**。若更新失敗（通常是金鑰設定錯誤），則會顯示**紅色的叉叉 (❌)**。
3.  **查看 Commit 紀錄**：
    您也可以在專案首頁看到由 `github-actions[bot]` 自動產生的 commit，訊息為 "Automated data update"。

---

## 專案架構
詳細的架構規劃請參閱 `doc/architecture.md`。

## 作者
- Jules the Pirate Coder 🏴‍☠️
