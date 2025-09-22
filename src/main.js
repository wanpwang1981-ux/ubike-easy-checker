// --- Constants ---
const API_URL = 'stations.json';
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';

// --- DOM Elements ---
let statusMessageEl, favoritesListEl, nearbyListEl, searchInputEl, cityFilterEl, districtFilterEl, exportBtn, importBtn, importFileInput;

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
}

// --- Services ---
const apiService = {
    async fetchStations() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching station data:', error);
            throw error;
        }
    }
};

const favoriteService = {
    key: 'ubike-favorites',
    get() {
        try {
            const favorites = localStorage.getItem(this.key);
            return new Set(favorites ? JSON.parse(favorites) : []);
        } catch (e) { return new Set(); }
    },
    save(favorites) {
        localStorage.setItem(this.key, JSON.stringify(Array.from(favorites)));
    },
    toggle(stationId) {
        const favorites = this.get();
        if (favorites.has(stationId)) {
            favorites.delete(stationId);
        } else {
            favorites.add(stationId);
        }
        this.save(favorites);
        return favorites;
    }
};

const geolocationService = {
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Geolocation not supported.'));
            navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Unable to retrieve location.')), { timeout: 10000 });
        });
    }
};

const distanceService = {
    calculate(lat1, lon1, lat2, lon2) {
        const R = 6371;
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
            container.innerHTML = `<p>${container === favoritesListEl ? '無收藏站點，或最愛站點不符合篩選條件。' : '找不到符合條件的站點。'}</p>`;
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

        const favButtonText = isFav ? '⭐ 移除' : '⭐ 新增';
        const favButtonTitle = isFav ? '從我的最愛中移除' : '加到我的最愛';

        card.innerHTML = `
            <div class="station-info">
                <h3>${station.sna}</h3>
                <p class="station-meta">${station.sarea} | ${distanceText}</p>
            </div>
            <div class="station-stats">
                <div class="stat available-bikes"><span>${station.sbi}</span><div class="stat-label">可借</div></div>
                <div class="stat available-docks"><span>${station.bemp}</span><div class="stat-label">可還</div></div>
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
            statusMessageEl.style.color = isError ? 'red' : 'inherit';
        }
    },
    populateDistrictFilter(stations, selectedCity) {
        if (!districtFilterEl) return;
        districtFilterEl.innerHTML = '<option value="">所有行政區</option>';
        let stationsToFilter = stations;

        if (selectedCity) {
            stationsToFilter = stations.filter(s => {
                if (selectedCity === 'TPE') return s.sno.startsWith('5001');
                if (selectedCity === 'NTP') return s.sno.startsWith('5002');
                return false;
            });
        }

        const districts = [...new Set(stationsToFilter.map(s => s.sarea))].sort();
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilterEl.appendChild(option);
        });
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

        try {
            uiService.updateStatus('Getting your location...');
            const position = await geolocationService.getCurrentPosition();
            this.userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            uiService.updateStatus('Location found. Fetching station data...');
        } catch (error) {
            uiService.updateStatus(error.message, true);
        }
        await this.fetchAndRender();
    },

    async fetchAndRender() {
        try {
            const rawStations = await apiService.fetchStations();
            this.stations = this.processStations(rawStations);
            uiService.populateDistrictFilter(this.stations, cityFilterEl.value);
            this.renderAll();
            uiService.updateStatus('Data loaded successfully.');
        } catch (error) {
            uiService.updateStatus('Failed to load station data.', true);
        }
    },

    processStations(rawStations) {
        if (!Array.isArray(rawStations)) return [];
        let processed = rawStations
            .filter(station => station.act === "1")
            .map(station => {
                const distance = this.userPosition ? distanceService.calculate(this.userPosition.lat, this.userPosition.lng, station.lat, station.lng) : null;
                return { ...station, distance };
            });

        if (this.userPosition) {
            processed.sort((a, b) => a.distance - b.distance);
        } else {
            for (let i = processed.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [processed[i], processed[j]] = [processed[j], processed[i]];
            }
        }
        return processed;
    },

    toggleFavorite(stationId) {
        this.favorites = favoriteService.toggle(stationId);
        this.renderAll();
    },

    addEventListeners() {
        searchInputEl.addEventListener('input', () => this.renderAll());
        districtFilterEl.addEventListener('change', () => this.renderAll());
        cityFilterEl.addEventListener('change', () => {
            districtFilterEl.value = '';
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
        link.setAttribute("download", "ubike_favorites.txt");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                this.favorites = new Set(imported);
                favoriteService.save(this.favorites);
                this.renderAll();
                alert(`成功匯入 ${imported.length} 個最愛站點！`);
            } catch (error) {
                alert("匯入失敗！請確認檔案內容與格式是否正確。");
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = () => alert("讀取檔案時發生錯誤。");
        reader.readAsText(file);
    },

    renderAll() {
        const searchTerm = searchInputEl.value.toLowerCase();
        const selectedCity = cityFilterEl.value;
        const selectedDistrict = districtFilterEl.value;

        const filteredStations = this.stations.filter(s => {
            const cityMatch = !selectedCity || (selectedCity === 'TPE' && s.sno.startsWith('5001')) || (selectedCity === 'NTP' && s.sno.startsWith('5002'));
            const districtMatch = !selectedDistrict || s.sarea === selectedDistrict;
            const searchMatch = s.sna.toLowerCase().includes(searchTerm);
            return cityMatch && districtMatch && searchMatch;
        });

        const favoriteStations = filteredStations.filter(s => this.favorites.has(s.sno));
        let nearbyStations = filteredStations.filter(s => !this.favorites.has(s.sno));

        const noFiltersApplied = !searchTerm && !selectedCity && !selectedDistrict;
        if (noFiltersApplied) {
            nearbyStations = nearbyStations.slice(0, 10);
        }

        uiService.renderStations(favoriteStations, favoritesListEl, this.favorites);
        uiService.renderStations(nearbyStations, nearbyListEl, this.favorites);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
