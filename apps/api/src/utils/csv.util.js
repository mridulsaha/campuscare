export function parseCSVBuffer(buffer) {
    const text = buffer.toString('utf-8').trim();
    if (!text) return [];

    const lines = [];
    let currentLine = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentLine.push(currentField.trim());
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            currentLine.push(currentField.trim());
            if (currentLine.some((f) => f.length > 0)) {
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        if (currentLine.some((f) => f.length > 0)) {
            lines.push(currentLine);
        }
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const record = {};
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = row[j] !== undefined ? row[j] : '';
        }
        records.push(record);
    }

    return records;
}

export function generateCSVString(headers = [], rows = []) {
    const escapeField = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        if (/^[=+\-@\t\r]/.test(str)) {
            str = `'${str}`;
        }
        return `"${str.replace(/"/g, '""')}"`;
    };

    const headerLine = headers.map((h) => escapeField(h.label || h.key || h)).join(',');
    const dataLines = rows.map((row) => headers.map((h) => escapeField(row[h.key || h])).join(','));

    return [headerLine, ...dataLines].join('\n');
}