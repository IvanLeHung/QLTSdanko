import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class NormalizationService {
  static async createNormalizationJob(criteria: any, username: string) {
    const job = await prisma.assetNormalizationJob.create({
      data: {
        status: 'PENDING',
        progress: 0,
        totalIssues: 0,
        criteria: JSON.stringify(criteria),
        createdBy: username
      }
    });

    // Start background execution asynchronously
    this.runNormalizationScan(job.id).catch(err => {
      console.error(`Error running normalization job ${job.id}:`, err);
    });

    return job;
  }

  static async getJobStatus(jobId: number) {
    return await prisma.assetNormalizationJob.findUnique({
      where: { id: jobId }
    });
  }

  static async getJobSuggestions(jobId: number, params: {
    page?: number;
    limit?: number;
    issueType?: string;
    status?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { jobId };
    if (params.issueType) where.issueType = params.issueType;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { assetCode: { contains: params.search, mode: 'insensitive' } },
        { assetName: { contains: params.search, mode: 'insensitive' } },
        { suggestedValue: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.assetNormalizationSuggestion.count({ where }),
      prisma.assetNormalizationSuggestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { confidenceScore: 'desc' }
      })
    ]);

    return { total, page, limit, items };
  }

  private static async runNormalizationScan(jobId: number) {
    const job = await prisma.assetNormalizationJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    await prisma.assetNormalizationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', progress: 5 }
    });

    try {
      const criteria = JSON.parse(job.criteria);
      const activeFilters = criteria.filters || {};
      const issueTypes = criteria.issueTypes || [];

      // 1. Build where clause based on scope selection
      const whereClause: any = { isDeleted: false };
      
      // Handle active session scope
      if (criteria.scopeType === 'SESSION' && criteria.sessionId) {
        const session = await prisma.inventorySession.findUnique({
          where: { id: criteria.sessionId },
          include: { filter: true }
        });
        if (session) {
          // If session has specific filter setting, inherit it
          if (session.filter?.filterJson) {
            const f = JSON.parse(session.filter.filterJson);
            if (f.companyNames?.length) whereClause.companyName = { in: f.companyNames };
            if (f.cityNames?.length) whereClause.cityName = { in: f.cityNames };
            if (f.projectNames?.length) whereClause.projectName = { in: f.projectNames };
            if (f.locationNames?.length) whereClause.locationName = { in: f.locationNames };
            if (f.departmentNames?.length) whereClause.departmentName = { in: f.departmentNames };
            if (f.currentUserNames?.length) whereClause.currentUserName = { in: f.currentUserNames };
          } else {
            // Fallback to department/location scope of the session
            const or: any[] = [];
            if (session.departmentName) or.push({ departmentName: session.departmentName });
            if (session.locationName) or.push({ locationName: session.locationName });
            if (or.length > 0) whereClause.OR = or;
          }
        }
      } else if (criteria.scopeType === 'DEPARTMENT' && criteria.scopeValue) {
        whereClause.departmentName = criteria.scopeValue;
      } else if (criteria.scopeType === 'PROJECT' && criteria.scopeValue) {
        whereClause.projectName = criteria.scopeValue;
      } else if (criteria.scopeType === 'LOCATION' && criteria.scopeValue) {
        whereClause.locationName = criteria.scopeValue;
      } else if (criteria.scopeType === 'USER' && criteria.scopeValue) {
        whereClause.currentUserName = criteria.scopeValue;
      } else if (criteria.scopeType === 'FILTERED') {
        if (activeFilters.companyName) whereClause.companyName = activeFilters.companyName;
        if (activeFilters.cityName) whereClause.cityName = activeFilters.cityName;
        if (activeFilters.projectName) whereClause.projectName = activeFilters.projectName;
        if (activeFilters.locationName) whereClause.locationName = activeFilters.locationName;
        if (activeFilters.departmentName) whereClause.departmentName = activeFilters.departmentName;
        if (activeFilters.currentUserName) whereClause.currentUserName = activeFilters.currentUserName;
        if (activeFilters.status) whereClause.status = activeFilters.status;
      }

      await prisma.assetNormalizationJob.update({
        where: { id: jobId },
        data: { progress: 15 }
      });

      // 2. Fetch all matching assets
      const assets = await prisma.asset.findMany({ where: whereClause });
      if (assets.length === 0) {
        await prisma.assetNormalizationJob.update({
          where: { id: jobId },
          data: { status: 'COMPLETED', progress: 100, totalIssues: 0 }
        });
        return;
      }

      // Collect data distributions to power heuristics
      const deptLocations = new Map<string, string>();
      const userDepts = new Map<string, string>();
      const allAssetCodes = assets.map(a => a.assetCode);
      const duplicateCodes = allAssetCodes.filter((c, i) => allAssetCodes.indexOf(c) !== i);

      assets.forEach(a => {
        if (a.departmentName && a.locationName) deptLocations.set(a.departmentName, a.locationName);
        if (a.currentUserName && a.departmentName) userDepts.set(a.currentUserName, a.departmentName);
      });

      // Helper function to clean string for normalization
      const cleanStringForCompare = (str: string): string => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
          .replace(/[^a-z0-9]/g, ' ')      // Replace special characters with space
          .replace(/\s+/g, ' ')            // Collapse spaces
          .trim();
      };

      const toTitleCaseVietnamese = (str: string): string => {
        return str
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .split(' ')
          .map(word => word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : '')
          .join(' ');
      };

      // Fetch official departments and locations
      const officialDepts = await prisma.department.findMany({ where: { status: 'ACTIVE' } });
      const officialDeptNames = officialDepts.map(d => d.name);
      const deptMap = new Map<string, string>(); // cleanedName -> officialName
      officialDepts.forEach(d => {
        deptMap.set(cleanStringForCompare(d.name), d.name);
        if (d.code) {
          deptMap.set(d.code.toUpperCase(), d.name);
        }
      });

      const officialLocations = await prisma.location.findMany();
      const officialLocNames = officialLocations.map(l => l.name);
      const locMap = new Map<string, string>(); // cleanedName -> officialName
      const locCityMap = new Map<string, string>(); // officialName -> city
      officialLocations.forEach(l => {
        locMap.set(cleanStringForCompare(l.name), l.name);
        locCityMap.set(l.name, l.city);
      });

      const suggestionsData: any[] = [];
      const totalSteps = assets.length;
      let stepCounter = 0;

      for (const asset of assets) {
        stepCounter++;
        if (stepCounter % 100 === 0) {
          const progress = Math.min(90, 15 + Math.floor((stepCounter / totalSteps) * 75));
          await prisma.assetNormalizationJob.update({
            where: { id: jobId },
            data: { progress }
          });
        }

        // --- Rule 1: Thiếu mã tài sản (MISSING_CODE) ---
        if (issueTypes.includes('MISSING_CODE') && (!asset.assetCode || asset.assetCode.trim() === '')) {
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode || 'TEMP_CODE',
            assetName: asset.assetName,
            issueType: 'MISSING_CODE',
            fieldName: 'assetCode',
            currentValue: asset.assetCode,
            suggestedValue: `TS-TEMP-${asset.id}`,
            confidenceScore: 0.99,
            source: 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 2: Trùng mã tài sản (DUPLICATE_CODE) ---
        if (issueTypes.includes('DUPLICATE_CODE') && duplicateCodes.includes(asset.assetCode)) {
          const count = suggestionsData.filter(s => s.assetCode === asset.assetCode).length + 1;
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'DUPLICATE_CODE',
            fieldName: 'assetCode',
            currentValue: asset.assetCode,
            suggestedValue: `${asset.assetCode}-DUP${count}`,
            confidenceScore: 0.80,
            source: 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 3: Thiếu tên tài sản (MISSING_NAME) ---
        if (issueTypes.includes('MISSING_NAME') && (!asset.assetName || asset.assetName.trim() === '')) {
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'MISSING_NAME',
            fieldName: 'assetName',
            currentValue: asset.assetName,
            suggestedValue: 'Tài sản chưa đặt tên',
            confidenceScore: 0.50,
            source: 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 4: Tên tài sản chưa chuẩn (WRONG_NAME) ---
        if (issueTypes.includes('WRONG_NAME') && asset.assetName) {
          const original = asset.assetName;
          let suggested = original
            .replace(/\s+/g, ' ') // Remove double spaces
            .trim();

          // Title Case Brand Corrections
          const brandReplacements: [RegExp, string][] = [
            [/lap\s*top/gi, 'Laptop'],
            [/dell/gi, 'Dell'],
            [/hp/gi, 'HP'],
            [/lenovo/gi, 'Lenovo'],
            [/thinkpad/gi, 'ThinkPad'],
            [/macbook/gi, 'MacBook'],
            [/asus/gi, 'Asus'],
            [/acer/gi, 'Acer'],
            [/may\s*in/gi, 'Máy in'],
            [/man\s*hinh/gi, 'Màn hình'],
            [/o\s*cung/gi, 'Ổ cứng']
          ];

          brandReplacements.forEach(([regex, replacement]) => {
            suggested = suggested.replace(regex, replacement);
          });

          // If changes made
          if (suggested !== original) {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_NAME',
              fieldName: 'assetName',
              currentValue: original,
              suggestedValue: suggested,
              confidenceScore: 0.95,
              source: 'SYSTEM_RULE',
              status: 'PENDING'
            });
          }
        }

        // --- Rule 5: Sai nhóm tài sản (WRONG_CATEGORY) ---
        if (issueTypes.includes('WRONG_CATEGORY') && asset.assetName) {
          const lowerName = asset.assetName.toLowerCase();
          const currentCat = asset.level2Name || '';
          
          if ((lowerName.includes('laptop') || lowerName.includes('dell') || lowerName.includes('macbook') || lowerName.includes('thinkpad')) && 
              currentCat !== 'Thiết bị CNTT' && currentCat !== 'Máy tính và Thiết bị mạng') {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_CATEGORY',
              fieldName: 'level2Name',
              currentValue: currentCat,
              suggestedValue: 'Thiết bị CNTT',
              confidenceScore: 0.90,
              source: 'CATEGORY_MAPPING',
              status: 'PENDING'
            });
          }
        }

        // --- Rule 6: Thiếu phòng ban (MISSING_DEPARTMENT) ---
        if (issueTypes.includes('MISSING_DEPARTMENT') && (!asset.departmentName || asset.departmentName.trim() === '')) {
          const userDept = asset.currentUserName ? userDepts.get(asset.currentUserName) : null;
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'MISSING_DEPARTMENT',
            fieldName: 'departmentName',
            currentValue: asset.departmentName,
            suggestedValue: userDept || 'Ban Hành chính Nhân sự',
            confidenceScore: userDept ? 0.75 : 0.40,
            source: userDept ? 'CUSTODIAN_HEURISTICS' : 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 7: Thiếu vị trí (MISSING_LOCATION) ---
        if (issueTypes.includes('MISSING_LOCATION') && (!asset.locationName || asset.locationName.trim() === '')) {
          const primaryLocation = asset.departmentName ? deptLocations.get(asset.departmentName) : null;
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'MISSING_LOCATION',
            fieldName: 'locationName',
            currentValue: asset.locationName,
            suggestedValue: primaryLocation || 'Hà Nội - Văn phòng C6',
            confidenceScore: primaryLocation ? 0.70 : 0.35,
            source: primaryLocation ? 'DEPARTMENT_MAPPING' : 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 8: Thiếu người sử dụng (MISSING_USER) ---
        if (issueTypes.includes('MISSING_USER') && asset.status === 'ASSIGNED' && (!asset.currentUserName || asset.currentUserName.trim() === '')) {
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'MISSING_USER',
            fieldName: 'currentUserName',
            currentValue: asset.currentUserName,
            suggestedValue: 'Chưa xác định người dùng',
            confidenceScore: 0.50,
            source: 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 9: Sai trạng thái sử dụng (WRONG_STATUS) ---
        if (issueTypes.includes('WRONG_STATUS')) {
          if (asset.status === 'IN_STOCK' && asset.currentUserName && asset.currentUserName.trim() !== '') {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_STATUS',
              fieldName: 'status',
              currentValue: 'IN_STOCK',
              suggestedValue: 'ASSIGNED',
              confidenceScore: 0.85,
              source: 'SYSTEM_RULE',
              status: 'PENDING'
            });
          } else if (asset.status === 'ASSIGNED' && (!asset.currentUserName || asset.currentUserName.trim() === '') && (!asset.departmentName || asset.departmentName.trim() === '')) {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_STATUS',
              fieldName: 'status',
              currentValue: 'ASSIGNED',
              suggestedValue: 'IN_STOCK',
              confidenceScore: 0.85,
              source: 'SYSTEM_RULE',
              status: 'PENDING'
            });
          }
        }

        // --- Rule 10: Thiếu serial (MISSING_SERIAL) ---
        if (issueTypes.includes('MISSING_SERIAL') && (!asset.serialNumber || asset.serialNumber.trim() === '')) {
          suggestionsData.push({
            jobId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'MISSING_SERIAL',
            fieldName: 'serialNumber',
            currentValue: asset.serialNumber,
            suggestedValue: 'Cần bổ sung serial',
            confidenceScore: 0.95,
            source: 'SYSTEM_RULE',
            status: 'PENDING'
          });
        }

        // --- Rule 11: Tên viết tắt không thống nhất (WRONG_ABBREVIATION) ---
        if (issueTypes.includes('WRONG_ABBREVIATION') && asset.departmentName) {
          const dept = asset.departmentName.trim().toUpperCase();
          let suggestedDept = null;
          if (dept === 'HCNS') suggestedDept = 'Ban Hành chính Nhân sự';
          else if (dept === 'KT') suggestedDept = 'Phòng Kế toán';
          else if (dept === 'IT' || dept === 'CNTT') suggestedDept = 'Phòng Công nghệ thông tin';

          if (suggestedDept && suggestedDept !== asset.departmentName) {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_ABBREVIATION',
              fieldName: 'departmentName',
              currentValue: asset.departmentName,
              suggestedValue: suggestedDept,
              confidenceScore: 0.98,
              source: 'DEPARTMENT_MAPPING',
              status: 'PENDING'
            });
          }
        }

        // --- Rule 12: Sai/Chưa chuẩn tên phòng ban (WRONG_DEPARTMENT) ---
        if (issueTypes.includes('WRONG_DEPARTMENT') && asset.departmentName && asset.departmentName.trim() !== '') {
          const deptVal = asset.departmentName.trim();
          if (!officialDeptNames.includes(deptVal)) {
            // Try matching
            const cleanedVal = cleanStringForCompare(deptVal);
            let suggestedDept = deptMap.get(cleanedVal) || deptMap.get(deptVal.toUpperCase());
            let confidence = 0.95;

            if (!suggestedDept) {
              // Try substring matching
              const match = officialDepts.find(d => 
                cleanStringForCompare(d.name).includes(cleanedVal) || 
                cleanedVal.includes(cleanStringForCompare(d.name))
              );
              if (match) {
                suggestedDept = match.name;
                confidence = 0.85;
              }
            }

            if (!suggestedDept) {
              // Suggest title case
              suggestedDept = toTitleCaseVietnamese(deptVal);
              confidence = 0.70;
            }

            if (suggestedDept && suggestedDept !== deptVal) {
              suggestionsData.push({
                jobId,
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.assetName,
                issueType: 'WRONG_DEPARTMENT',
                fieldName: 'departmentName',
                currentValue: deptVal,
                suggestedValue: suggestedDept,
                confidenceScore: confidence,
                source: 'DEPARTMENT_MAPPING',
                status: 'PENDING'
              });
            }
          }
        }

        // --- Rule 13: Sai/Chưa chuẩn tên vị trí (WRONG_LOCATION) ---
        if (issueTypes.includes('WRONG_LOCATION') && asset.locationName && asset.locationName.trim() !== '') {
          const locVal = asset.locationName.trim();
          if (!officialLocNames.includes(locVal)) {
            const cleanedVal = cleanStringForCompare(locVal);
            let suggestedLoc = locMap.get(cleanedVal);
            let confidence = 0.95;

            if (!suggestedLoc) {
              // Try substring matching
              const match = officialLocations.find(l => 
                cleanStringForCompare(l.name).includes(cleanedVal) || 
                cleanedVal.includes(cleanStringForCompare(l.name))
              );
              if (match) {
                suggestedLoc = match.name;
                confidence = 0.85;
              }
            }

            if (!suggestedLoc) {
              suggestedLoc = toTitleCaseVietnamese(locVal);
              confidence = 0.70;
            }

            if (suggestedLoc && suggestedLoc !== locVal) {
              suggestionsData.push({
                jobId,
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.assetName,
                issueType: 'WRONG_LOCATION',
                fieldName: 'locationName',
                currentValue: locVal,
                suggestedValue: suggestedLoc,
                confidenceScore: confidence,
                source: 'LOCATION_MAPPING',
                status: 'PENDING'
              });
            }
          }
        }

        // --- Rule 14: Sai/Chưa chuẩn tên thành phố (WRONG_CITY) ---
        if (issueTypes.includes('WRONG_CITY') && asset.cityName) {
          const cityVal = asset.cityName.trim();
          let expectedCity = null;
          let confidence = 0.95;

          // 1. Check if location has official city
          if (asset.locationName) {
            const officialLoc = officialLocations.find(l => l.name === asset.locationName);
            if (officialLoc) {
              expectedCity = officialLoc.city;
              confidence = 0.98;
            }
          }

          // 2. Clean city mapping heuristics
          if (!expectedCity && cityVal) {
            const cleanedCity = cleanStringForCompare(cityVal);
            if (['hn', 'hanoi', 'ha noi', 'ha` no^i`'].includes(cleanedCity)) {
              expectedCity = 'Hà Nội';
            } else if (['hcm', 'tphcm', 'ho chi minh', 'saigon', 'sai gon', 'ho` chi\' minh'].includes(cleanedCity)) {
              expectedCity = 'TP. Hồ Chí Minh';
            } else if (['dn', 'da nang', 'da` na(`ng'].includes(cleanedCity)) {
              expectedCity = 'Đà Nẵng';
            }
          }

          if (expectedCity && expectedCity !== cityVal) {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_CITY',
              fieldName: 'cityName',
              currentValue: cityVal,
              suggestedValue: expectedCity,
              confidenceScore: confidence,
              source: 'CITY_MAPPING',
              status: 'PENDING'
            });
          }
        }

        // --- Rule 15: Sai/Chưa chuẩn tên dự án (WRONG_PROJECT) ---
        if (issueTypes.includes('WRONG_PROJECT') && asset.projectName && asset.projectName.trim() !== '') {
          const projectVal = asset.projectName.trim();
          const cleanProject = toTitleCaseVietnamese(projectVal);

          if (cleanProject !== projectVal) {
            suggestionsData.push({
              jobId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              issueType: 'WRONG_PROJECT',
              fieldName: 'projectName',
              currentValue: projectVal,
              suggestedValue: cleanProject,
              confidenceScore: 0.90,
              source: 'PROJECT_MAPPING',
              status: 'PENDING'
            });
          }
        }
      }

      // Bulk create suggestions
      if (suggestionsData.length > 0) {
        await prisma.assetNormalizationSuggestion.createMany({
          data: suggestionsData
        });
      }

      await prisma.assetNormalizationJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          totalIssues: suggestionsData.length
        }
      });

    } catch (err: any) {
      await prisma.assetNormalizationJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', reason: err.message }
      });
    }
  }

  static async updateSuggestionValue(id: number, suggestedValue: string, reason?: string) {
    return await prisma.assetNormalizationSuggestion.update({
      where: { id },
      data: {
        suggestedValue,
        status: 'EDITED',
        reason
      }
    });
  }

  static async approveSuggestions(suggestionIds: number[], approvedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const suggestions = await tx.assetNormalizationSuggestion.findMany({
        where: {
          id: { in: suggestionIds },
          status: { in: ['PENDING', 'EDITED'] }
        }
      });

      const historyRecords = [];

      for (const sug of suggestions) {
        const valToApply = sug.suggestedValue;
        
        // 1. Fetch current asset
        const asset = await tx.asset.findUnique({ where: { id: sug.assetId } });
        if (!asset) continue;

        // 2. Prepare field update
        const updateData: any = {};
        updateData[sug.fieldName] = valToApply;

        // Apply update to Asset
        await tx.asset.update({
          where: { id: sug.assetId },
          data: updateData
        });

        // 3. Mark Suggestion as Approved
        await tx.assetNormalizationSuggestion.update({
          where: { id: sug.id },
          data: { status: 'APPROVED' }
        });

        // 4. Collect for normalization history logs
        historyRecords.push({
          assetId: sug.assetId,
          fieldName: sug.fieldName,
          oldValue: sug.currentValue,
          suggestedValue: sug.suggestedValue,
          finalValue: valToApply,
          confidenceScore: sug.confidenceScore,
          approvedBy,
          reason: sug.reason || 'Duyệt chuẩn hóa dữ liệu'
        });
      }

      if (historyRecords.length > 0) {
        await tx.assetNormalizationHistory.createMany({
          data: historyRecords
        });
      }

      // Log action using audit service
      await AuditService.log({
        entityType: 'NORMALIZATION',
        entityId: suggestions[0]?.jobId || 0,
        action: 'UPDATE',
        details: { approvedCount: suggestions.length },
        performedBy: approvedBy,
        tx
      });

      return { approvedCount: suggestions.length };
    }, { timeout: 30000 });
  }

  static async rejectSuggestions(suggestionIds: number[]) {
    await prisma.assetNormalizationSuggestion.updateMany({
      where: { id: { in: suggestionIds } },
      data: { status: 'REJECTED' }
    });
    return { rejectedCount: suggestionIds.length };
  }

  static async getHistoryLogs(params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.assetNormalizationHistory.count(),
      prisma.assetNormalizationHistory.findMany({
        skip,
        take: limit,
        orderBy: { approvedAt: 'desc' }
      })
    ]);

    return { total, page, limit, items };
  }
}
