// --- Constants ---
const API_URL = 'stations.json'; // Now points to the local file
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';

// --- DOM Elements ---
const statusMessageEl = document.getElementById('status-message');
const favoritesListEl = document.getElementById('favorites-list');
const nearbyListEl = document.getElementById('nearby-list');
const searchInputEl = document.getElementById('search-input');
const districtFilterEl = document.getElementById('district-filter');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importContainer = document.getElementById('import-container');
const importTextarea = document.getElementById('import-textarea');
const importConfirmBtn = document.getElementById('import-confirm-btn');

// --- Services / Modules ---

const apiService = {
    async fetchStations() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return await response.json();
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

            // Add a manual timeout for geolocation
            const timeoutId = setTimeout(() => {
                reject(new Error('Geolocation timed out.'));
            }, 10000); // 10 seconds timeout

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
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
    // Haversine formula to calculate distance between two lat/lng points
    calculate(pos1, pos2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.toRad(pos2.lat - pos1.lat);
        const dLon = this.toRad(pos2.lng - pos1.lng);
        const lat1 = this.toRad(pos1.lat);
        const lat2 = this.toRad(pos2.lat);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
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
        } catch (e) {
            console.error("Could not get favorites from localStorage", e);
            return [];
        }
    },
    save(favorites) {
        try {
            localStorage.setItem(this.key, JSON.stringify(Array.from(favorites)));
        } catch (e) {
            console.error("Could not save favorites to localStorage", e);
        }
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
        container.innerHTML = ''; // Clear previous content
        if (stations.length === 0) {
            if (isFavoritesSection) {
                // Don't show a message if the favorites list is just empty and no filter is active
                if (favoriteService.get().length > 0) {
                     container.innerHTML = '<p>您收藏的站點不符合目前的篩選條件。</p>';
                } else {
                    container.innerHTML = '<p>您尚未加入任何最愛站點。</p>';
                }
            } else {
                container.innerHTML = '<p>找不到符合條件的站點。</p>';
            }
            return;
        }
        stations.forEach(station => {
            const isFav = favoriteIds.includes(station.sno);
            const card = this.createStationCard(station, isFav);
            container.appendChild(card);
        });
    },

    populateDistrictFilter(stations) {
        const districts = [...new Set(stations.map(s => s.sarea))];
        districts.sort();
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

        const isFavoriteClass = isFav ? 'is-favorite' : '';
        const distanceText = station.distance ? `${station.distance.toFixed(2)} km` : 'N/A';

        card.innerHTML = `
            <div class="station-info">
                <h3>${station.sna.replace('YouBike2.0_', '')}</h3>
                <p class="station-meta">距離: ${distanceText} | 最後更新: ${station.mday}</p>
            </div>
            <div class="station-stats">
                <div class="stat available-bikes">
                    <span>${station.sbi}</span>
                    <div class="stat-label">可借</div>
                </div>
                <div class="stat available-docks">
                    <span>${station.bemp}</span>
                    <div class="stat-label">可還</div>
                </div>
            </div>
            <div class="station-actions">
                <button class="fav-btn ${isFavoriteClass}" title="Add to favorites">⭐</button>
                <a href="${GOOGLE_MAPS_URL}${station.lat},${station.lng}" target="_blank" class="map-link" title="Open in Google Maps">🗺️</a>
            </div>
        `;

        // Add event listener for the favorite button on this card
        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            app.toggleFavorite(station.sno, e.currentTarget);
        });

        return card;
    },

    updateStatus(message, isError = false) {
        statusMessageEl.textContent = message;
        statusMessageEl.style.color = isError ? 'red' : 'inherit';
    },

    hideStatus() {
        statusMessageEl.style.display = 'none';
    }
};


// --- Main App Controller ---

const app = {
    stations: [],
    favorites: [],

    async init() {
        this.favorites = favoriteService.get();
        this.addEventListeners();

        try {
            uiService.updateStatus('Getting your location...');
            const position = await geolocationService.getCurrentPosition();

            uiService.updateStatus('Fetching station data...');
            const rawStations = await apiService.fetchStations();

            this.stations = this.processStations(rawStations, position);

            uiService.populateDistrictFilter(this.stations);
            this.renderAll();
            uiService.hideStatus();

        } catch (error) {
            console.error('Initialization failed:', error);
            uiService.updateStatus(error.message, true);
            // Attempt to load data without location
            if (!this.stations.length) {
                this.loadWithoutLocation();
            }
        }
    },

    async loadWithoutLocation() {
        try {
            uiService.updateStatus('Could not get location. Loading station data anyway...');
            const rawStations = await apiService.fetchStations();
            this.stations = this.processStations(rawStations, null);

            uiService.populateDistrictFilter(this.stations);
            this.renderAll();
            uiService.hideStatus();
        } catch (error) {
            uiService.updateStatus('Failed to load any data. Please check your connection and try again.', true);
        }
    },

    processStations(rawStations, userPosition) {
        return rawStations.map(station => ({
            sno: station.sno, // 站點代號
            sna: station.sna, // 站點名稱
            lat: parseFloat(station.lat), // 緯度
            lng: parseFloat(station.lng), // 經度
            sbi: parseInt(station.sbi, 10), // 可借車輛
            bemp: parseInt(station.bemp, 10), // 可還空位
            mday: station.mday, // 資料更新時間
            distance: userPosition ? distanceService.calculate(userPosition, { lat: station.lat, lng: station.lng }) : null
        })).sort((a, b) => {
            if (a.distance === null || b.distance === null) return 0;
            return a.distance - b.distance;
        });
    },

    renderAll() {
        const searchTerm = searchInputEl.value.toLowerCase();
        const selectedDistrict = districtFilterEl.value;

        const filteredStations = this.stations.filter(s => {
            const nameMatch = s.sna.toLowerCase().includes(searchTerm);
            // More explicit check for the "All Districts" option
            const districtMatch = (selectedDistrict === "") || (s.sarea === selectedDistrict);
            return nameMatch && districtMatch;
        });

        // Render favorites
        const favoriteStations = filteredStations.filter(s => this.favorites.includes(s.sno));
        uiService.renderStations(favoriteStations, favoritesListEl, this.favorites, true);

        // Render nearby stations (non-favorites)
        const nearbyStations = filteredStations.filter(s => !this.favorites.includes(s.sno));
        uiService.renderStations(nearbyStations, nearbyListEl, this.favorites, false);
    },

    toggleFavorite(stationId, buttonElement) {
        if (favoriteService.isFavorite(stationId)) {
            favoriteService.remove(stationId);
            buttonElement.classList.remove('is-favorite');
        } else {
            favoriteService.add(stationId);
            buttonElement.classList.add('is-favorite');
        }
        this.favorites = favoriteService.get();
        // Re-render all lists to move the card to the correct section
        this.renderAll();
    },

    addEventListeners() {
        searchInputEl.addEventListener('input', () => this.renderAll());
        districtFilterEl.addEventListener('change', () => this.renderAll());
        exportBtn.addEventListener('click', () => this.exportFavorites());
        importBtn.addEventListener('click', () => this.showImportView());
        importConfirmBtn.addEventListener('click', () => this.importFavorites());
    },

    exportFavorites() {
        const favorites = favoriteService.get();
        if (favorites.length === 0) {
            alert("您沒有任何最愛站點可以匯出。");
            return;
        }
        const exportString = JSON.stringify(favorites);
        prompt("請複製您的最愛代碼:", exportString);
    },

    showImportView() {
        importContainer.classList.toggle('hidden');
    },

    importFavorites() {
        const importString = importTextarea.value.trim();
        if (!importString) {
            alert("請貼上您的最愛代碼。");
            return;
        }
        try {
            const importedFavorites = JSON.parse(importString);
            if (!Array.isArray(importedFavorites)) {
                throw new Error("Invalid format");
            }
            // Basic validation for station IDs (should be strings)
            if (!importedFavorites.every(id => typeof id === 'string')) {
                 throw new Error("Invalid format");
            }

            favoriteService.save(new Set(importedFavorites));
            this.favorites = favoriteService.get();
            this.renderAll();
            importTextarea.value = '';
            importContainer.classList.add('hidden');
            alert(`成功匯入 ${importedFavorites.length} 個最愛站點！`);

        } catch (error) {
            alert("匯入失敗！請確認您的代碼格式是否正確。");
        }
    }
};

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
