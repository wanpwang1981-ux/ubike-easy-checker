document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const API_URL = 'stations.json';
    const VERSION_URL = '../version.md';
    const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';
    const FAVORITES_KEY = 'ubike-favorites';

    // --- DOM Elements ---
    const statusMessageEl = document.getElementById('status-message');
    const favoritesListEl = document.getElementById('favorites-list');
    const nearbyListEl = document.getElementById('nearby-list');
    const searchInputEl = document.getElementById('search-input');
    const cityFilterEl = document.getElementById('city-filter');
    const districtFilterEl = document.getElementById('district-filter');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const versionDisplayEl = document.getElementById('version-display');
    const refreshFavoritesBtn = document.getElementById('refresh-favorites-btn');
    const refreshNearbyBtn = document.getElementById('refresh-nearby-btn');

    // --- App State ---
    let stations = [];
    let favorites = new Set();
    let userPosition = null;

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
                const storedFavorites = localStorage.getItem(FAVORITES_KEY);
                return new Set(storedFavorites ? JSON.parse(storedFavorites) : []);
            } catch (e) {
                console.error("Failed to parse favorites from localStorage", e);
                return new Set();
            }
        },
        save(favs) {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs)));
        },
        toggle(stationId) {
            favorites.has(stationId) ? favorites.delete(stationId) : favorites.add(stationId);
            this.save(favorites);
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
        renderStations(stationData, container) {
            container.innerHTML = '';
            if (!stationData || stationData.length === 0) {
                const message = container === favoritesListEl ? '無收藏站點。' : '找不到符合條件的站點。';
                container.innerHTML = `<p class="empty-list-message">${message}</p>`;
                return;
            }
            stationData.forEach(station => {
                const isFav = favorites.has(station.sno);
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
            const cityText = station.city === 'Taipei' ? '北市' : '新北';

            card.innerHTML = `
                <div class="station-info">
                    <h3>${station.sna} <span class="station-city">(${cityText})</span></h3>
                    <p class="station-meta">${station.sarea} | ${distanceText}</p>
                    <p class="station-address">${station.ar}</p>
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
            card.querySelector('.fav-btn').addEventListener('click', () => toggleFavorite(station.sno));
            return card;
        },

        updateStatus(message, isError = false) {
            statusMessageEl.textContent = message;
            statusMessageEl.className = isError ? 'status-error' : 'status-info';
        },

        setVersion(version) {
            if (versionDisplayEl) versionDisplayEl.textContent = version;
        },

        populateDistrictFilter(allStations, selectedCity) {
            const originalValue = districtFilterEl.value;
            districtFilterEl.innerHTML = '<option value="">所有行政區</option>';
            const stationsToFilter = selectedCity ? allStations.filter(s => s.city === selectedCity) : allStations;
            const districts = [...new Set(stationsToFilter.map(s => s.sarea))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            districts.forEach(district => {
                if (!district) return;
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtFilterEl.appendChild(option);
            });
            districtFilterEl.value = originalValue;
        }
    };

    // --- Core App Logic ---
    function toggleFavorite(stationId) {
        favoriteService.toggle(stationId);
        renderAll();
    }

    function renderAll() {
        // 1. Render Favorites (always show all, not affected by filters)
        const favoriteStations = stations.filter(s => favorites.has(s.sno));
        uiService.renderStations(favoriteStations, favoritesListEl);

        // 2. Render Nearby Stations (apply all filters)
        const searchTerm = searchInputEl.value.toLowerCase();
        const selectedCity = cityFilterEl.value;
        const selectedDistrict = districtFilterEl.value;

        let nearbyStations = stations.filter(s => {
            if (favorites.has(s.sno)) return false; // Exclude favorites
            const cityMatch = !selectedCity || s.city === selectedCity;
            const districtMatch = !selectedDistrict || s.sarea === selectedDistrict;
            const searchMatch = s.sna.toLowerCase().includes(searchTerm) || s.ar.toLowerCase().includes(searchTerm);
            return cityMatch && districtMatch && searchMatch;
        });

        // Sort by distance if available, but only for the nearby list
        if (userPosition) {
            nearbyStations.sort((a, b) => a.distance - b.distance);
        }

        const noFiltersApplied = !searchTerm && !selectedCity && !selectedDistrict;
        if (noFiltersApplied) {
            nearbyStations = nearbyStations.slice(0, 5);
        }

        uiService.renderStations(nearbyStations, nearbyListEl);
    }

    async function handleRefresh() {
        uiService.updateStatus('正在更新車位資料...');
        try {
            const newStationData = await apiService.fetchStations();

            // Create a map for quick lookups of new data
            const newStationMap = new Map(newStationData.map(s => [s.sno, s]));

            // Update existing station data in place
            stations.forEach(station => {
                const updatedStation = newStationMap.get(station.sno);
                if (updatedStation) {
                    station.sbi = updatedStation.sbi;
                    station.bemp = updatedStation.bemp;
                }
            });

            renderAll();
            uiService.updateStatus('車位資料更新成功！', false);
        } catch (error) {
            uiService.updateStatus('更新資料失敗，請稍後再試。', true);
        }
    }

    function addEventListeners() {
        searchInputEl.addEventListener('input', renderAll);
        districtFilterEl.addEventListener('change', renderAll);
        cityFilterEl.addEventListener('change', () => {
            districtFilterEl.value = ''; // Reset district filter
            uiService.populateDistrictFilter(stations, cityFilterEl.value);
            renderAll();
        });
        exportBtn.addEventListener('click', exportFavorites);
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importFavorites);
        refreshFavoritesBtn.addEventListener('click', handleRefresh);
        refreshNearbyBtn.addEventListener('click', handleRefresh);
    }

    function exportFavorites() {
        const favsToExport = Array.from(favorites);
        if (favsToExport.length === 0) {
            alert("您沒有任何最愛站點可以匯出。");
            return;
        }
        const dataStr = JSON.stringify(favsToExport, null, 2);
        const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "youbike_favorites.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert(`已成功匯出 ${favsToExport.length} 個最愛站點！`);
    }

    function importFavorites(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported) || !imported.every(id => typeof id === 'string')) {
                    throw new Error("Invalid file content");
                }
                const newFavorites = new Set([...favorites, ...imported]);
                favorites = newFavorites;
                favoriteService.save(favorites);
                renderAll();
                alert(`成功匯入 ${imported.length} 個最愛站點！`);
            } catch (error) {
                alert("匯入失敗！請確認檔案內容與格式是否正確。");
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = () => alert("讀取檔案時發生錯誤。");
        reader.readAsText(file);
    }

    async function init() {
        addEventListeners();
        favorites = favoriteService.get();
        apiService.fetchVersion().then(uiService.setVersion);

        try {
            uiService.updateStatus('正在取得您的位置...');
            const position = await geolocationService.getCurrentPosition();
            userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            uiService.updateStatus('已取得位置，正在讀取站點資料...');
        } catch (error) {
            uiService.updateStatus(error.message, true);
        }

        try {
            const rawStations = await apiService.fetchStations();
            stations = rawStations.map(station => ({
                ...station,
                distance: userPosition ? distanceService.calculate(userPosition.lat, userPosition.lng, station.lat, station.lng) : null
            }));
            if (userPosition) {
                stations.sort((a, b) => a.distance - b.distance);
            }
            uiService.populateDistrictFilter(stations, cityFilterEl.value);
            renderAll();
            uiService.updateStatus('資料載入成功！', false);
        } catch (error) {
            uiService.updateStatus('讀取站點資料失敗，請稍後再試。', true);
        }
    }

    // --- Initialize App ---
    init();
});
