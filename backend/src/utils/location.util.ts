/**
 * Parses a location string and normalizes it to "City-Project-Location" format.
 * Maps shorthand accentless names like "Mat truoc C6-I" to standard accented formats.
 */
export function parseAndNormalizeLocation(location: string | null | undefined): {
  city: string;
  project: string;
  location: string;
  fullFormatted: string;
} {
  if (!location) {
    return { city: '', project: '', location: '', fullFormatted: '' };
  }

  const trimmed = location.trim();

  // Strip accents and clean up spaces/dashes for mapping checks
  const lower = trimmed.toLowerCase();
  const cleanStr = stripAccents(lower)
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Shorthand rule checks
  if (cleanStr.includes('mat truoc c6 i') || cleanStr.includes('mat truoc c6 1')) {
    return {
      city: 'Hà Nội',
      project: 'Văn phòng C6',
      location: 'Mặt trước Khối I',
      fullFormatted: 'Hà Nội-Văn phòng C6-Mặt trước Khối I'
    };
  }

  if (cleanStr.includes('mat sau c6 i') || cleanStr.includes('mat sau c6 1') || cleanStr.includes('mat sau c6 ii') || cleanStr.includes('mat sau c6 2')) {
    return {
      city: 'Hà Nội',
      project: 'Văn phòng C6',
      location: 'Mặt sau Khối II',
      fullFormatted: 'Hà Nội-Văn phòng C6-Mặt sau Khối II'
    };
  }

  // Parsing formats like "City - Project - Location" or "City / Project / Location" or "City-Project-Location"
  const parts = trimmed.split(/[-/\\]/).map(p => p.trim());
  if (parts.length >= 3) {
    const city = parts[0];
    const project = parts[1];
    const loc = parts.slice(2).join('-');
    return {
      city,
      project,
      location: loc,
      fullFormatted: `${city}-${project}-${loc}`
    };
  } else if (parts.length === 2) {
    const city = parts[0];
    const loc = parts[1];
    return {
      city,
      project: '',
      location: loc,
      fullFormatted: `${city}-${loc}`
    };
  }

  return {
    city: '',
    project: '',
    location: trimmed,
    fullFormatted: trimmed
  };
}

function stripAccents(str: string): string {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
