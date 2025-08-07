class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
    }

    async loadCSV() {
        try {
            // Спроба завантаження через fetch
            const response = await fetch('results.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
            return this.processedData;
        } catch (error) {
            console.warn('Не вдалося завантажити CSV через fetch, використовуємо вбудовані дані');
            // Використання вбудованих даних як fallback
            this.loadEmbeddedData();
            return this.processedData;
        }
    }

    loadEmbeddedData() {
        // Вбудовані дані з CSV файлу
        const csvData = `"timestamp","latlng","odometer"
"1754543792","""49.972678,36.301253""","37911894"
"1754543361","""49.949600,36.384890""","37905347"
"1754544376","""49.992947,36.255598""","37916131"
"1754544061","""49.989742,36.265702""","37915134"
"1754544392","""49.993527,36.255878""","37916202"
"1754544003","""49.984900,36.275548""","37914244"
"1754544349","""49.992315,36.255320""","37916061"
"1754543319","""49.948002,36.383502""","37905148"
"1754543856","""49.975008,36.295270""","37912447"
"1754544398","""49.993708,36.255605""","37916232"`;
        
        this.parseCSV(csvData);
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        
        this.rawData = [];
        this.processedData = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            if (values.length >= 3) {
                const timestamp = parseFloat(values[0]);
                const latlngStr = values[1].replace(/"/g, '');
                const odometer = values[2] === 'null' ? null : parseInt(values[2]);

                // Парсинг координат
                const coords = latlngStr.split(',');
                if (coords.length === 2) {
                    const lat = parseFloat(coords[0]);
                    const lng = parseFloat(coords[1]);

                    if (!isNaN(lat) && !isNaN(lng) && !isNaN(timestamp)) {
                        const point = {
                            timestamp: timestamp,
                            date: new Date(timestamp * 1000),
                            lat: lat,
                            lng: lng,
                            odometer: odometer
                        };

                        this.rawData.push(point);
                        this.processedData.push(point);
                    }
                }
            }
        }

        // Сортування за часом
        this.processedData.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`Завантажено ${this.processedData.length} точок`);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    filterByTimeRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return this.processedData;
        }

        const startTimestamp = startDate.getTime() / 1000;
        const endTimestamp = endDate.getTime() / 1000;

        return this.processedData.filter(point => 
            point.timestamp >= startTimestamp && point.timestamp <= endTimestamp
        );
    }

    getTimeRange() {
        if (this.processedData.length === 0) {
            return { min: new Date(), max: new Date() };
        }

        const timestamps = this.processedData.map(p => p.timestamp);
        return {
            min: new Date(Math.min(...timestamps) * 1000),
            max: new Date(Math.max(...timestamps) * 1000)
        };
    }

    getBounds() {
        if (this.processedData.length === 0) {
            return [[49.9, 36.2], [50.0, 36.4]]; // Дефолтні межі для Харкова
        }

        const lats = this.processedData.map(p => p.lat);
        const lngs = this.processedData.map(p => p.lng);

        return [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ];
    }
}