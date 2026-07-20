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

  const trimmed = normalizeLocationLabel(location.trim());

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
      location: 'Mặt trước C6-I',
      fullFormatted: 'Mặt trước C6-I'
    };
  }

  if (cleanStr.includes('mat sau c6 i') || cleanStr.includes('mat sau c6 1')) {
    return {
      city: 'Hà Nội',
      project: 'Văn phòng C6',
      location: 'Mặt sau C6-I',
      fullFormatted: 'Mặt sau C6-I'
    };
  }

  if (cleanStr.includes('tang 9 c6 i') || cleanStr.includes('tang 9 c6 1')) {
    return {
      city: 'Hà Nội',
      project: 'Văn phòng C6',
      location: 'Tầng 9 C6-I',
      fullFormatted: 'Tầng 9 C6-I'
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

export function normalizeAssetUnit(unit: string | null | undefined): string {
  const value = String(unit || '').trim();
  if (value === 'B?') return 'Bộ';
  if (value === 'Chi?c') return 'Chiếc';
  return value || 'Cái';
}

export function normalizeProjectName(project: string | null | undefined): string {
  const value = String(project || '').trim();
  if (value === 'Du an khac' || value === 'Du án khác') return 'Dự án khác';
  return value;
}

export function normalizeLocationLabel(location: string): string {
  return location
    .replace(/Mat sau C6-I/gi, 'Mặt sau C6-I')
    .replace(/Mat truoc C6-I/gi, 'Mặt trước C6-I')
    .replace(/Tang 9 C6-I/gi, 'Tầng 9 C6-I');
}

function stripAccents(str: string): string {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
