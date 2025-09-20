// --- Constants ---
const API_URL = 'http://localhost:8000/src/stations.json'; // Use the local server
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';

// --- DOM Elements ---
let statusMessageEl, favoritesListEl, nearbyListEl, searchInputEl, districtFilterEl, exportBtn, importBtn, importContainer, importTextarea, importConfirmBtn;

// Function to initialize DOM elements after DOM is loaded
function initializeDOMElements() {
    statusMessageEl = document.getElementById('status-message');
    favoritesListEl = document.getElementById('favorites-list');
    nearbyListEl = document.getElementById('nearby-list');
    searchInputEl = document.getElementById('search-input');
    districtFilterEl = document.getElementById('district-filter');
    exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn');
    importContainer = document.getElementById('import-container');
    importTextarea = document.getElementById('import-textarea');
    importConfirmBtn = document.getElementById('import-confirm-btn');
}


// --- Services / Modules ---

const apiService = {
    async fetchStations() {
        console.log("Attempting to fetch stations from:", API_URL); // DEBUG
        try {
            const response = await fetch(API_URL);
            console.log("Fetch response status:", response.status); // DEBUG
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            // The response from the Taipei City API is a nested object.
            const data = await response.json();
            // The actual station data is in the 'retVal' property.
            return data.retVal || data; // Handle both direct array and nested object
        } catch (error) {
            console.error('Error fetching station data:', error);
            throw error;
        }
    }
};

const geolocationService = {
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }
            const timeoutId = setTimeout(() => reject(new Error('Geolocation timed out.')), 10000);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Unable to retrieve your location. Please grant permission.'));
                }
            );
        });
    }
};

const distanceService = {
    calculate(pos1, pos2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.toRad(pos2.lat - pos1.lat);
        const dLon = this.toRad(pos2.lng - pos1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(pos1.lat)) * Math.cos(this.toRad(pos2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    toRad(value) {
        return value * Math.PI / 180;
    }
};

const favoriteService = {
    key: 'ubike-favorites',
    get() {
        try {
            const favorites = localStorage.getItem(this.key);
            return favorites ? JSON.parse(favorites) : [];
        } catch (e) { return []; }
    },
    save(favorites) {
        try {
            localStorage.setItem(this.key, JSON.stringify(Array.from(favorites)));
        } catch (e) { console.error("Could not save favorites", e); }
    },
    add(stationId) {
        const favorites = new Set(this.get());
        favorites.add(stationId);
        this.save(favorites);
    },
    remove(stationId) {
        const favorites = new Set(this.get());
        favorites.delete(stationId);
        this.save(favorites);
    },
    isFavorite(stationId) {
        return this.get().includes(stationId);
    }
};

const uiService = {
    renderStations(stations, container, favoriteIds, isFavoritesSection = false) {
        container.innerHTML = '';
        if (stations.length === 0) {
            const message = isFavoritesSection ?
                (favoriteService.get().length > 0 ? '您收藏的站點不符合目前的篩選條件。' : '您尚未加入任何最愛站點。') :
                '找不到符合條件的站點。';
            container.innerHTML = `<p>${message}</p>`;
            return;
        }
        stations.forEach(station => {
            const card = this.createStationCard(station, favoriteIds.includes(station.sno));
            container.appendChild(card);
        });
    },

    populateDistrictFilter(stations) {
        const districts = [...new Set(stations.map(s => s.sarea))].sort();
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilterEl.appendChild(option);
        });
    },

    createStationCard(station, isFav) {
        const card = document.createElement('div');
        card.className = 'station-card';
        card.dataset.stationId = station.sno;
        const distanceText = station.distance ? `${station.distance.toFixed(2)} km` : 'N/A';
        card.innerHTML = `
            <div class="station-info">
                <h3>${station.sna.replace('YouBike2.0_', '')}</h3>
                <p class="station-meta">距離: ${distanceText}</p>
            </div>
            <div class="station-stats">
                <div class="stat available-bikes"><span>${station.sbi}</span><div class="stat-label">可借</div></div>
                <div class="stat available-docks"><span>${station.bemp}</span><div class="stat-label">可還</div></div>
            </div>
            <div class="station-actions">
                <button class="fav-btn ${isFav ? 'is-favorite' : ''}" title="加到我的最愛">⭐</button>
                <a href="${GOOGLE_MAPS_URL}${station.lat},${station.lng}" target="_blank" class="map-link" title="在Google地圖中開啟">🗺️</a>
            </div>
        `;
        card.querySelector('.fav-btn').addEventListener('click', (e) => app.toggleFavorite(station.sno));
        return card;
    },

    updateStatus(message, isError = false) {
        statusMessageEl.textContent = message;
        statusMessageEl.style.color = isError ? 'red' : 'inherit';
        statusMessageEl.style.display = 'block';
    },

    hideStatus() {
        statusMessageEl.style.display = 'none';
    }
};

const app = {
    stations: [],
    favorites: [],

    async init() {
        initializeDOMElements(); // Initialize DOM elements now that DOM is ready
        this.addEventListeners();
        this.favorites = favoriteService.get();

        try {
            uiService.updateStatus('正在取得您的位置...');
            const position = await geolocationService.getCurrentPosition();
            await this.fetchAndRender(position);
        } catch (error) {
            uiService.updateStatus(error.message, true);
            console.warn("Could not get location. Loading data without it.");
            await this.fetchAndRender(null); // Load data without location info
        }
    },

    async fetchAndRender(position) {
        try {
            uiService.updateStatus('正在更新站點資料...');
            const rawStations = await apiService.fetchStations();
            this.stations = this.processStations(rawStations, position);
            uiService.populateDistrictFilter(this.stations);
            this.renderAll();
            uiService.hideStatus();
        } catch (apiError) {
            uiService.updateStatus('無法載入站點資料，請稍後再試。', true);
            console.error("API Error:", apiError);
        }
    },

    processStations(rawStations, userPosition) {
        if (!Array.isArray(rawStations)) {
            console.error("Received non-array data for stations:", rawStations);
            return [];
        }
        return rawStations
            .filter(station => station.act === "1") // Only show active stations
            .map(station => ({
                ...station,
                sbi: parseInt(station.sbi, 10) || 0,
                bemp: parseInt(station.bemp, 10) || 0,
                lat: parseFloat(station.lat),
                lng: parseFloat(station.lng),
                distance: userPosition ? distanceService.calculate(userPosition, station) : null
            }))
            .sort((a, b) => (a.distance === null || b.distance === null) ? 0 : a.distance - b.distance);
    },

    renderAll() {
        const searchTerm = searchInputEl.value.toLowerCase();
        const selectedDistrict = districtFilterEl.value;
        const filteredStations = this.stations.filter(s =>
            s.sna.toLowerCase().includes(searchTerm) &&
            (selectedDistrict === "" || s.sarea === selectedDistrict)
        );
        this.favorites = favoriteService.get();
        uiService.renderStations(filteredStations.filter(s => this.favorites.includes(s.sno)), favoritesListEl, this.favorites, true);
        uiService.renderStations(filteredStations.filter(s => !this.favorites.includes(s.sno)), nearbyListEl, this.favorites, false);
    },

    toggleFavorite(stationId) {
        favoriteService.isFavorite(stationId) ? favoriteService.remove(stationId) : favoriteService.add(stationId);
        this.renderAll();
    },

    addEventListeners() {
        searchInputEl.addEventListener('input', () => this.renderAll());
        districtFilterEl.addEventListener('change', () => this.renderAll());
        exportBtn.addEventListener('click', () => this.exportFavorites());
        importBtn.addEventListener('click', () => importContainer.classList.toggle('hidden'));
        importConfirmBtn.addEventListener('click', () => this.importFavorites());
    },

    exportFavorites() {
        const favs = favoriteService.get();
        if (favs.length === 0) return alert("您沒有任何最愛站點可以匯出。");
        prompt("請複製您的最愛代碼:", JSON.stringify(favs));
    },

    importFavorites() {
        const importString = importTextarea.value.trim();
        if (!importString) return alert("請貼上您的最愛代碼。");
        try {
            const imported = JSON.parse(importString);
            if (!Array.isArray(imported) || !imported.every(id => typeof id === 'string')) throw new Error("Invalid format");
            favoriteService.save(new Set(imported));
            this.renderAll();
            importTextarea.value = '';
            importContainer.classList.add('hidden');
            alert(`成功匯入 ${imported.length} 個最愛站點！`);
        } catch (error) {
            alert("匯入失敗！請確認您的代碼格式是否正確。");
        }
    }
};

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => app.init());
