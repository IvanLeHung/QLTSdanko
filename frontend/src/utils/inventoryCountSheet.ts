export type InventoryCountItem = {
  id: number;
  assetId: number;
  assetCode: string;
  expectedCity?: string | null;
  expectedProject?: string | null;
  expectedLocation?: string | null;
  expectedDepartment?: string | null;
  expectedUserName?: string | null;
  expectedSerialNumber?: string | null;
  bookQuantity?: number | null;
  actualQuantity?: number | null;
  actualCity?: string | null;
  actualProject?: string | null;
  actualLocation?: string | null;
  actualDepartment?: string | null;
  quality?: string | null;
  note?: string | null;
  result?: string | null;
  checkedAt?: string | null;
  checkStatus?: string | null;
  asset?: {
    assetName?: string | null;
    cityName?: string | null;
    projectName?: string | null;
    locationName?: string | null;
    departmentName?: string | null;
    currentUserName?: string | null;
    serialNumber?: string | null;
  } | null;
};

export type CountSheetStats = {
  book: number;
  checked: number;
  actual: number;
  missing: number;
  unchecked: number;
};

export type InventoryHierarchyNode = {
  key: string;
  label: string;
  level: 'city' | 'project' | 'location' | 'department';
  items: InventoryCountItem[];
  children: InventoryHierarchyNode[];
};

export const displayInventoryGroupValue = (value?: string | null) => {
  const text = String(value || '').trim();
  return text && !/^(?:n\/?a|not available)$/i.test(text) ? text : '--';
};

const normalizeInventoryLocationPath = (value?: string | null) => String(value || '')
  .trim()
  .toLocaleLowerCase('vi')
  .replace(/\s+(?:-|\/|–)\s+/g, '|')
  .replace(/\s+/g, ' ');

export const inventoryLocationsMatch = (
  expectedLocation: string | null | undefined,
  actualCity: string,
  actualProject: string,
  actualLocation: string
) => {
  const expected = normalizeInventoryLocationPath(expectedLocation);
  const detail = normalizeInventoryLocationPath(actualLocation);
  const full = normalizeInventoryLocationPath([actualCity, actualProject, actualLocation].filter(Boolean).join(' - '));
  return expected === detail || expected === full || Boolean(detail && expected.endsWith(`|${detail}`));
};

export const getInventoryItemSnapshot = (item: InventoryCountItem) => ({
  city: displayInventoryGroupValue(item.expectedCity || item.asset?.cityName),
  project: displayInventoryGroupValue(item.expectedProject || item.asset?.projectName),
  location: displayInventoryGroupValue(item.expectedLocation || item.asset?.locationName),
  department: displayInventoryGroupValue(item.expectedDepartment || item.asset?.departmentName),
  user: displayInventoryGroupValue(item.expectedUserName || item.asset?.currentUserName),
  serial: displayInventoryGroupValue(item.expectedSerialNumber || item.asset?.serialNumber),
  assetName: displayInventoryGroupValue(item.asset?.assetName)
});

export const calculateCountSheetStats = (items: InventoryCountItem[]): CountSheetStats => {
  const book = items.reduce((sum, item) => sum + (Number(item.bookQuantity) || 1), 0);
  const checkedItems = items.filter((item) => item.actualQuantity === 0 || item.actualQuantity === 1);
  const actual = checkedItems.reduce((sum, item) => sum + Number(item.actualQuantity || 0), 0);
  return {
    book,
    checked: checkedItems.length,
    actual,
    missing: checkedItems.reduce((sum, item) => sum + ((Number(item.bookQuantity) || 1) - Number(item.actualQuantity || 0)), 0),
    unchecked: items.length - checkedItems.length
  };
};

export const filterInventoryCountItems = (items: InventoryCountItem[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase('vi');
  if (!normalized) return items;
  return items.filter((item) => {
    const snapshot = getInventoryItemSnapshot(item);
    return [
      item.assetCode,
      snapshot.assetName,
      snapshot.serial,
      snapshot.user,
      snapshot.department,
      snapshot.city,
      snapshot.project,
      snapshot.location,
      item.note
    ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(normalized));
  });
};

export const buildInventoryHierarchy = (items: InventoryCountItem[]): InventoryHierarchyNode[] => {
  const levels: Array<{ key: InventoryHierarchyNode['level']; value: (item: InventoryCountItem) => string }> = [
    { key: 'city', value: (item) => getInventoryItemSnapshot(item).city },
    { key: 'project', value: (item) => getInventoryItemSnapshot(item).project },
    { key: 'location', value: (item) => getInventoryItemSnapshot(item).location },
    { key: 'department', value: (item) => getInventoryItemSnapshot(item).department }
  ];

  const buildLevel = (source: InventoryCountItem[], depth: number, parentKey: string): InventoryHierarchyNode[] => {
    if (depth >= levels.length) return [];
    const level = levels[depth];
    const groups = new Map<string, InventoryCountItem[]>();
    source.forEach((item) => {
      const label = level.value(item);
      groups.set(label, [...(groups.get(label) || []), item]);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'vi'))
      .map(([label, groupItems]) => {
        const key = `${parentKey}/${level.key}:${label}`;
        return {
          key,
          label,
          level: level.key,
          items: groupItems,
          children: buildLevel(groupItems, depth + 1, key)
        };
      });
  };

  return buildLevel(items, 0, 'inventory');
};
