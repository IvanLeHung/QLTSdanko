import React, { useState, useEffect } from 'react';
import { 
  X, Check, Search, Plus, Trash2, Package, MapPin, 
  User, Building, ShieldAlert, ChevronLeft, ChevronRight, 
  Printer, Save, CheckCircle2, History, AlertTriangle,
  ArrowRightLeft, RotateCcw
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { BaseModal } from './BaseModal';

const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Văn phòng C6': [
      'Mặt trước Khối I',
      'Mặt sau Khối I',
      'Kho',
      'Mặt trước Khối II',
      'Mặt sau Khối II',
      'Tầng 9 Khối I',
      'Tầng 2 Khối II'
    ],
    'Vân Canh': ['Kho']
  },
  'Thái Nguyên': {
    'Danko City': ['Trung tâm thương mại', 'Văn phòng BQLDA', 'Kho'],
    'Danko Avenue': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko Sun River': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Bắc Ninh': {
    'Danko Riverside': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Tuyên Quang': {
    'Danko Center': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Thanh Hóa': {
    'Danko Royal': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko The Country': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Phú Thọ': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  },
  'Hà Nam': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  }
};

interface LocationTree {
  [key: string]: LocationTree | null;
}

const DANKO_CITY_LOCATION_TREE: LocationTree = {
  'Ban Quản lý dự án': null,
  'Ban Cây Xanh': null,
  'KHU CỔNG CHÀO': {
    'Cổng chính Khu đô thị': {
      'Phòng bảo vệ': null,
      'Phòng Server': null
    },
    'Quảng trường Ánh sáng The Light': null,
    'Cổng phụ dự án': {
      'Phòng bảo vệ': null
    }
  },
  'KHU ĐẠI LỘ': {
    'Đại lộ Champs Elysees': null
  },
  'KHU TRUNG TÂM': {
    'Trung tâm thương mại Danko Plaza': {
      'Tầng hầm': {
        'Phòng bảo vệ': null,
        'Phòng kho': null,
        'Khu để xe': null
      },
      'Tầng 1': {
        'Sảnh giữa': null,
        'Sảnh trái': null,
        'Sảnh phải': null,
        'WC': null
      },
      'Tầng 2': {
        'Khu vực sảnh': null,
        'WC': null
      },
      'Tầng 3': {
        'Khu vực sảnh': null,
        'WC': null
      },
      'Tầng 4': {
        'Khu vực sảnh': null,
        'WC': null,
        'Phòng Khánh tiết': null,
        'Phòng nghỉ VIP 1': null,
        'Phòng nghỉ VIP 2': null,
        'Phòng làm việc 1': null,
        'Phòng làm việc 2': null,
        'Phòng làm việc 3': null,
        'Pantry': null,
        'Phòng Thủ tục & Chăm sóc khách hàng': null,
        'Phòng họp VIP 1': null,
        'Phòng họp VIP 2': null
      },
      'Tầng 5': {
        'Phòng tiệc': null,
        'Tầng lửng tiệc': null,
        'Khu bếp': null,
        'Kho bếp': null,
        'WC': null
      },
      'Tầng 6': {
        'Khu bếp': null
      },
      'Tầng 7': {
        'Phòng kỹ thuật': null
      }
    },
    'Quảng trường Victoria': null,
    'Phố đi bộ The Rome': null,
    'Sân khấu nhạc nước The Harmony': {
      'Khu kỹ thuật ngầm': null
    },
    'Cầu Lion Bridge': null
  },
  'PHÂN KHU KING ISLAND': {
    'Tiểu khu Đảo Vua (King Island)': null
  },
  'PHÂN KHU PARK ROYAL': {
    'Tiểu khu Park Royal': null,
    'Discovery Land': null,
    'Bể bơi Resort': {
      'Tầng hầm': null,
      'Tầng 1': {
        'Bể bơi': null,
        'WC': null
      },
      'Tầng 2': {
        'Khu ngoài trời': null,
        'WC': null
      }
    },
    'Vườn Tùng Tháp': null,
    'Sân thể thao đa năng': null
  },
  'KHU HỒ MẮT RỒNG': {
    'Công viên Hồ Mắt Rồng': null,
    'Bến du thuyền Monaco': null,
    'Khu vui chơi trẻ em': null,
    'Khu vui chơi ngoài trời': null,
    'Babylon Garden': null,
    'Cầu Melody': null,
    'Chòi nghỉ bên hồ': null,
    'Đường dạo bộ quanh hồ': null
  }
};

const DANKO_RIVERSIDE_LOCATION_TREE: LocationTree = {
  'Ban Quản lý dự án': null,
  'Ban Cây Xanh': null,
  'KHU CỔNG CHÀO': {
    'Cổng chào Golden Gate': null
  },
  'PHÂN KHU MAJESTIC': {
    'Văn phòng bán hàng': {
      'Phòng họp': null,
      'Sảnh khánh tiết': null
    },
    'Quảng trường Danko': null,
    'Tháp biểu tượng The Pride': null,
    'Bể bơi Lavish': null,
    'Vườn Ý - Florence Garden': null,
    'Sân thể thao Athens': null,
    'Vườn Thụy Sĩ - The Vow Garden': null
  },
  'PHÂN KHU THE MUSE': {
    'Vườn Pháp - Versailles Garden': null,
    'Suối Hà Lan': null,
    'Khu nhà ở': null
  },
  'PHÂN KHU THE SUMMIT': {
    'Khu nhà ở': null,
    'Trạm Y tế': null,
    'Công viên cảnh quan': null
  },
  'KHU CHUNG CƯ': {
    'Chung cư The Summit': {
      'Tòa A': null,
      'Tòa B': null
    }
  },
  'KHU GIÁO DỤC': {
    'Trường THPT': null,
    'Trường Liên cấp': null,
    'Trường Mầm non': null
  },
  'KHU THƯƠNG MẠI - DỊCH VỤ': {
    'Đất thương mại dịch vụ': null
  }
};

const DANKO_CENTER_LOCATION_TREE: LocationTree = {
  'Ban Quản lý dự án': null,
  'Ban Cây Xanh': null,
  'KHU CỔNG CHÀO': {
    'Cổng chào Victory': null
  },
  'KHU ĐẠI LỘ': {
    'Đại lộ Galaxy': null
  },
  'PHÂN KHU AURORA': {
    'Shop thương mại': null,
    'Trường Liên cấp Tiểu học - Trung học cơ sở': null,
    "Phố đi bộ Hermes's Blessing": null,
    'Văn phòng bán hàng': {
      'Sảnh khánh tiết': null,
      'Phòng họp': null,
      'Phòng làm việc': null,
      'Phòng tiếp khách': null,
      'Pantry': null,
      'WC': null,
      'Phòng kỹ thuật': null
    },
    'Khu nhà ở Aurora': null
  },
  'PHÂN KHU HELIOS': {
    'Tháp biểu tượng Helios': null,
    'Quảng trường Sun Square': null,
    'Bể bơi Sunset': null,
    'Công viên Moonlight': null,
    'Hồ Moonlight': null,
    'Khu nhà ở Helios': null
  },
  'PHÂN KHU SELENE': {
    'Công viên cảnh quan': null,
    'Trường Mầm non Quốc tế': null,
    'Khu nhà ở Selene': null
  },
  'KHU GIÁO DỤC': {
    'Trường Liên cấp Tiểu học - Trung học cơ sở': null,
    'Trường Mầm non Quốc tế': null
  },
  'KHU THƯƠNG MẠI': {
    'Shop thương mại': null
  },
  'KHU CÔNG VIÊN - CẢNH QUAN': {
    'Công viên Moonlight': null,
    'Hồ Moonlight': null,
    'Công viên cảnh quan': null,
    'Quảng trường Sun Square': null,
    'Bể bơi Sunset': null,
    "Phố đi bộ Hermes's Blessing": null,
    'Tháp biểu tượng Helios': null
  }
};

const PROJECT_LOCATION_TREES: Record<string, LocationTree> = {
  'Thái Nguyên::Danko City': DANKO_CITY_LOCATION_TREE,
  'Bắc Ninh::Danko Riverside': DANKO_RIVERSIDE_LOCATION_TREE,
  'Tuyên Quang::Danko Center': DANKO_CENTER_LOCATION_TREE
};

const getProjectLocationTree = (city: string, project: string) => PROJECT_LOCATION_TREES[`${city}::${project}`] || null;

const getLocationTreeLevels = (tree: LocationTree | null, selectedPath: string[]) => {
  const levels: string[][] = [];
  let node: LocationTree | null = tree;
  let depth = 0;

  while (node) {
    const options = Object.keys(node);
    if (options.length === 0) break;
    levels.push(options);
    const selected = selectedPath[depth];
    if (!selected || selected === 'Khác') break;
    node = node[selected] || null;
    depth += 1;
  }

  return levels;
};

const isLocationPathComplete = (tree: LocationTree | null, selectedPath: string[]) => {
  if (selectedPath.length === 0 || selectedPath[0] === 'Khác') return false;
  let node: LocationTree | null = tree;

  for (const segment of selectedPath) {
    if (!node || !Object.prototype.hasOwnProperty.call(node, segment)) return false;
    node = node[segment];
  }

  return node === null;
};

const findLocationTreePath = (tree: LocationTree, location: string): string[] | null => {
  const normalizePath = (value: string) => value.replace(/\s*[\/-]\s*/g, '-').trim();
  const target = normalizePath(location);
  let match: string[] | null = null;

  const visit = (node: LocationTree, path: string[]) => {
    for (const [name, children] of Object.entries(node)) {
      const nextPath = [...path, name];
      if (normalizePath(nextPath.join('-')) === target) {
        match = nextPath;
        return;
      }
      if (children) visit(children, nextPath);
      if (match) return;
    }
  };

  visit(tree, []);
  return match;
};

interface TransferWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialAssetIds?: number[];
  defaultType?: 'HANDOVER' | 'TRANSFER' | 'RECALL';
  source?: 'ASSET_DETAIL' | 'TRANSFER_LIST';
  editingDocId?: number | null;
}

export const TransferWizard: React.FC<TransferWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialAssetIds = [],
  defaultType,
  source = 'TRANSFER_LIST',
  editingDocId = null
}) => {
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardType, setWizardType] = useState<'HANDOVER' | 'TRANSFER' | 'RECALL'>('HANDOVER');
  const [wizardAssets, setWizardAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [wizardForm, setWizardForm] = useState({
    recipientName: '',
    recipientPosition: '',
    recipientDepartment: '',
    recipientPhone: '',
    receiverId: null as number | null,
    receiverDepartmentId: null as number | null,
    newLocation: '',
    newCity: '',
    targetLocationId: null as number | null,
    senderName: 'Nhân viên QLTS',
    senderDepartment: 'Bộ phận QLTS',
    senderPosition: 'Nhân viên',
    senderId: null as number | null,
    reason: '',
    note: '',
    agreedToCommitment: false
  });

  // Dependent Location states
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationPath, setSelectedLocationPath] = useState<string[]>([]);

  const [customCity, setCustomCity] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  const projectLocationTree = getProjectLocationTree(selectedCity, selectedProject);
  const projectLocationLevels = getLocationTreeLevels(projectLocationTree, selectedLocationPath);

  const handleProjectLocationChange = (depth: number, value: string) => {
    if (value === 'Khác') {
      setSelectedLocationPath(['Khác']);
      setSelectedLocation('Khác');
      setCustomLocation('');
      return;
    }

    const nextPath = [...selectedLocationPath.slice(0, depth), value];
    setSelectedLocationPath(nextPath);
    setSelectedLocation(nextPath.join(' / '));
    setCustomLocation('');
  };

  const getResolvedLocationParts = () => {
    const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
    const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
    const locationVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

    let combinedLocation = '';
    if (cityVal) {
      combinedLocation = cityVal;
      if (projectVal) {
        combinedLocation += '-' + projectVal;
      }
      if (locationVal) {
        combinedLocation += '-' + locationVal;
      }
    } else {
      combinedLocation = locationVal || '';
    }

    return {
      city: cityVal,
      location: combinedLocation || wizardForm.newLocation
    };
  };

  // Metadata Lists
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Search Asset Lookup
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSearchResults, setAssetSearchResults] = useState<any[]>([]);

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptsRes, locsRes] = await Promise.all([
          api.get('/settings/departments'),
          api.get('/settings/locations')
        ]);
        setDepartments(deptsRes.data);
        setLocations(locsRes.data);
      } catch (err) {
        console.error('Error loading wizard metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Update Combined Location whenever dependent fields change
  useEffect(() => {
    const resolved = getResolvedLocationParts();

    setWizardForm(prev => ({
      ...prev,
      newCity: resolved.city,
      newLocation: resolved.location
    }));
  }, [selectedCity, selectedProject, selectedLocation, customCity, customProject, customLocation]);

  const parseLocationToStates = (fullLocation: string) => {
    if (!fullLocation) return;
    const trimmed = fullLocation.trim();

    // Check shorthand matching
    const lower = trimmed.toLowerCase();
    const cleanStr = lower.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    let resolvedCity = '';
    let resolvedProject = '';
    let resolvedLocation = '';
    
    if (cleanStr.includes('mat truoc c6 i') || cleanStr.includes('mat truoc c6 1')) {
      resolvedCity = 'Hà Nội';
      resolvedProject = 'Văn phòng C6';
      resolvedLocation = 'Mặt trước Khối I';
    } else if (cleanStr.includes('mat sau c6 i') || cleanStr.includes('mat sau c6 1') || cleanStr.includes('mat sau c6 ii') || cleanStr.includes('mat sau c6 2')) {
      resolvedCity = 'Hà Nội';
      resolvedProject = 'Văn phòng C6';
      resolvedLocation = 'Mặt sau Khối II';
    } else {
      const parts = trimmed.split(/[-/\\]/).map(p => p.trim());
      if (parts.length >= 3) {
        resolvedCity = parts[0];
        resolvedProject = parts[1];
        resolvedLocation = parts.slice(2).join('-');
      } else if (parts.length === 2) {
        resolvedCity = parts[0];
        resolvedLocation = parts[1];
      } else {
        resolvedLocation = trimmed;
      }
    }

    if (resolvedCity) {
      if (LOCATION_HIERARCHY[resolvedCity]) {
        setSelectedCity(resolvedCity);
        if (resolvedProject) {
          if (LOCATION_HIERARCHY[resolvedCity][resolvedProject]) {
            setSelectedProject(resolvedProject);
            if (resolvedLocation) {
              const resolvedTree = getProjectLocationTree(resolvedCity, resolvedProject);
              if (resolvedTree) {
                const resolvedPath = findLocationTreePath(resolvedTree, resolvedLocation);
                if (resolvedPath) {
                  setSelectedLocationPath(resolvedPath);
                  setSelectedLocation(resolvedPath.join(' / '));
                } else {
                  setSelectedLocationPath(['Khác']);
                  setSelectedLocation('Khác');
                  setCustomLocation(resolvedLocation);
                }
              } else if (LOCATION_HIERARCHY[resolvedCity][resolvedProject].includes(resolvedLocation)) {
                setSelectedLocationPath([]);
                setSelectedLocation(resolvedLocation);
              } else {
                setSelectedLocationPath([]);
                setSelectedLocation('Khác');
                setCustomLocation(resolvedLocation);
              }
            }
          } else {
            setSelectedLocationPath([]);
            setSelectedProject('Khác');
            setCustomProject(resolvedProject);
            setSelectedLocation('Khác');
            setCustomLocation(resolvedLocation);
          }
        }
      } else {
        setSelectedLocationPath([]);
        setSelectedCity('Khác');
        setCustomCity(resolvedCity);
        if (resolvedProject) {
          setSelectedProject('Khác');
          setCustomProject(resolvedProject);
        }
        if (resolvedLocation) {
          setSelectedLocation('Khác');
          setCustomLocation(resolvedLocation);
        }
      }
    } else if (resolvedLocation) {
      setSelectedLocationPath([]);
      setSelectedCity('Khác');
      setSelectedProject('Khác');
      setSelectedLocation('Khác');
      setCustomLocation(resolvedLocation);
    }
  };

  // Handle open state change
  useEffect(() => {
    if (isOpen) {
      if (editingDocId) {
        fetchDraftDetails(editingDocId);
      } else if (initialAssetIds.length > 0) {
        fetchInitialAssets(initialAssetIds);
      } else {
        resetWizardState();
      }
    }
  }, [isOpen, editingDocId, initialAssetIds]);

  // When wizardType changes, update sender/recipient defaults
  useEffect(() => {
    if (editingDocId) return; // Do not overwrite draft details if editing

    if (wizardType === 'HANDOVER') {
      setWizardForm(prev => ({
        ...prev,
        senderName: 'Nhân viên QLTS',
        senderDepartment: 'Bộ phận QLTS',
        recipientName: '',
        recipientPosition: '',
        recipientDepartment: '',
        receiverDepartmentId: null,
        newLocation: '',
        targetLocationId: null,
        senderPosition: 'Nhân viên'
      }));
    } else if (wizardType === 'TRANSFER') {
      const firstAsset = wizardAssets[0];
      setWizardForm(prev => ({
        ...prev,
        senderName: firstAsset?.currentUserName || 'Nhân viên QLTS',
        senderDepartment: firstAsset?.departmentName || 'Bộ phận QLTS',
        recipientName: '',
        recipientPosition: '',
        recipientDepartment: '',
        receiverDepartmentId: null,
        newLocation: '',
        targetLocationId: null,
        senderPosition: firstAsset?.currentPosition || 'Nhân viên'
      }));
    } else if (wizardType === 'RECALL') {
      const firstAsset = wizardAssets[0];
      // Default recall location is "Kho QLTS" or "Kho trung tâm"
      const defaultLoc = locations.find(l => l.name.toLowerCase().includes('kho qlts') || l.name.toLowerCase().includes('kho trung tâm')) || locations[0];
      setWizardForm(prev => ({
        ...prev,
        senderName: firstAsset?.currentUserName || 'Nhân viên QLTS',
        senderDepartment: firstAsset?.departmentName || 'Bộ phận QLTS',
        recipientName: 'Bộ phận QLTS / Kho',
        recipientPosition: 'Cán bộ quản lý tài sản',
        recipientDepartment: 'Bộ phận QLTS',
        receiverDepartmentId: departments.find(d => d.name.toLowerCase().includes('qlts') || d.name.toLowerCase().includes('hành chính'))?.id || null,
        newLocation: defaultLoc?.name || 'Kho QLTS',
        newCity: defaultLoc?.city || 'Hà Nội',
        targetLocationId: defaultLoc?.id || null,
        senderPosition: firstAsset?.currentPosition || 'Nhân viên'
      }));
      if (defaultLoc) {
        parseLocationToStates(defaultLoc.name);
      }
    }
  }, [wizardType, wizardAssets, locations, departments, editingDocId]);

  const resetWizardState = () => {
    setWizardStep(1);
    setWizardType(defaultType || 'HANDOVER');
    setWizardAssets([]);
    setWizardForm({
      recipientName: '',
      recipientPosition: '',
      recipientDepartment: '',
      recipientPhone: '',
      receiverId: null as number | null,
      receiverDepartmentId: null as number | null,
      newLocation: '',
      newCity: '',
      targetLocationId: null as number | null,
      senderName: 'Nhân viên QLTS',
      senderDepartment: 'Bộ phận QLTS',
      senderPosition: 'Nhân viên',
      senderId: null as number | null,
      reason: '',
      note: '',
      agreedToCommitment: false
    });
    setSelectedCity('');
    setSelectedProject('');
    setSelectedLocation('');
    setSelectedLocationPath([]);
    setCustomCity('');
    setCustomProject('');
    setCustomLocation('');
  };

  const fetchInitialAssets = async (ids: number[]) => {
    setLoadingAssets(true);
    try {
      const list = await Promise.all(
        ids.map(async (id) => {
          const res = await api.get(`/assets/${id}`);
          return res.data;
        })
      );
      setWizardAssets(list);

      const firstAsset = list[0];
      const inferredType = firstAsset?.status === 'IN_STOCK' ? 'HANDOVER' : 'TRANSFER';
      setWizardType(defaultType || inferredType);

      // Prefill sender
      setWizardForm(prev => ({
        ...prev,
        senderName: firstAsset?.currentUserName || 'Nhân viên QLTS',
        senderPosition: firstAsset?.currentPosition || 'Nhân viên',
        senderDepartment: firstAsset?.departmentName || 'Bộ phận QLTS',
        newLocation: firstAsset?.locationName || '',
        newCity: firstAsset?.cityName || ''
      }));
      if (firstAsset?.locationName) {
        parseLocationToStates(firstAsset.locationName);
      }

      // Directly jump to Step 2
      setWizardStep(2);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thông tin tài sản khởi tạo.');
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchDraftDetails = async (id: number) => {
    setLoadingAssets(true);
    try {
      const res = await api.get(`/handover/${id}`);
      const detail = res.data;
      setWizardType(detail.type);
      setWizardStep(2);
      setWizardForm({
        recipientName: detail.recipientName || '',
        recipientPosition: detail.recipientPosition || '',
        recipientDepartment: detail.recipientDepartment || '',
        recipientPhone: detail.recipientPhone || '',
        receiverId: detail.receiverId || null,
        receiverDepartmentId: detail.receiverDepartmentId || null,
        newLocation: detail.newLocation || '',
        newCity: detail.newCity || '',
        targetLocationId: detail.targetLocationId || null,
        senderName: detail.senderName || '',
        senderDepartment: detail.senderDepartment || '',
        senderPosition: detail.senderPosition || '',
        senderId: detail.senderId || null,
        reason: detail.reason || '',
        note: detail.note || '',
        agreedToCommitment: false
      });
      if (detail.newLocation) {
        parseLocationToStates(detail.newLocation);
      }

      const assetsObj = await Promise.all(
        detail.items.map(async (item: any) => {
          try {
            const assetRes = await api.get(`/assets/${item.assetId}`);
            return assetRes.data;
          } catch {
            return { id: item.assetId, assetCode: item.assetCode, assetName: item.assetName, status: item.oldStatus };
          }
        })
      );
      setWizardAssets(assetsObj);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thông tin hồ sơ nháp.');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleDepartmentSelect = (deptId: number) => {
    const dept = departments.find(d => d.id === deptId);
    if (dept) {
      setWizardForm(prev => ({
        ...prev,
        receiverDepartmentId: deptId,
        recipientDepartment: dept.name
      }));
    }
  };

  const handleLocationSelect = (locId: number) => {
    const loc = locations.find(l => l.id === locId);
    if (loc) {
      setWizardForm(prev => ({
        ...prev,
        targetLocationId: locId,
        newLocation: loc.name,
        newCity: loc.city
      }));
    }
  };

  const searchWizardAssets = async (val: string) => {
    setAssetSearch(val);
    if (val.trim().length < 2) {
      setAssetSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/assets', { params: { search: val, limit: 10 } });
      const filtered = res.data.assets.filter((a: any) => 
        a.status !== 'LIQUIDATED' && a.status !== 'LOST'
      );
      setAssetSearchResults(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const addWizardAsset = (asset: any) => {
    if (wizardAssets.some(x => x.id === asset.id)) {
      toast.warning('Tài sản này đã được thêm vào danh sách.');
      return;
    }
    setWizardAssets([...wizardAssets, asset]);
    setAssetSearch('');
    setAssetSearchResults([]);
  };

  const removeWizardAsset = (id: number) => {
    if (source === 'ASSET_DETAIL' && wizardAssets.length === 1) {
      toast.error('Hồ sơ tạo từ chi tiết tài sản không được để trống tài sản khởi tạo.');
      return;
    }
    setWizardAssets(wizardAssets.filter(x => x.id !== id));
  };

  // Submission Flow
  const handleSubmit = async (action: 'DRAFT' | 'COMPLETE' | 'PRINT') => {
    if (wizardAssets.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 tài sản.');
      return;
    }
    if ((wizardType === 'HANDOVER' || wizardType === 'TRANSFER') && !wizardForm.recipientName.trim()) {
      toast.error('Vui lòng điền thông tin người nhận.');
      return;
    }
    if (wizardType === 'RECALL' && !wizardForm.newLocation.trim()) {
      toast.error('Vui lòng chọn kho/vị trí nhận.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedDestination = getResolvedLocationParts();
      const payload = {
        type: wizardType,
        recipientName: wizardForm.recipientName,
        recipientPosition: wizardForm.recipientPosition,
        recipientDepartment: wizardForm.recipientDepartment,
        recipientPhone: wizardForm.recipientPhone,
        receiverId: wizardForm.receiverId,
        receiverDepartmentId: wizardForm.receiverDepartmentId,
        newLocation: resolvedDestination.location,
        newCity: resolvedDestination.city || wizardForm.newCity,
        targetLocationId: wizardForm.targetLocationId,
        senderName: wizardForm.senderName,
        senderDepartment: wizardForm.senderDepartment,
        senderPosition: wizardForm.senderPosition,
        senderId: wizardForm.senderId,
        reason: wizardForm.reason,
        note: wizardForm.note,
        assetIds: wizardAssets.map(a => a.id),
      };

      if (action === 'DRAFT') {
        if (editingDocId) {
          await api.patch(`/handover/${editingDocId}`, { ...payload, status: 'DRAFT' });
          toast.success('Đã cập nhật hồ sơ nháp thành công!');
        } else {
          await api.post('/handover', { ...payload, status: 'DRAFT' });
          toast.success('Đã lưu nháp hồ sơ thành công!');
        }
        onComplete();
        onClose();
      } else {
        // Complete or Print flow
        let documentRes;
        if (editingDocId) {
          // If editing a draft, patch and then confirm it
          await api.patch(`/handover/${editingDocId}`, payload);
          documentRes = await api.post(`/handover/${editingDocId}/complete`);
        } else {
          // Atomic create and complete
          const res = await api.post('/handover/complete', payload);
          documentRes = res;
        }

        const docData = documentRes.data;
        toast.success(`Đã hoàn thành hồ sơ ${docData.documentNo || ''} thành công!`);

        if (action === 'PRINT') {
          // Trigger direct print dialog
          const printUrl = `${api.defaults.baseURL}/handover/${docData.id}/pdf?token=${localStorage.getItem('token') || ''}`;
          const printWindow = window.open(printUrl, '_blank');
          if (!printWindow) {
            toast.error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.');
          } else {
            printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
            };
          }
        }

        onComplete();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="wizard" noScroll>
      <div className="w-full h-full bg-white flex flex-col">
        
        {/* Header Section */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              {wizardType === 'HANDOVER' ? 'Lập biên bản bàn giao' : 
               wizardType === 'TRANSFER' ? 'Lập biên bản điều chuyển' : 
               'Lập biên bản thu hồi'}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">
              Hỗ trợ Bàn giao, Điều chuyển & Thu hồi tài sản
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0 overflow-x-auto no-scrollbar">
          {[
            { step: 1, label: 'Loại nghiệp vụ' },
            { step: 2, label: 'Danh sách tài sản' },
            { step: 3, label: 'Thông tin các bên' },
            { step: 4, label: 'Cam kết bàn giao' },
            { step: 5, label: 'Xem trước & Lưu' },
          ].map((item) => (
            <div key={item.step} className="flex items-center space-x-2 shrink-0">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                wizardStep === item.step
                  ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                  : (wizardStep > item.step ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-450')
              }`}>
                {wizardStep > item.step ? <Check className="h-3.5 w-3.5" /> : item.step}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                wizardStep === item.step ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
              {item.step < 5 && <span className="text-slate-200 font-light mx-2">/</span>}
            </div>
          ))}
        </div>

        {/* Form Body View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingAssets ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải thông tin tài sản...</p>
            </div>
          ) : (
            <>
              {/* STEP 1: CHỌN NGHIỆP VỤ */}
              {wizardStep === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center max-w-xl mx-auto space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">BƯỚC 1: CHỌN LOẠI NGHIỆP VỤ LUÂN CHUYỂN</h3>
                    <p className="text-xs text-slate-400 font-medium">Hệ thống hỗ trợ 3 quy trình chính. Trạng thái của tài sản sẽ được cập nhật tự động sau khi hồ sơ được xác nhận.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {/* Bàn giao cấp phát */}
                    <button 
                      onClick={() => { setWizardType('HANDOVER'); setWizardStep(2); }}
                      className={`p-6 border-2 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between h-48 ${
                        wizardType === 'HANDOVER' ? 'border-slate-900 bg-slate-50/50' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">1. Bàn giao cấp phát</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Cấp phát tài sản trong kho cho nhân viên / phòng ban sử dụng mới.</p>
                      </div>
                    </button>

                    {/* Điều chuyển phòng ban */}
                    <button 
                      onClick={() => { setWizardType('TRANSFER'); setWizardStep(2); }}
                      className={`p-6 border-2 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between h-48 ${
                        wizardType === 'TRANSFER' ? 'border-amber-500 bg-amber-50/10' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className="h-10 w-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <ArrowRightLeft className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">2. Điều chuyển phòng ban</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Luân chuyển tài sản giữa các bộ phận, dự án hoặc thay đổi người sở hữu.</p>
                      </div>
                    </button>

                    {/* Thu hồi về kho */}
                    <button 
                      onClick={() => { setWizardType('RECALL'); setWizardStep(2); }}
                      className={`p-6 border-2 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between h-48 ${
                        wizardType === 'RECALL' ? 'border-rose-500 bg-rose-50/10' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className="h-10 w-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <RotateCcw className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-rose-600 uppercase tracking-wider">3. Thu hồi về kho</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Thu hồi thiết bị từ nhân viên thôi việc, hết nhu cầu về kho lưu giữ.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CHỌN TÀI SẢN */}
              {wizardStep === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      BƯỚC 2: TÀI SẢN THAM GIA HỒ SƠ ({wizardAssets.length})
                    </h3>
                    {wizardAssets.length > 1 && source !== 'ASSET_DETAIL' && (
                      <button onClick={() => setWizardAssets([])} className="text-xs font-bold text-rose-500 hover:underline">
                        Xóa tất cả chọn
                      </button>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                      type="text"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:bg-white transition-all text-xs font-bold text-slate-900 placeholder:text-slate-400"
                      placeholder="Tìm theo Mã tài sản, Số Serial hoặc tên thiết bị..."
                      value={assetSearch}
                      onChange={(e) => searchWizardAssets(e.target.value)}
                    />

                    {assetSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                        {assetSearchResults.map(a => (
                          <button
                            key={a.id}
                            onClick={() => addWizardAsset(a)}
                            className="w-full px-5 py-3 hover:bg-slate-50 text-left flex items-center justify-between border-b last:border-0"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">{a.assetName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{a.assetCode} • {a.status} • {a.currentUserName || 'Trong kho'}</p>
                            </div>
                            <Plus className="h-4 w-4 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Assets Table */}
                  <div className="table-container rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Mã tài sản</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Tên tài sản</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Số Serial</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Người dùng cũ</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Vị trí hiện tại</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {wizardAssets.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-900">{a.assetCode}</td>
                            <td className="p-3 font-bold text-slate-700">{a.assetName}</td>
                            <td className="p-3 text-slate-500 font-medium">{a.serialNumber || '---'}</td>
                            <td className="p-3 text-slate-600 font-semibold">{a.currentUserName || 'Trong kho'}</td>
                            <td className="p-3 text-slate-500">{a.locationName || '---'}</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => removeWizardAsset(a.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {wizardAssets.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 italic font-bold">
                              Chưa có thiết bị tài sản nào được chọn. Nhập tìm kiếm ở trên để bắt đầu thêm.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: THÔNG TIN CHI TIẾT SENDER / RECIPIENT */}
              {wizardStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    BƯỚC 3: CUNG CẤP THÔNG TIN CÁC BÊN & ĐỊA ĐIỂM
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* BÊN NHẬN / BÊN THU HỒI */}
                    <div className="space-y-4 p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5 border-b pb-2">
                        <User className="h-4 w-4 text-slate-500" />
                        {wizardType === 'RECALL' ? 'ĐƠN VỊ THU HỒI (BÊN NHẬN)' : 'BÊN NHẬN TÀI SẢN'}
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-500">Họ tên người nhận *</label>
                          <input 
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                            placeholder="Nguyễn Văn A"
                            disabled={wizardType === 'RECALL'}
                            value={wizardForm.recipientName}
                            onChange={(e) => setWizardForm({...wizardForm, recipientName: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Chức vụ</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                              placeholder="Nhân viên"
                              disabled={wizardType === 'RECALL'}
                              value={wizardForm.recipientPosition}
                              onChange={(e) => setWizardForm({...wizardForm, recipientPosition: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Số điện thoại</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                              placeholder="0901234567"
                              disabled={wizardType === 'RECALL'}
                              value={wizardForm.recipientPhone}
                              onChange={(e) => setWizardForm({...wizardForm, recipientPhone: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-500">Phòng ban nhận (Chọn danh mục) *</label>
                          <select
                            disabled={wizardType === 'RECALL'}
                            value={wizardForm.receiverDepartmentId || ''}
                            onChange={(e) => handleDepartmentSelect(Number(e.target.value))}
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                          >
                            <option value="">-- Chọn phòng ban --</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* BÊN GIAO & VỊ TRÍ MỚI */}
                    <div className="space-y-4 p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5 border-b pb-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        BÊN GIAO & VỊ TRÍ BÀN GIAO ĐẾN
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-550">Họ tên người giao (Bên giao)</label>
                          <input 
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                            value={wizardForm.senderName}
                            onChange={(e) => setWizardForm({...wizardForm, senderName: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Chức vụ giao</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                              value={wizardForm.senderPosition}
                              onChange={(e) => setWizardForm({...wizardForm, senderPosition: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Phòng ban giao</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                              value={wizardForm.senderDepartment}
                              onChange={(e) => setWizardForm({...wizardForm, senderDepartment: e.target.value})}
                            />
                          </div>
                        </div>

                        {/* DEPENDENT DROPDOWN SYSTEM */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Thành phố bàn giao đến *</label>
                            <select
                              value={selectedCity}
                              onChange={(e) => {
                                setSelectedCity(e.target.value);
                                setSelectedProject('');
                                setSelectedLocation('');
                                setSelectedLocationPath([]);
                                setCustomCity('');
                                setCustomProject('');
                                setCustomLocation('');
                              }}
                              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                            >
                              <option value="">-- Chọn thành phố --</option>
                              {Object.keys(LOCATION_HIERARCHY).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                              <option value="Khác">Khác</option>
                            </select>
                          </div>

                          {selectedCity === 'Khác' && (
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Ghi rõ thành phố khác *</label>
                              <input
                                type="text"
                                value={customCity}
                                onChange={(e) => setCustomCity(e.target.value)}
                                placeholder="Nhập tên thành phố..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-202 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                              />
                            </div>
                          )}

                          {selectedCity && (
                            <>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Dự án bàn giao đến *</label>
                                <select
                                  value={selectedProject}
                                  onChange={(e) => {
                                    setSelectedProject(e.target.value);
                                    setSelectedLocation('');
                                    setSelectedLocationPath([]);
                                    setCustomProject('');
                                    setCustomLocation('');
                                  }}
                                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                                >
                                  <option value="">-- Chọn dự án --</option>
                                  {selectedCity !== 'Khác' && Object.keys(LOCATION_HIERARCHY[selectedCity] || {}).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                  <option value="Khác">Khác</option>
                                </select>
                              </div>

                              {selectedProject === 'Khác' && (
                                <div className="space-y-1">
                                  <label className="font-bold text-slate-500">Ghi rõ dự án khác *</label>
                                  <input
                                    type="text"
                                    value={customProject}
                                    onChange={(e) => setCustomProject(e.target.value)}
                                    placeholder="Nhập tên dự án..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-202 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {selectedProject && (
                            <>
                              {projectLocationTree ? (
                                <div className="space-y-3">
                                  {projectLocationLevels.map((options, depth) => {
                                    const labels = ['Khu vực', 'Địa điểm / công trình', 'Tầng / khu chức năng', 'Vị trí chi tiết'];
                                    return (
                                      <div key={depth} className="space-y-1">
                                        <label className="font-bold text-slate-500">{labels[depth] || `Phân cấp ${depth + 1}`} *</label>
                                        <select
                                          value={selectedLocationPath[depth] || ''}
                                          onChange={(e) => handleProjectLocationChange(depth, e.target.value)}
                                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                                        >
                                          <option value="">-- Chọn {labels[depth]?.toLowerCase() || 'vị trí'} --</option>
                                          {options.map((location) => (
                                            <option key={location} value={location}>{location}</option>
                                          ))}
                                          {depth === 0 && <option value="Khác">Khác</option>}
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="font-bold text-slate-500">Vị trí bàn giao đến *</label>
                                  <select
                                    value={selectedLocation}
                                    onChange={(e) => {
                                      setSelectedLocation(e.target.value);
                                      setSelectedLocationPath([]);
                                      setCustomLocation('');
                                    }}
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                                  >
                                    <option value="">-- Chọn vị trí --</option>
                                    {selectedCity !== 'Khác' && selectedProject !== 'Khác' && (LOCATION_HIERARCHY[selectedCity]?.[selectedProject] || []).map(l => (
                                      <option key={l} value={l}>{l}</option>
                                    ))}
                                    <option value="Khác">Khác</option>
                                  </select>
                                </div>
                              )}

                              {selectedLocation === 'Khác' && (
                                <div className="space-y-1">
                                  <label className="font-bold text-slate-500">Ghi rõ vị trí khác *</label>
                                  <input
                                    type="text"
                                    value={customLocation}
                                    onChange={(e) => setCustomLocation(e.target.value)}
                                    placeholder="Nhập vị trí chi tiết..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-202 rounded-xl text-xs font-bold text-slate-800 focus:bg-white transition-all"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Lý do bàn giao / luân chuyển</label>
                      <textarea
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 h-20 resize-none focus:bg-white transition-all"
                        placeholder="Ví dụ: Cấp phát làm việc cho nhân viên mới, điều động công việc..."
                        value={wizardForm.reason}
                        onChange={(e) => setWizardForm({...wizardForm, reason: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Ghi chú thêm</label>
                      <textarea
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 h-20 resize-none focus:bg-white transition-all"
                        placeholder="Thêm thông tin mô tả chi tiết, tình trạng..."
                        value={wizardForm.note}
                        onChange={(e) => setWizardForm({...wizardForm, note: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: XÁC NHẬN CAM KẾT */}
              {wizardStep === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    BƯỚC 4: XÁC NHẬN CAM KẾT BIÊN BẢN
                  </h3>

                  <div className="p-5 border border-amber-200 rounded-2xl bg-amber-50/20 text-slate-700 text-xs leading-relaxed space-y-4">
                    <div className="flex items-center gap-2 text-amber-600 font-black">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      CAM KẾT QUẢN LÝ & SỬ DỤNG TÀI SẢN DOANH NGHIỆP
                    </div>
                    
                    <ul className="list-disc pl-5 space-y-2 font-medium">
                      <li>Bên nhận đã thực hiện kiểm tra đầy đủ chủng loại, số lượng, quy cách và tình trạng thực tế của thiết bị.</li>
                      <li>Bên nhận chịu hoàn toàn trách nhiệm bảo quản, giữ gìn tài sản đúng mục đích công việc, không làm hư hại hoặc mất mát do cẩu thả.</li>
                      <li>Hệ thống sẽ cập nhật trạng thái sở hữu tài sản sang cho người nhận ngay sau khi hoàn thành biên bản này.</li>
                      <li>Bộ phận QLTS/HCNS có quyền kiểm kê định kỳ hoặc đột xuất tài sản được giao.</li>
                    </ul>

                    <div className="flex items-center space-x-3 pt-3 border-t border-amber-100">
                      <input 
                        type="checkbox"
                        id="wizardAgreed"
                        className="h-5 w-5 rounded-lg border-slate-350 text-slate-900 focus:ring-slate-100 cursor-pointer"
                        checked={wizardForm.agreedToCommitment}
                        onChange={(e) => setWizardForm({...wizardForm, agreedToCommitment: e.target.checked})}
                      />
                      <label htmlFor="wizardAgreed" className="text-xs font-black text-slate-900 cursor-pointer select-none">
                        Tôi xác nhận đã đọc, hiểu rõ và đồng ý với các điều khoản cam kết trên *
                      </label>
                    </div>
                  </div>

                  {/* Interactive signatures preview block */}
                  <div className="grid grid-cols-3 gap-4 pt-6">
                    <div className="border border-slate-200 border-dashed rounded-2xl p-5 text-center bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ĐẠI DIỆN BÊN GIAO</p>
                      <div className="h-16 flex items-center justify-center italic text-slate-300 text-xs font-bold mt-2">Ký điện tử hoặc In ký tay</div>
                      <p className="text-xs font-black text-slate-800 border-t pt-2">{wizardForm.senderName || '---'}</p>
                    </div>
                    <div className="border border-slate-200 border-dashed rounded-2xl p-5 text-center bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ĐẠI DIỆN BÊN NHẬN</p>
                      <div className="h-16 flex items-center justify-center italic text-slate-300 text-xs font-bold mt-2">Ký điện tử hoặc In ký tay</div>
                      <p className="text-xs font-black text-slate-800 border-t pt-2">{wizardForm.recipientName || '---'}</p>
                    </div>
                    <div className="border border-slate-200 border-dashed rounded-2xl p-5 text-center bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">BỘ PHẬN QLTS / HCNS</p>
                      <div className="h-16 flex items-center justify-center italic text-slate-300 text-xs font-bold mt-2">Đại diện Công ty</div>
                      <p className="text-xs font-black text-slate-850 border-t pt-2">Lê Khánh Hùng</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: PREVIEW & FINALIZE */}
              {wizardStep === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    BƯỚC 5: XEM TRƯỚC HỒ SƠ BIÊN BẢN DỰ KIẾN
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* General Metadata Box */}
                    <div className="md:col-span-1 space-y-4 p-5 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col justify-between">
                      <div className="space-y-4 text-xs">
                        <div className="border-b border-slate-800 pb-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loại nghiệp vụ</p>
                          <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mt-1">
                            {wizardType === 'HANDOVER' ? 'Bàn giao' : (wizardType === 'TRANSFER' ? 'Điều chuyển' : 'Thu hồi')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bên giao</p>
                          <p className="font-bold text-slate-200 mt-1">{wizardForm.senderName} - {wizardForm.senderPosition} ({wizardForm.senderDepartment})</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bên nhận</p>
                          <p className="font-bold text-slate-200 mt-1">{wizardForm.recipientName} ({wizardForm.recipientDepartment})</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vị trí giao đến</p>
                          <p className="font-bold text-slate-200 mt-1">{getResolvedLocationParts().location || '---'}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-4 mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        Hệ thống sẽ lưu hồ sơ với mã định danh duy nhất và cập nhật sổ tài sản.
                      </div>
                    </div>

                    {/* Assets list Box */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">
                        DANH SÁCH THIẾT BỊ BÀN GIAO ({wizardAssets.length})
                      </h4>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {wizardAssets.map(a => (
                          <div key={a.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-slate-50 transition-all bg-white">
                            <div className="flex items-center space-x-3">
                              <Package className="h-5 w-5 text-slate-400 shrink-0" />
                              <div>
                                <p className="text-xs font-black text-slate-900">{a.assetName}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{a.assetCode} • Serial: {a.serialNumber || '---'}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-tight text-slate-500">
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions Section */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <button
              type="button"
              disabled={wizardStep === 1 || isSubmitting}
              onClick={() => setWizardStep(prev => prev - 1)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:border-slate-350 disabled:opacity-40 transition-all text-slate-700 flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white text-slate-600 disabled:opacity-40 transition-all"
            >
              Hủy
            </button>

            {/* In-progress buttons based on steps */}
            {wizardStep < 5 ? (
              <button
                type="button"
                disabled={
                  (wizardStep === 2 && wizardAssets.length === 0) ||
                  (wizardStep === 3 && (wizardType === 'HANDOVER' || wizardType === 'TRANSFER') && !wizardForm.recipientName.trim()) ||
                  (wizardStep === 3 && (
                    !selectedCity || 
                    !selectedProject || 
                    !selectedLocation || 
                    (selectedCity === 'Khác' && !customCity.trim()) || 
                    (selectedProject === 'Khác' && !customProject.trim()) || 
                    (projectLocationTree && selectedLocation !== 'Khác' && !isLocationPathComplete(projectLocationTree, selectedLocationPath)) ||
                    (selectedLocation === 'Khác' && !customLocation.trim())
                  )) ||
                  (wizardStep === 4 && !wizardForm.agreedToCommitment) ||
                  isSubmitting
                }
                onClick={() => setWizardStep(prev => prev + 1)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                Tiếp tục <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                {/* Save Draft */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('DRAFT')}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4 text-slate-400" /> Lưu nháp
                </button>

                {/* Save & Complete */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('COMPLETE')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Lưu & Hoàn thành'}
                </button>

                {/* Print Direct */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('PRINT')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" /> In biên bản
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
