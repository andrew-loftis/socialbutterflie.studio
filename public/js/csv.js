export function parseCsv(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines.shift());
  return lines.map(line => {
    const values = splitCsvLine(line);
    const record = {};
    headers.forEach((header, idx) => {
      const key = (header || '').trim();
      if (!key) return;
      const value = (values[idx] || '').trim();
      record[key] = value;
      record[key.toLowerCase()] = value;
    });
    return record;
  });
}

export function splitCsvLine(line = '') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function valueFor(record, keys = []) {
  for (const key of keys) {
    if (record == null) continue;
    if (record[key] !== undefined && record[key] !== '') return record[key];
    const lower = key.toLowerCase();
    if (record[lower] !== undefined && record[lower] !== '') return record[lower];
  }
  return '';
}
