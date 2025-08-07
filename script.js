class TrackingMap {
    constructor() {
        this.map = null;
        this.dataProcessor = new DataProcessor();
        this.markers = [];
        this.pathLine = null;
        this.currentData = [];
        this.realtimeInterval = null;
        this.realtimeIndex = 0;
        this.isRealtimeActive = false;
        
        this.init();
    }

    async init() {
        this.initMap();
        this.initControls();
        
        // Завантаження даних
        const data = await this.dataProcessor.loadCSV();
        if (data.length > 0) {
            this.currentData = data;
            this.updateStats();
            this.displayAllPoints();
            this.setupTimeInputs();
        }
    }

    initMap() {
        // Ініціалізація карти з центром на Харкові
        this.map = L.map('map').setView([49.97, 36.3], 12);
        
        // Додавання тайлів OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    initControls() {
        // Фільтрація за часом
        document.getElementById('filter-btn').addEventListener('click', () => {
            this.filterByTime();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetFilter();
        });

        // Симуляція реального часу
        document.getElementById('realtime-btn').addEventListener('click', () => {
            this.startRealtime();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopRealtime();
        });

        // Контроль швидкості
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        
        speedSlider.addEventListener('input', (e) => {
            speedValue.textContent = `${e.target.value}x`;
            if (this.isRealtimeActive) {
                this.stopRealtime();
                this.startRealtime();
            }
        });
    }

    setupTimeInputs() {
        const timeRange = this.dataProcessor.getTimeRange();
        const startInput = document.getElementById('start-time');
        const endInput = document.getElementById('end-time');

        // Форматування дати для input datetime-local
        startInput.value = this.formatDateForInput(timeRange.min);
        endInput.value = this.formatDateForInput(timeRange.max);
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    displayAllPoints() {
        this.clearMap();
        
        if (this.currentData.length === 0) return;

        // Створення маршруту
        const coordinates = this.currentData.map(point => [point.lat, point.lng]);
        
        this.pathLine = L.polyline(coordinates, {
            color: '#007bff',
            weight: 3,
            opacity: 0.8
        }).addTo(this.map);

        // Додавання маркерів для початкової та кінцевої точок
        if (this.currentData.length > 0) {
            const startPoint = this.currentData[0];
            const endPoint = this.currentData[this.currentData.length - 1];

            // Початкова точка (зелена)
            const startMarker = L.marker([startPoint.lat, startPoint.lng], {
                icon: this.createCustomIcon('#28a745')
            }).addTo(this.map);
            
            startMarker.bindPopup(`
                <strong>Початок маршруту</strong><br>
                Час: ${startPoint.date.toLocaleString('uk-UA')}<br>
                Координати: ${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}<br>
                ${startPoint.odometer ? `Одометр: ${startPoint.odometer}` : ''}
            `);

            // Кінцева точка (червона)
            const endMarker = L.marker([endPoint.lat, endPoint.lng], {
                icon: this.createCustomIcon('#dc3545')
            }).addTo(this.map);
            
            endMarker.bindPopup(`
                <strong>Кінець маршруту</strong><br>
                Час: ${endPoint.date.toLocaleString('uk-UA')}<br>
                Координати: ${endPoint.lat.toFixed(6)}, ${endPoint.lng.toFixed(6)}<br>
                ${endPoint.odometer ? `Одометр: ${endPoint.odometer}` : ''}
            `);

            this.markers.push(startMarker, endMarker);
        }

        // Підгонка карти під всі точки
        const bounds = this.dataProcessor.getBounds();
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }

    createCustomIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                background-color: ${color};
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    filterByTime() {
        const startInput = document.getElementById('start-time');
        const endInput = document.getElementById('end-time');
        
        if (!startInput.value || !endInput.value) {
            alert('Будь ласка, виберіть початкову та кінцеву дати');
            return;
        }

        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);

        if (startDate >= endDate) {
            alert('Початкова дата повинна бути раніше кінцевої');
            return;
        }

        this.currentData = this.dataProcessor.filterByTimeRange(startDate, endDate);
        this.updateStats();
        this.displayAllPoints();
    }

    resetFilter() {
        this.currentData = this.dataProcessor.processedData;
        this.updateStats();
        this.displayAllPoints();
        this.setupTimeInputs();
    }

    startRealtime() {
        if (this.currentData.length === 0) {
            alert('Немає даних для симуляції');
            return;
        }

        this.isRealtimeActive = true;
        this.realtimeIndex = 0;
        
        document.getElementById('realtime-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;
        
        this.clearMap();
        
        const speed = parseInt(document.getElementById('speed-slider').value);
        const interval = Math.max(100, 1000 / speed); // Мінімум 100мс між точками

        this.realtimeInterval = setInterval(() => {
            this.addRealtimePoint();
        }, interval);
    }

    addRealtimePoint() {
        if (this.realtimeIndex >= this.currentData.length) {
            this.stopRealtime();
            return;
        }

        const point = this.currentData[this.realtimeIndex];
        
        // Додавання поточної точки
        const marker = L.marker([point.lat, point.lng], {
            icon: this.createCustomIcon('#007bff')
        }).addTo(this.map);
        
        marker.bindPopup(`
            <strong>Точка ${this.realtimeIndex + 1}</strong><br>
            Час: ${point.date.toLocaleString('uk-UA')}<br>
            Координати: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}<br>
            ${point.odometer ? `Одометр: ${point.odometer}` : ''}
        `);

        this.markers.push(marker);

        // Оновлення маршруту
        if (this.realtimeIndex > 0) {
            const coordinates = this.currentData
                .slice(0, this.realtimeIndex + 1)
                .map(p => [p.lat, p.lng]);
            
            if (this.pathLine) {
                this.map.removeLayer(this.pathLine);
            }
            
            this.pathLine = L.polyline(coordinates, {
                color: '#007bff',
                weight: 3,
                opacity: 0.8
            }).addTo(this.map);
        }

        // Центрування карти на поточній точці
        this.map.setView([point.lat, point.lng], this.map.getZoom());

        // Оновлення статистики
        document.getElementById('current-point').textContent = 
            `${this.realtimeIndex + 1} з ${this.currentData.length}`;

        this.realtimeIndex++;
    }

    stopRealtime() {
        this.isRealtimeActive = false;
        
        if (this.realtimeInterval) {
            clearInterval(this.realtimeInterval);
            this.realtimeInterval = null;
        }
        
        document.getElementById('realtime-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('current-point').textContent = '-';
    }

    clearMap() {
        // Очищення маркерів
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];

        // Очищення маршруту
        if (this.pathLine) {
            this.map.removeLayer(this.pathLine);
            this.pathLine = null;
        }
    }

    updateStats() {
        document.getElementById('total-points').textContent = this.dataProcessor.processedData.length;
        document.getElementById('visible-points').textContent = this.currentData.length;
    }
}

// Ініціалізація додатку після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
    new TrackingMap();
});