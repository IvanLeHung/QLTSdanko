import { describe, expect, it } from 'vitest';
import { formatAssetDisplayValue } from '../components/AssetDetailPopup';

describe('asset detail display values', () => {
  it.each([undefined, null, '', '   ', 'N/A', 'n/a', 'NA', 'not available'])(
    'renders empty value %s as a double dash',
    (value) => {
      expect(formatAssetDisplayValue(value)).toBe('--');
    }
  );

  it('keeps meaningful values and trims surrounding spaces', () => {
    expect(formatAssetDisplayValue('  B. Kế toán  ')).toBe('B. Kế toán');
    expect(formatAssetDisplayValue(0)).toBe('0');
  });
});
