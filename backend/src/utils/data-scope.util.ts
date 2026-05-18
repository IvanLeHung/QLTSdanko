export interface EntityFields {
  company: string;
  department: string;
  warehouse: string;
  user: string;
  project?: string;
  category1?: string;
  category2?: string;
  category3?: string;
  category4?: string;
}

export function buildDataScopeWhere(
  scope: any, 
  currentUserId: number, 
  entityFields: EntityFields = {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName',
    project: 'projectName',
    category1: 'level1Code',
    category2: 'level2Code',
    category3: 'level3Code',
    category4: 'level4Code'
  },
  userDepartmentName?: string | null
): any {
  // 1. Build basic row-level scope query
  const baseQuery = getBaseScopeQuery(scope, currentUserId, entityFields, userDepartmentName);

  // 2. Wrap under Category Limitation if it's an Asset-like table (has category fields defined)
  if (scope && scope.categoryIdsJson && entityFields.category1) {
    try {
      const categoryIds = JSON.parse(scope.categoryIdsJson) as string[];
      if (categoryIds.length > 0) {
        const catField1 = entityFields.category1;
        const catField2 = entityFields.category2 || 'level2Code';
        const catField3 = entityFields.category3 || 'level3Code';
        const catField4 = entityFields.category4 || 'level4Code';

        const categoryFilter = {
          OR: [
            { [catField1]: { in: categoryIds } },
            { [catField2]: { in: categoryIds } },
            { [catField3]: { in: categoryIds } },
            { [catField4]: { in: categoryIds } }
          ]
        };

        // If the base query is see-all ({}), simply return the category filter
        if (Object.keys(baseQuery).length === 0) {
          return categoryFilter;
        }

        // Otherwise, intersect the base scope and category limit
        return {
          AND: [
            baseQuery,
            categoryFilter
          ]
        };
      }
    } catch (e) {
      console.error('Failed to parse categoryIdsJson', e);
    }
  }

  return baseQuery;
}

function getBaseScopeQuery(
  scope: any, 
  currentUserId: number, 
  entityFields: EntityFields,
  userDepartmentName?: string | null
): any {
  if (!scope || scope.scopeType === 'ALL') {
    return {}; // No filter, see all
  }

  if (scope.scopeType === 'SELF') {
    return { [entityFields.user]: '{{CURRENT_USER}}' }; 
  }

  if (scope.scopeType === 'DEPARTMENT') {
    if (scope.departmentIdsJson) {
      try {
        const departmentIds = JSON.parse(scope.departmentIdsJson) as string[];
        if (departmentIds.length > 0) {
          return { [entityFields.department]: { in: departmentIds } };
        }
      } catch (e) {}
    }
    return userDepartmentName ? { [entityFields.department]: userDepartmentName } : { id: -1 };
  }

  if (scope.scopeType === 'COMPANY') {
    if (scope.companyIdsJson) {
      try {
        const companyIds = JSON.parse(scope.companyIdsJson) as string[];
        if (companyIds.length > 0) {
          return { [entityFields.company]: { in: companyIds } };
        }
      } catch (e) {}
    }
    return { id: -1 };
  }

  if (scope.scopeType === 'WAREHOUSE') {
    if (scope.warehouseIdsJson) {
      try {
        const warehouseIds = JSON.parse(scope.warehouseIdsJson) as string[];
        if (warehouseIds.length > 0) {
          return { [entityFields.warehouse]: { in: warehouseIds } };
        }
      } catch (e) {}
    }
    return { id: -1 };
  }

  if (scope.scopeType === 'PROJECT') {
    if (scope.projectIdsJson) {
      try {
        const projectIds = JSON.parse(scope.projectIdsJson) as string[];
        if (projectIds.length > 0) {
          return { [entityFields.project || 'projectName']: { in: projectIds } };
        }
      } catch (e) {}
    }
    return { id: -1 };
  }

  if (scope.scopeType === 'CUSTOM') {
    const orClauses: any[] = [];
    
    if (scope.companyIdsJson) {
      try {
        const companyIds = JSON.parse(scope.companyIdsJson) as string[];
        if (companyIds.length > 0) {
          orClauses.push({ [entityFields.company]: { in: companyIds } });
        }
      } catch (e) {}
    }
    
    if (scope.departmentIdsJson) {
      try {
        const departmentIds = JSON.parse(scope.departmentIdsJson) as string[];
        if (departmentIds.length > 0) {
          orClauses.push({ [entityFields.department]: { in: departmentIds } });
        }
      } catch (e) {}
    }

    if (scope.warehouseIdsJson) {
      try {
        const warehouseIds = JSON.parse(scope.warehouseIdsJson) as string[];
        if (warehouseIds.length > 0) {
          orClauses.push({ [entityFields.warehouse]: { in: warehouseIds } });
        }
      } catch (e) {}
    }

    if (scope.projectIdsJson) {
      try {
        const projectIds = JSON.parse(scope.projectIdsJson) as string[];
        if (projectIds.length > 0) {
          orClauses.push({ [entityFields.project || 'projectName']: { in: projectIds } });
        }
      } catch (e) {}
    }

    if (orClauses.length > 0) {
      return { OR: orClauses };
    } else {
      return { id: -1 }; 
    }
  }

  // Fallback for unexpected scope types
  return { id: -1 };
}
