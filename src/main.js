// --- Constants ---
const API_URL = 'stations.json';
const VERSION_URL = '../version.md';
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';
const FAVORITES_KEY = 'ubike-favorites';

// --- DOM Elements ---
let statusMessageEl, favoritesListEl, nearbyListEl, searchInputEl, cityFilterEl, districtFilterEl, exportBtn, importBtn, importFileInput, versionDisplayEl;

function initializeDOMElements() {
    statusMessageEl = document.getElementById('status-message');
    favoritesListEl = document.getElementById('favorites-list');
    nearbyListEl = document.getElementById('nearby-list');
    searchInputEl = document.getElementById('search-input');
    cityFilterEl = document.getElementById('city-filter');
    districtFilterEl = document.getElementById('district-filter');
    exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn');
    importFileInput = document.getElementById('import-file-input');
    versionDisplayEl = document.getElementById('version-display');
}

// --- Services ---
const apiService = {
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            return response;
        } catch (error) {
            console.error(`Error fetching from ${url}:`, error);
            throw error;
        }
    },
    async fetchStations() {
        const response = await this.fetchData(API_URL);
        return await response.json();
    },
    async fetchVersion() {
        try {
            const response = await this.fetchData(VERSION_URL);
            const text = await response.text();
            const versionMatch = text.match(/## (v[\d.]+)/);
            return versionMatch ? versionMatch[1] : 'N/A';
        } catch (error) {
            console.error('Error fetching version:', error);
            return 'N/A';
        }
    }
};

const favoriteService = {
    get() {
        try {
            const favorites = localStorage.getItem(FAVORITES_KEY);
            return new Set(favorites ? JSON.parse(favorites) : []);
        } catch (e) {
            console.error("Failed to parse favorites from localStorage", e);
            return new Set();
        }
    },
    save(favorites) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    },
    toggle(stationId, favoritesSet) {
        if (favoritesSet.has(stationId)) {
            favoritesSet.delete(stationId);
        } else {
            favoritesSet.add(stationId);
        }
        this.save(favoritesSet);
        return favoritesSet;
    }
};

const geolocationService = {
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }
            navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Unable to retrieve your location.')), { timeout: 10000 });
        });
    }
};

const distanceService = {
    calculate(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};

const uiService = {
    renderStations(stations, container, allFavorites) {
        container.innerHTML = '';
        if (!stations || stations.length === 0) {
            const message = container === favoritesListEl ? '無收藏站點，或最愛站點不符合篩選條件。' : '找不到符合條件的站點。';
            container.innerHTML = `<p class="empty-list-message">${message}</p>`;
            return;
        }
        stations.forEach(station => {
            const isFav = allFavorites.has(station.sno);
            const card = this.createStationCard(station, isFav);
            container.appendChild(card);
        });
    },

    createStationCard(station, isFav) {
        const card = document.createElement('div');
        card.className = 'station-card';
        card.dataset.stationId = station.sno;
        const distanceText = station.distance ? `${station.distance.toFixed(2)} km` : '';
        const favButtonText = isFav ? '移除最愛' : '加入最愛';
        const favButtonTitle = isFav ? '從我的最愛中移除' : '加到我的最愛';

        card.innerHTML = `
            <div class="station-info">
                <h3>${station.sna} <span class="station-city">(${station.city === 'Taipei' ? '北市' : '新北'})</span></h3>
                <p class="station-meta">${station.sarea} | ${distanceText}</p>
            </div>
            <div class="station-stats">
                <div class="stat available-bikes" title="可借車輛"><span>${station.sbi}</span><div class="stat-label">可借</div></div>
                <div class="stat available-docks" title="可還空位"><span>${station.bemp}</span><div class="stat-label">可還</div></div>
            </div>
            <div class="station-actions">
                <button class="fav-btn ${isFav ? 'is-favorite' : ''}" title="${favButtonTitle}">${favButtonText}</button>
                <a href="${GOOGLE_MAPS_URL}${station.lat},${station.lng}" target="_blank" class="map-link" title="在Google地圖中開啟">🗺️</a>
            </div>
        `;
        card.querySelector('.fav-btn').addEventListener('click', () => app.toggleFavorite(station.sno));
        return card;
    },

    updateStatus(message, isError = false) {
        if (statusMessageEl) {
            statusMessageEl.textContent = message;
            statusMessageEl.className = isError ? 'status-error' : 'status-info';
        }
    },

    setVersion(version) {
         if (versionDisplayEl) {
            versionDisplayEl.textContent = version;
        }
    },

    populateDistrictFilter(stations, selectedCity) {
        if (!districtFilterEl) return;
        const originalValue = districtFilterEl.value;
        districtFilterEl.innerHTML = '<option value="">所有行政區</option>';

        const stationsToFilter = selectedCity ? stations.filter(s => s.city === selectedCity) : stations;

        const districts = [...new Set(stationsToFilter.map(s => s.sarea))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
        districts.forEach(district => {
            if (!district) return; // Skip if district is null or undefined
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilterEl.appendChild(option);
        });
        districtFilterEl.value = originalValue;
    }
};

const app = {
    stations: [],
    favorites: new Set(),
    userPosition: null,

    async init() {
        initializeDOMElements();
        this.addEventListeners();
        this.favorites = favoriteService.get();

        apiService.fetchVersion().then(uiService.setVersion);

        try {
            uiService.updateStatus('正在取得您的位置...');
            const position = await geolocationService.getCurrentPosition();
            this.userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            uiService.updateStatus('已取得位置，正在讀取站點資料...');
        } catch (error) {
            uiService.updateStatus(error.message, true);
        } finally {
            await this.fetchAndRender();
        }
    },

    async fetchAndRender() {
        try {
            const rawStations = await apiService.fetchStations();
            this.stations = this.processStations(rawStations);
            uiService.populateDistrictFilter(this.stations, cityFilterEl.value);
            this.renderAll();
            uiService.updateStatus('資料載入成功！', false);
        } catch (error) {
            uiService.updateStatus('讀取站點資料失敗，請稍後再試。', true);
        }
    },

    processStations(rawStations) {
        if (!Array.isArray(rawStations)) return [];
        let processed = rawStations.map(station => {
            const distance = this.userPosition ? distanceService.calculate(this.userPosition.lat, this.userPosition.lng, station.lat, station.lng) : null;
            return { ...station, distance };
        });

        if (this.userPosition) {
            processed.sort((a, b) => a.distance - b.distance);
        }
        return processed;
    },

    toggleFavorite(stationId) {
        this.favorites = favoriteService.toggle(stationId, this.favorites);
        this.renderAll();
    },

    addEventListeners() {
        searchInputEl.addEventListener('input', () => this.renderAll());
        districtFilterEl.addEventListener('change', () => this.renderAll());
        cityFilterEl.addEventListener('change', () => {
            districtFilterEl.value = ''; // Reset district filter
            uiService.populateDistrictFilter(this.stations, cityFilterEl.value);
            this.renderAll();
        });
        exportBtn.addEventListener('click', () => this.exportFavorites());
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (event) => this.importFavorites(event));
    },

    exportFavorites() {
        const favs = Array.from(this.favorites);
        if (favs.length === 0) {
            alert("您沒有任何最愛站點可以匯出。");
            return;
        }
        const dataStr = JSON.stringify(favs, null, 2);
        const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "youbike_favorites.txt");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert(`已成功匯出 ${favs.length} 個最愛站點！`);
    },

    importFavorites(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported) || !imported.every(id => typeof id === 'string')) {
                    throw new Error("Invalid file content");
                }
                const currentFavorites = favoriteService.get();
                const newFavorites = new Set([...currentFavorites, ...imported]);

                favoriteService.save(newFavorites);
                this.favorites = newFavorites;

                this.renderAll();
                alert(`成功匯入 ${imported.length} 個最愛站點！`);
            } catch (error) {
                alert("匯入失敗！請確認檔案內容與格式是否正確。");
            } finally {
                event.target.value = null; // Reset file input
            }
        };
        reader.onerror = () => alert("讀取檔案時發生錯誤。");
        reader.readAsText(file);
    },

    renderAll() {
        // --- Render Favorites (always show all, respecting only search term) ---
        const searchTerm = searchInputEl.value.toLowerCase();
        const favoriteStations = this.stations
            .filter(s => this.favorites.has(s.sno))
            .filter(s => s.sna.toLowerCase().includes(searchTerm) || s.ar.toLowerCase().includes(searchTerm));
        uiService.renderStations(favoriteStations, favoritesListEl, this.favorites);

        // --- Render Nearby Stations (filtered) ---
        const selectedCity = cityFilterEl.value;
        const selectedDistrict = districtFilterEl.value;

        let nearbyStations = this.stations.filter(s => {
            // Exclude stations that are already in favorites
            if (this.favorites.has(s.sno)) return false;

            const cityMatch = !selectedCity || s.city === selectedCity;
            const districtMatch = !selectedDistrict || s.sarea === selectedDistrict;
            const searchMatch = s.sna.toLowerCase().includes(searchTerm) || s.ar.toLowerCase().includes(searchTerm);
            return cityMatch && districtMatch && searchMatch;
        });

        const noFiltersApplied = !searchTerm && !selectedCity && !selectedDistrict;
        if (noFiltersApplied) {
            nearbyStations = nearbyStations.slice(0, 10);
        }

        uiService.renderStations(nearbyStations, nearbyListEl, this.favorites);
    }
};

app.init();
