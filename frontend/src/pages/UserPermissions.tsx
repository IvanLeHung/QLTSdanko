import { useState, useEffect } from 'react';
import { 
  Shield, Search, UserCheck, Edit, Save, X, 
  Eye, Settings, Key, Users, 
  Layers, Activity, Building2, Briefcase, MapPin, ClipboardList,
  CheckCircle2, XCircle, Plus, Trash2, Calendar, ArrowRight,
  Download, Sparkles, RotateCcw, EyeOff
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';


interface User {
  id: number;
  username: string;
  fullName: string;
  isActive: boolean;
  role: string;
  roles: { 
    role: { id: number; name: string; description: string };
    validFrom?: string | null;
    validTo?: string | null;
  }[];
  dataScope: {
    id: number;
    scopeType: string;
    companyIdsJson?: string | null;
    departmentIdsJson?: string | null;
    warehouseIdsJson?: string | null;
    projectIdsJson?: string | null;
    categoryIdsJson?: string | null;
  } | null;
  department?: { id: number; name: string; code: string } | null;
  extraPermissionsJson?: string | null;
  deniedPermissionsJson?: string | null;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: { permission: { id: number; name: string; action: string } }[];
}

interface ScopeItem {
  code: string;
  name: string;
}

interface CategoryItem {
  id: number;
  code: string;
  name: string;
}

interface RoleAssignment {
  roleId: number;
  validFrom: string;
  validTo: string;
}

export function UserPermissions() {
  const { refetchUser, hasPermission } = useAuth();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'users' | 'matrix' | 'roles' | 'departments'>('users');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<ScopeItem[]>([]);
  const [departments, setDepartments] = useState<ScopeItem[]>([]);
  const [locations, setLocations] = useState<ScopeItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit User Permissions Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'role' | 'scope' | 'func' | 'sensitive' | 'history'>('role');
  
  const [editIsActive, setEditIsActive] = useState(true);
  const [editRoles, setEditRoles] = useState<RoleAssignment[]>([]);
  const [editScopeType, setEditScopeType] = useState('SELF');
  const [changeReason, setChangeReason] = useState('');
  
  // Custom scope selection lists
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectInput, setProjectInput] = useState('');

  // Reset Password Modal State
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [resetPwdNewPassword, setResetPwdNewPassword] = useState('');
  const [resetPwdConfirmPassword, setResetPwdConfirmPassword] = useState('');
  const [resetPwdMustChange, setResetPwdMustChange] = useState(true);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showResetConfirmPwd, setShowResetConfirmPwd] = useState(false);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);

  const handleResetPasswordOpen = (user: User) => {
    setResetPwdUser(user);
    setResetPwdNewPassword('');
    setResetPwdConfirmPassword('');
    setResetPwdMustChange(true);
    setShowResetPwd(false);
    setShowResetConfirmPwd(false);
    setIsResetPwdModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const length = 12;
    let pwd = '';
    
    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowers = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const specials = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    pwd += uppers.charAt(Math.floor(Math.random() * uppers.length));
    pwd += lowers.charAt(Math.floor(Math.random() * lowers.length));
    pwd += digits.charAt(Math.floor(Math.random() * digits.length));
    pwd += specials.charAt(Math.floor(Math.random() * specials.length));
    
    for (let i = 4; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    
    setResetPwdNewPassword(pwd);
    setResetPwdConfirmPassword(pwd);
    toast.info("Đã tự động tạo mật khẩu ngẫu nhiên độ bảo mật cao!");
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    
    if (resetPwdNewPassword !== resetPwdConfirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    
    setResetPwdLoading(true);
    try {
      await api.post(`/admin/users/${resetPwdUser.id}/reset-password`, {
        password: resetPwdNewPassword,
        mustChangePassword: resetPwdMustChange
      });
      toast.success(`Đã đặt lại mật khẩu cho tài khoản ${resetPwdUser.username} thành công!`);
      setIsResetPwdModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi reset mật khẩu");
    } finally {
      setResetPwdLoading(false);
    }
  };

  // Overrides list
  const [extraPerms, setExtraPerms] = useState<string[]>([]);
  const [deniedPerms, setDeniedPerms] = useState<string[]>([]);

  // Audit Logs for specific user
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Preview State
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Role Management State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '' });

  // Delegation State
  const [delegations, setDelegations] = useState<any[]>([]);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delegationFormData, setDelegationFormData] = useState({
    fromUserId: '',
    toUserId: '',
    roleId: '',
    validFrom: '',
    validTo: '',
    reason: ''
  });

  // Workflow Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    requestedRoleId: '',
    requestedPermission: [] as string[],
    reason: '',
    durationDays: '30'
  });

  // User CRUD Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    fullName: '',
    departmentId: '',
    password: '',
    confirmPassword: '',
    mustChangePassword: false,
    status: 'ACTIVE'
  });

  // Department Tab State
  const [deptTree, setDeptTree] = useState<any[]>([]);
  const [deptList, setDeptList] = useState<any[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'create' | 'edit'>('create');
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    code: '',
    name: '',
    description: '',
    parentDeptId: '',
    managerId: '',
    companyId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchDepartmentsData = async () => {
    try {
      const [listRes, treeRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/departments/tree')
      ]);
      setDeptList(listRes.data);
      setDeptTree(treeRes.data);
    } catch (e) {
      console.error('Error fetching departments data', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, companiesRes, deptsRes, locsRes, catsRes, delegationsRes, requestsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/roles'),
        api.get('/settings/companies').catch(() => ({ data: [] })),
        api.get('/settings/departments').catch(() => ({ data: [] })),
        api.get('/settings/locations').catch(() => ({ data: [] })),
        api.get('/settings/categories?level=1').catch(() => ({ data: [] })),
        api.get('/admin/delegations').catch(() => ({ data: [] })),
        api.get('/admin/requests').catch(() => ({ data: [] }))
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setCompanies(companiesRes.data);
      setDepartments(deptsRes.data);
      setLocations(locsRes.data);
      setCategories(catsRes.data);
      setDelegations(delegationsRes.data);
      setRequests(requestsRes.data);
      await fetchDepartmentsData();
    } catch (error) {
      console.error('Error fetching admin data', error);
      toast.error('Không thể tải dữ liệu cấu hình. Kiểm tra lại quyền của bạn.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserHistory = async (userId: number) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/audit?entityType=USER&limit=25`);
      const userLogs = res.data.logs.filter((log: any) => log.entityId === userId);
      setUserHistory(userLogs);
    } catch (e) {
      console.error(e);
      setUserHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setActiveTab('role');
    setEditIsActive(user.isActive);
    setChangeReason('');
    
    // Parse roles with time ranges
    const roleAssigns = user.roles.map((r: any) => ({
      roleId: r.role.id,
      validFrom: r.validFrom ? r.validFrom.split('T')[0] : '',
      validTo: r.validTo ? r.validTo.split('T')[0] : ''
    }));
    setEditRoles(roleAssigns);
    
    if (user.dataScope) {
      setEditScopeType(user.dataScope.scopeType || 'SELF');
      setSelectedCompanies(user.dataScope.companyIdsJson ? JSON.parse(user.dataScope.companyIdsJson) : []);
      setSelectedDepartments(user.dataScope.departmentIdsJson ? JSON.parse(user.dataScope.departmentIdsJson) : []);
      setSelectedLocations(user.dataScope.warehouseIdsJson ? JSON.parse(user.dataScope.warehouseIdsJson) : []);
      setSelectedCategories(user.dataScope.categoryIdsJson ? JSON.parse(user.dataScope.categoryIdsJson) : []);
      setSelectedProjects(user.dataScope.projectIdsJson ? JSON.parse(user.dataScope.projectIdsJson) : []);
    } else {
      setEditScopeType('SELF');
      setSelectedCompanies([]);
      setSelectedDepartments([]);
      setSelectedLocations([]);
      setSelectedCategories([]);
      setSelectedProjects([]);
    }

    setExtraPerms(user.extraPermissionsJson ? JSON.parse(user.extraPermissionsJson) : []);
    setDeniedPerms(user.deniedPermissionsJson ? JSON.parse(user.deniedPermissionsJson) : []);
    loadUserHistory(user.id);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      // Map roles body structure to support ranges
      const payloadRoles = editRoles.map(r => ({
        roleId: r.roleId,
        validFrom: r.validFrom ? new Date(r.validFrom).toISOString() : null,
        validTo: r.validTo ? new Date(r.validTo).toISOString() : null
      }));

      await api.patch(`/admin/users/${selectedUser.id}/permissions`, {
        isActive: editIsActive,
        roleIds: payloadRoles,
        extraPermissions: extraPerms,
        deniedPermissions: deniedPerms,
        changeReason: changeReason.trim() !== '' ? changeReason : undefined,
        dataScope: {
          scopeType: editScopeType,
          companyIds: ['COMPANY', 'CUSTOM'].includes(editScopeType) ? selectedCompanies : null,
          departmentIds: ['DEPARTMENT', 'CUSTOM'].includes(editScopeType) ? selectedDepartments : null,
          warehouseIds: ['WAREHOUSE', 'CUSTOM'].includes(editScopeType) ? selectedLocations : null,
          categoryIds: ['CUSTOM'].includes(editScopeType) ? selectedCategories : null,
          projectIds: ['PROJECT', 'CUSTOM'].includes(editScopeType) ? selectedProjects : null
        }
      });
      toast.success('Cập nhật cấu hình phân quyền thành công!');
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePreview = async (user: User) => {
    try {
      setPreviewUser(user);
      setPreviewLoading(true);
      const res = await api.get(`/admin/users/${user.id}/preview-access`);
      setPreviewData(res.data);
    } catch (e: any) {
      toast.error('Không thể tải thông tin xem thử: ' + (e.response?.data?.message || e.message));
      setPreviewUser(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const addProject = () => {
    if (projectInput.trim() && !selectedProjects.includes(projectInput.trim())) {
      setSelectedProjects([...selectedProjects, projectInput.trim()]);
      setProjectInput('');
    }
  };

  const getInheritedPermissions = () => {
    const inherited = new Set<string>();
    editRoles.forEach(assign => {
      const role = roles.find(r => r.id === assign.roleId);
      if (role) {
        role.permissions.forEach(rp => {
          inherited.add(rp.permission.action);
        });
      }
    });
    return inherited;
  };

  const inheritedPermissions = getInheritedPermissions();

  const handlePermissionToggle = (action: string) => {
    const isInherited = inheritedPermissions.has(action);
    if (isInherited) {
      if (deniedPerms.includes(action)) {
        setDeniedPerms(deniedPerms.filter(p => p !== action));
      } else {
        setDeniedPerms([...deniedPerms, action]);
      }
    } else {
      if (extraPerms.includes(action)) {
        setExtraPerms(extraPerms.filter(p => p !== action));
      } else {
        setExtraPerms([...extraPerms, action]);
      }
    }
  };

  const isPermissionEnabled = (action: string) => {
    const isInherited = inheritedPermissions.has(action);
    if (isInherited) {
      return !deniedPerms.includes(action);
    }
    return extraPerms.includes(action);
  };

  // Matrix Cell Toggling (Module x Permission x Role)
  const handleMatrixCellToggle = async (roleCode: string, permissionCode: string, currentEnabled: boolean) => {
    const key = `${roleCode}:${permissionCode}`;
    try {
      setSavingKey(key);

      const targetEnabled = !currentEnabled;

      const res = await api.patch('/admin/roles/permissions', {
        roleCode,
        permissionCode,
        enabled: targetEnabled
      });

      const data = res.data;

      if (!data || data.success === false) {
        throw new Error(data?.message || 'Không thể cập nhật quyền.');
      }

      if (data.enabled !== targetEnabled) {
        throw new Error('Quyền chưa được cập nhật đúng trên hệ thống.');
      }

      // Reload matrix from server (by fetching updated roles)
      const rolesRes = await api.get('/admin/roles');
      setRoles(rolesRes.data);

      // Invalidate current user permissions so frontend is updated live
      await refetchUser();

      toast.success(`Đã cập nhật quyền ${permissionCode} cho vai trò ${roleCode}.`);
    } catch (e: any) {
      toast.error('Lỗi cập nhật ma trận: ' + (e.response?.data?.message || e.message));
      // Reload on error to rollback checkbox to actual state
      try {
        const rolesRes = await api.get('/admin/roles');
        setRoles(rolesRes.data);
      } catch (err) {
        console.error('Lỗi khi reload ma trận:', err);
      }
    } finally {
      setSavingKey(null);
    }
  };

  // User CRUD Actions
  const handleUserModalOpen = (mode: 'create' | 'edit', u?: User) => {
    setUserModalMode(mode);
    if (mode === 'edit' && u) {
      setEditingUserId(u.id);
      setUserFormData({
        username: u.username,
        fullName: u.fullName,
        departmentId: u.department?.id ? String(u.department.id) : '',
        password: '',
        confirmPassword: '',
        mustChangePassword: false, // reset
        status: u.isActive ? 'ACTIVE' : 'LOCKED'
      });
    } else {
      setEditingUserId(null);
      setUserFormData({
        username: '',
        fullName: '',
        departmentId: '',
        password: '',
        confirmPassword: '',
        mustChangePassword: true, // default to true for new user
        status: 'ACTIVE'
      });
    }
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userModalMode === 'create') {
        if (!userFormData.password) {
          toast.error('Vui lòng nhập mật khẩu.');
          return;
        }
        if (userFormData.password !== userFormData.confirmPassword) {
          toast.error('Xác nhận mật khẩu không khớp.');
          return;
        }
        await api.post('/admin/users', {
          username: userFormData.username,
          fullName: userFormData.fullName,
          departmentId: userFormData.departmentId ? parseInt(userFormData.departmentId) : null,
          password: userFormData.password,
          mustChangePassword: userFormData.mustChangePassword
        });
        toast.success(`Tạo người dùng ${userFormData.username} thành công!`);
      } else {
        const payload: any = {
          fullName: userFormData.fullName,
          departmentId: userFormData.departmentId ? parseInt(userFormData.departmentId) : null,
          status: userFormData.status,
          mustChangePassword: userFormData.mustChangePassword
        };
        if (userFormData.password) {
          if (userFormData.password !== userFormData.confirmPassword) {
            toast.error('Xác nhận mật khẩu không khớp.');
            return;
          }
          payload.password = userFormData.password;
        }
        await api.patch(`/admin/users/${editingUserId}`, payload);
        toast.success(`Cập nhật thông tin người dùng thành công!`);
      }
      setIsUserModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Lỗi lưu người dùng: ' + (err.response?.data?.message || err.message));
    }
  };

  // Department CRUD Actions
  const handleDeptModalOpen = (mode: 'create' | 'edit', d?: any) => {
    setDeptModalMode(mode);
    if (mode === 'edit' && d) {
      setEditingDeptId(d.id);
      setDeptFormData({
        code: d.code,
        name: d.name,
        description: d.description || '',
        parentDeptId: d.parentDeptId ? String(d.parentDeptId) : '',
        managerId: d.managerId ? String(d.managerId) : '',
        companyId: d.companyId ? String(d.companyId) : ''
      });
    } else {
      setEditingDeptId(null);
      setDeptFormData({
        code: '',
        name: '',
        description: '',
        parentDeptId: '',
        managerId: '',
        companyId: ''
      });
    }
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: deptFormData.code,
        name: deptFormData.name,
        description: deptFormData.description || null,
        parentDeptId: deptFormData.parentDeptId ? parseInt(deptFormData.parentDeptId) : null,
        managerId: deptFormData.managerId ? parseInt(deptFormData.managerId) : null,
        companyId: deptFormData.companyId ? parseInt(deptFormData.companyId) : null
      };

      if (deptModalMode === 'create') {
        await api.post('/admin/departments', payload);
        toast.success(`Tạo phòng ban ${deptFormData.name} thành công!`);
      } else {
        await api.patch(`/admin/departments/${editingDeptId}`, payload);
        toast.success(`Cập nhật phòng ban ${deptFormData.name} thành công!`);
      }
      setIsDeptModalOpen(false);
      fetchDepartmentsData();
    } catch (err: any) {
      toast.error('Lỗi lưu phòng ban: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeptDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}" không? Thao tác này sẽ cập nhật các user và asset liên quan!`)) return;
    try {
      await api.delete(`/admin/departments/${id}`);
      toast.success(`Xóa phòng ban thành công!`);
      fetchDepartmentsData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa: ' + (err.response?.data?.message || err.message));
    }
  };

  // Recursive Dept tree rendering
  const renderDeptNode = (node: any, depth = 0) => {
    return (
      <div key={node.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{node.name}</span>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border">
                  {node.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {node.description || 'Không có mô tả'} • Quản lý: {node.manager?.fullName || 'Chưa gán'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                {node._count?.users || 0} Nhân viên
              </span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
                {node._count?.assets || 0} Tài sản
              </span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => handleDeptModalOpen('edit', node)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                title="Sửa phòng ban"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeptDelete(node.id, node.name)}
                className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all"
                title="Xóa phòng ban"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-2 border-l border-slate-200 ml-[11px] pl-[11px]">
            {node.children.map((child: any) => renderDeptNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Role CRUD Actions
  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRole) {
        // Edit Custom Role
        await api.patch(`/admin/roles/${selectedRole.id}`, roleFormData);
        toast.success('Cập nhật vai trò tùy chỉnh thành công!');
      } else {
        // Create Custom Role
        await api.post('/admin/roles', roleFormData);
        toast.success('Tạo vai trò tùy chỉnh thành công!');
      }
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      setRoleFormData({ name: '', description: '' });
      fetchData();
    } catch (e: any) {
      toast.error('Lỗi khi lưu vai trò: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRoleDelete = async (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}" không? Thao tác này sẽ xóa mọi liên kết phân quyền!`)) return;

    try {
      await api.delete(`/admin/roles/${roleId}`);
      toast.success('Xóa vai trò tùy chỉnh thành công!');
      fetchData();
    } catch (e: any) {
      toast.error('Không thể xóa vai trò: ' + (e.response?.data?.message || e.message));
    }
  };

  // Delegation Actions
  const handleDelegationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/delegations', delegationFormData);
      toast.success('Thiết lập ủy quyền thành công!');
      setIsDelegationModalOpen(false);
      setDelegationFormData({ fromUserId: '', toUserId: '', roleId: '', validFrom: '', validTo: '', reason: '' });
      fetchData();
    } catch (e: any) {
      toast.error('Lỗi ủy quyền: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDelegationRevoke = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi ủy quyền này ngay lập tức không?')) return;
    try {
      await api.delete(`/admin/delegations/${id}`);
      toast.success('Thu hồi ủy quyền thành công!');
      fetchData();
    } catch (e: any) {
      toast.error('Lỗi khi thu hồi: ' + (e.response?.data?.message || e.message));
    }
  };

  // Workflow Request Actions
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/requests', {
        requestedRoleId: requestFormData.requestedRoleId ? parseInt(requestFormData.requestedRoleId) : null,
        requestedPermission: requestFormData.requestedPermission.length > 0 ? requestFormData.requestedPermission : null,
        reason: requestFormData.reason,
        durationDays: parseInt(requestFormData.durationDays)
      });
      toast.success('Gửi yêu cầu cấp quyền thành công! Đang chờ Admin phê duyệt.');
      setIsRequestModalOpen(false);
      setRequestFormData({ requestedRoleId: '', requestedPermission: [], reason: '', durationDays: '30' });
      fetchData();
    } catch (e: any) {
      toast.error('Lỗi gửi yêu cầu: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRequestApprove = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/admin/requests/${id}/approve`, { status });
      toast.success(status === 'APPROVED' ? 'Phê duyệt yêu cầu cấp quyền thành công!' : 'Đã bác bỏ yêu cầu.');
      fetchData();
    } catch (e: any) {
      toast.error('Lỗi xử lý yêu cầu: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleExportPermissions = () => {
    window.open(`${api.defaults.baseURL}/admin/permissions/export?token=${localStorage.getItem('token')}`, '_blank');
  };

  const applyTemplate = (templateName: 'STAFF' | 'MANAGER' | 'AUDITOR') => {
    if (templateName === 'STAFF') {
      setEditScopeType('SELF');
      setExtraPerms(['ASSET_VIEW']);
      setDeniedPerms([]);
    } else if (templateName === 'MANAGER') {
      setEditScopeType('DEPARTMENT');
      setExtraPerms(['ASSET_VIEW', 'ASSET_CREATE', 'ASSET_UPDATE', 'TRANSFER_VIEW', 'TRANSFER_CREATE']);
      setDeniedPerms([]);
    } else if (templateName === 'AUDITOR') {
      setEditScopeType('ALL');
      setExtraPerms(['ASSET_VIEW', 'AUDIT_LOG_VIEW', 'ASSET_EXPORT']);
      setDeniedPerms([]);
    }
    toast.info(`Đã áp dụng mẫu phân quyền cho ${templateName}!`);
  };

  // Modules List definition
  const modules = [
    {
      name: 'Tài sản',
      perms: [
        { id: 1, name: 'Xem danh sách tài sản', action: 'ASSET_VIEW' },
        { id: 2, name: 'Thêm mới tài sản', action: 'ASSET_CREATE' },
        { id: 3, name: 'Cập nhật tài sản', action: 'ASSET_UPDATE' },
        { id: 4, name: 'Xóa tài sản', action: 'ASSET_DELETE' },
        { id: 5, name: 'In tem nhãn QR/Barcode', action: 'ASSET_PRINT_LABEL' },
        { id: 6, name: 'Xuất dữ liệu Excel tài sản', action: 'ASSET_EXPORT' },
        { id: 7, name: 'Xem giá mua & Giá trị tài sản', action: 'ASSET_VIEW_PRICE' }
      ]
    },
    {
      name: 'Bàn giao / Điều chuyển / Thu hồi',
      perms: [
        { id: 8, name: 'Xem bàn giao điều chuyển', action: 'TRANSFER_VIEW' },
        { id: 9, name: 'Lập phiếu bàn giao (DRAFT)', action: 'TRANSFER_CREATE' },
        { id: 10, name: 'Duyệt/Hoàn thành bàn giao', action: 'TRANSFER_COMPLETE' },
        { id: 11, name: 'Hủy phiếu bàn giao', action: 'TRANSFER_CANCEL' },
        { id: 12, name: 'In PDF Biên bản bàn giao', action: 'TRANSFER_PRINT_PDF' },
        { id: 13, name: 'Xuất Excel bàn giao', action: 'TRANSFER_EXPORT' }
      ]
    },
    {
      name: 'Kiểm kê tài sản',
      perms: [
        { id: 14, name: 'Xem đợt kiểm kê', action: 'INVENTORY_VIEW' },
        { id: 15, name: 'Khởi tạo đợt kiểm kê (DRAFT)', action: 'INVENTORY_CREATE' },
        { id: 16, name: 'Hoàn thành / Chốt kiểm kê', action: 'INVENTORY_COMPLETE' },
        { id: 17, name: 'Xuất Excel kiểm kê', action: 'INVENTORY_EXPORT' }
      ]
    },
    {
      name: 'Nhật ký hệ thống',
      perms: [
        { id: 18, name: 'Xem Audit Logs', action: 'AUDIT_LOG_VIEW' },
        { id: 19, name: 'Xuất Excel Audit Logs', action: 'AUDIT_LOG_EXPORT' }
      ]
    },
    {
      name: 'Quản trị hệ thống',
      perms: [
        { id: 20, name: 'Quản lý Tài khoản (User)', action: 'USER_VIEW' },
        { id: 21, name: 'Thiết lập vai trò & Phân quyền', action: 'PERMISSION_MANAGE' },
        { id: 22, name: 'Quản trị cấu trúc danh mục', action: 'ROLE_MANAGE' }
      ]
    }
  ];

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department?.name && u.department.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.roles.some((r: any) => r.role.name === roleFilter);
    const matchesScope = scopeFilter === 'ALL' || (u.dataScope && u.dataScope.scopeType === scopeFilter);
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);

    return matchesSearch && matchesRole && matchesScope && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 animate-pulse" />
            Không gian Quản trị Quyền & Data Scope
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Hệ thống phân quyền 3 lớp chuyên sâu bảo vệ tài sản số: Role (Vai trò) → Permission (Hành động) → Data Scope (Phạm vi dữ liệu)</p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleExportPermissions}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all"
          >
            <Download className="w-4 h-4" /> Xuất Audit Excel
          </button>
          <button
            onClick={() => setIsDelegationModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
          >
            <Users className="w-4 h-4" /> Thiết lập ủy quyền
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" /> Yêu cầu cấp quyền
          </button>
        </div>
      </div>

      {/* Main Workspace Navigation (4 tabs) */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4">
        {[
          { id: 'users', label: 'Thành viên & Phạm vi (Users & Scopes)', icon: Users },
          { id: 'matrix', label: 'Ma trận Quyền (Permission Matrix)', icon: Shield },
          { id: 'roles', label: 'Vai trò hệ thống (Role Management)', icon: Settings },
          { id: 'departments', label: 'Phòng ban & Cơ cấu (Departments)', icon: Building2 }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeWorkspaceTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveWorkspaceTab(tab.id as any)}
              className={`py-4 px-6 font-semibold text-sm flex items-center gap-2 border-b-2 -mb-px transition-all ${
                active 
                  ? 'border-indigo-600 text-indigo-600 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab 1: Users & Scopes */}
      {activeWorkspaceTab === 'users' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">Danh sách tài khoản và phân quyền ({filteredUsers.length})</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleUserModalOpen('create')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-all"
              >
                <Plus className="w-4 h-4" /> + Thêm user
              </button>
              <button
                onClick={() => {
                  window.open(`${api.defaults.baseURL}/admin/permissions/export?token=${localStorage.getItem('token')}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" /> Export danh sách user
              </button>
            </div>
          </div>
          {/* Filters Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tài khoản, tên hoặc phòng ban..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              
              <div className="flex flex-wrap gap-3 items-center">
                {/* Role filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Vai trò:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="p-2 text-xs border border-slate-350 rounded-lg bg-slate-50 font-semibold"
                  >
                    <option value="ALL">Tất cả vai trò</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Scope filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Phạm vi:</span>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="p-2 text-xs border border-slate-350 rounded-lg bg-slate-50 font-semibold"
                  >
                    <option value="ALL">Tất cả phạm vi</option>
                    <option value="ALL_SYSTEM">ALL (Toàn hệ thống)</option>
                    <option value="COMPANY">COMPANY (Công ty)</option>
                    <option value="DEPARTMENT">DEPARTMENT (Phòng ban)</option>
                    <option value="WAREHOUSE">WAREHOUSE (Kho)</option>
                    <option value="PROJECT">PROJECT (Dự án)</option>
                    <option value="SELF">SELF (Cá nhân)</option>
                    <option value="CUSTOM">CUSTOM (Tùy chỉnh đa tầng)</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Trạng thái:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 text-xs border border-slate-350 rounded-lg bg-slate-50 font-semibold"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">Tài khoản</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Họ Tên</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Phòng ban</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Vai trò & Thời hạn</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Phạm vi dữ liệu</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Đè quyền đặc biệt</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-center">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">Không tìm thấy thành viên nào.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const extraCount = user.extraPermissionsJson ? JSON.parse(user.extraPermissionsJson).length : 0;
                      const denyCount = user.deniedPermissionsJson ? JSON.parse(user.deniedPermissionsJson).length : 0;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4 font-semibold text-slate-900">{user.username}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">{user.fullName}</td>
                          <td className="px-6 py-4">{user.department?.name || <span className="text-slate-400">-</span>}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.map((r, idx) => (
                                  <div key={idx} className="flex flex-wrap items-center gap-1">
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold rounded-md">
                                      {r.role.name}
                                    </span>
                                    {(r.validFrom || r.validTo) && (
                                      <span className="text-[9px] font-medium text-slate-400 bg-slate-100 border px-1 py-0.2 rounded">
                                        Hạn: {r.validTo ? new Date(r.validTo).toLocaleDateString('vi-VN') : 'Vô hạn'}
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">Chưa cấp</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.dataScope ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded w-max">
                                  {user.dataScope.scopeType}
                                </span>
                                {user.dataScope.categoryIdsJson && (
                                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/50 px-1 py-0.2 rounded w-max truncate max-w-[150px]">
                                    Nhóm: {JSON.parse(user.dataScope.categoryIdsJson).join(', ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">SELF (Mặc định)</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {extraCount > 0 || denyCount > 0 ? (
                              <div className="flex gap-1">
                                {extraCount > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded">+{extraCount} Extra</span>}
                                {denyCount > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold rounded">-{denyCount} Deny</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5" /> Đang khóa</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handlePreview(user)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-transparent rounded hover:border-indigo-100 transition-all flex items-center gap-0.5 text-xs font-bold"
                              >
                                <Eye className="w-3.5 h-3.5" /> Xem thử
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent rounded hover:border-blue-100 transition-all flex items-center gap-0.5 text-xs font-bold"
                              >
                                <Edit className="w-3.5 h-3.5" /> Sửa quyền
                              </button>
                              <button
                                onClick={() => handleUserModalOpen('edit', user)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 border border-transparent rounded hover:border-amber-100 transition-all flex items-center gap-0.5 text-xs font-bold"
                              >
                                <Key className="w-3.5 h-3.5" /> Đổi TT/MK
                              </button>
                              {(hasPermission('USER_RESET_PASSWORD') || hasPermission('PERMISSION_MANAGE')) && (
                                <button
                                  onClick={() => handleResetPasswordOpen(user)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent rounded hover:border-rose-100 transition-all flex items-center gap-0.5 text-xs font-bold"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reset MK
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Widget: active Delegations Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Users className="w-4 h-4 text-indigo-600" /> Bảng điều khiển Ủy quyền (Delegation Workspace)
              </h3>
              <div className="overflow-y-auto max-h-[250px] space-y-3 pr-1">
                {delegations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Không có ủy quyền nào đang kích hoạt.</p>
                ) : (
                  delegations.map(del => {
                    const fromUser = users.find(u => u.id === del.fromUserId)?.fullName || 'Hệ thống';
                    const toUser = users.find(u => u.id === del.toUserId)?.fullName || 'Chưa rõ';
                    const roleName = roles.find(r => r.id === del.roleId)?.name || 'Vai trò';
                    
                    return (
                      <div key={del.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <span>{fromUser}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{toUser}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Vai trò ủy quyền: <span className="text-indigo-600 font-bold">{roleName}</span></p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Thời hạn: {new Date(del.validFrom).toLocaleDateString()} - {new Date(del.validTo).toLocaleDateString()}</p>
                          {del.reason && <p className="text-[9px] text-slate-500 italic mt-0.5">Lý do: "{del.reason}"</p>}
                        </div>
                        <button
                          onClick={() => handleDelegationRevoke(del.id)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                          title="Thu hồi ủy quyền ngay lập tức"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sub-Widget: Requests Workflow List */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Luồng phê duyệt yêu cầu (Requests Workflow)
              </h3>
              <div className="overflow-y-auto max-h-[250px] space-y-3 pr-1">
                {requests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Không có yêu cầu nào.</p>
                ) : (
                  requests.map(req => {
                    const reqUser = users.find(u => u.id === req.userId)?.fullName || 'Thành viên';
                    const reqRole = req.requestedRoleId ? roles.find(r => r.id === req.requestedRoleId)?.name : null;
                    const reqPerms = req.requestedPermission ? JSON.parse(req.requestedPermission) as string[] : [];
                    
                    return (
                      <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">{reqUser}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Lý do: "{req.reason}" ({req.durationDays || 'Vô'} ngày)</span>
                          </div>
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>{req.status}</span>
                        </div>
                        
                        {(reqRole || reqPerms.length > 0) && (
                          <div className="bg-white p-2 border rounded text-[10px] space-y-1">
                            {reqRole && <p>Yêu cầu vai trò: <span className="font-bold text-indigo-600">{reqRole}</span></p>}
                            {reqPerms.length > 0 && <p>Quyền đặc thù: <span className="font-mono text-emerald-600 font-bold">{reqPerms.join(', ')}</span></p>}
                          </div>
                        )}
                        
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2 pt-1 border-t">
                            <button
                              onClick={() => handleRequestApprove(req.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded font-semibold text-[10px]"
                            >
                              Từ chối
                            </button>
                            <button
                              onClick={() => handleRequestApprove(req.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold text-[10px] shadow"
                            >
                              Duyệt cấp
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Permission Matrix Dashboard */}
      {activeWorkspaceTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 overflow-hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-indigo-650" /> Ma trận Quyền hạn (Permissions Matrix)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cấu hình trực tiếp phân quyền cho các nhóm vai trò. Mọi thay đổi sẽ tự động áp dụng và đồng bộ tức thời.</p>
          </div>
          
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-700 w-1/3 min-w-[200px] border-r">Quyền hạn theo Module / Action</th>
                  {roles.map(r => (
                    <th key={r.id} className="px-4 py-3 font-bold text-slate-800 text-center w-32 border-r last:border-r-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black tracking-widest">{r.name}</span>
                        <span className="text-[9px] text-slate-400 font-medium truncate max-w-[80px]" title={r.description}>{r.description}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map(mod => (
                  <div key={mod.name} className="contents">
                    {/* Header for Module group */}
                    <tr className="bg-slate-100/40">
                      <td colSpan={roles.length + 1} className="px-4 py-2 font-bold text-indigo-850 uppercase tracking-wider bg-slate-100/70 border-y">
                        {mod.name}
                      </td>
                    </tr>
                    {mod.perms.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 border-r font-medium text-slate-700">
                          <span className="block font-bold text-slate-900">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{p.action}</span>
                        </td>
                        {roles.map(r => {
                          const hasPerm = r.permissions.some(rp => rp.permission.action === p.action);
                          return (
                            <td key={r.id} className="px-4 py-3 border-r text-center align-middle last:border-r-0">
                              <input
                                type="checkbox"
                                checked={hasPerm}
                                disabled={savingKey === `${r.name}:${p.action}`}
                                onChange={() => handleMatrixCellToggle(r.name, p.action, hasPerm)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-350 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </div>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Tab 3: Role CRUD Management */}
      {activeWorkspaceTab === 'roles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Quản trị Nhóm Vai Trò (Roles Workspace)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tạo các vai trò tùy chỉnh (Custom Roles) hoặc xem thông số các vai trò mặc định của hệ thống.</p>
            </div>
            <button
              onClick={() => {
                setSelectedRole(null);
                setRoleFormData({ name: '', description: '' });
                setIsRoleModalOpen(true);
              }}
              className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 rounded-lg shadow transition-all"
            >
              <Plus className="w-4 h-4" /> Tạo Vai Trò Custom
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => {
              const isSystem = SYSTEM_ROLES.includes(role.name);
              
              return (
                <div key={role.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/20 shadow-xxs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-800 tracking-wide">{role.name}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                        isSystem ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>{isSystem ? 'Hệ thống' : 'Tự tạo'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[36px]">{role.description || 'Không có mô tả chi tiết.'}</p>
                    <div className="flex items-center gap-1.5 mt-3 text-[10px] font-semibold text-slate-400">
                      <Shield className="w-3.5 h-3.5 text-slate-350" /> {role.permissions.length} quyền liên kết
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-1.5 border-t pt-3 mt-1">
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setRoleFormData({ name: role.name, description: role.description });
                        setIsRoleModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-slate-650 hover:bg-slate-100 text-[10px] font-bold rounded"
                    >
                      Chi tiết
                    </button>
                    {!isSystem && (
                      <button
                        onClick={() => handleRoleDelete(role.id)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Popups & Modals */}
      
      {/* 1. EDIT USER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-650" />
                  Cấu hình phân quyền & Scopes: {selectedUser.fullName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Tài khoản: {selectedUser.username} | Department: {selectedUser.department?.name || 'Không gắn'}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-200/50 p-1 rounded-full transition-all">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Modal Tabs */}
            <div className="flex border-b bg-slate-50/20 px-6">
              {[
                { id: 'role', label: 'Vai trò (Roles & Temporary)', icon: Users },
                { id: 'scope', label: 'Phạm vi dữ liệu (Data Scope)', icon: Layers },
                { id: 'func', label: 'Quyền chức năng (Overrides)', icon: Key },
                { id: 'sensitive', label: 'Quyền hiệu lực cuối', icon: Shield },
                { id: 'history', label: 'Thay đổi & Ghi chú', icon: Activity }
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-3.5 px-4 font-semibold text-xs flex items-center gap-1.5 border-b-2 -mb-px transition-all ${
                      active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[380px] space-y-4">
              {activeTab === 'role' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-800 leading-relaxed">
                    <strong>Vai trò có thời hạn (Temporary Roles):</strong> Bạn có thể cấu hình ngày có hiệu lực và ngày hết hạn cho từng vai trò được gán. Để trống nếu muốn vai trò hoạt động vô thời hạn.
                  </div>
                  
                  <div className="space-y-3">
                    {roles.map(role => {
                      const assignment = editRoles.find(er => er.roleId === role.id);
                      const isAssigned = !!assignment;
                      
                      return (
                        <div key={role.id} className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                          isAssigned ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200'
                        }`}>
                          <label className="flex items-start gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditRoles([...editRoles, { roleId: role.id, validFrom: '', validTo: '' }]);
                                } else {
                                  setEditRoles(editRoles.filter(er => er.roleId !== role.id));
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded mt-0.5 border-slate-350 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="block text-xs font-extrabold text-slate-800">{role.name}</span>
                              <span className="block text-xxs text-slate-400 mt-0.5">{role.description}</span>
                            </div>
                          </label>
                          
                          {isAssigned && (
                            <div className="flex flex-wrap gap-2 items-center text-[10px] font-semibold bg-white p-2 border rounded-lg shadow-xxs">
                              <span className="text-slate-400 flex items-center gap-0.5"><Calendar className="w-3 h-3" /> Hiệu lực:</span>
                              <input
                                type="date"
                                value={assignment.validFrom}
                                onChange={(e) => {
                                  setEditRoles(editRoles.map(er => er.roleId === role.id ? { ...er, validFrom: e.target.value } : er));
                                }}
                                className="border rounded px-1.5 py-0.5 focus:outline-none"
                              />
                              <span className="text-slate-400">đến</span>
                              <input
                                type="date"
                                value={assignment.validTo}
                                onChange={(e) => {
                                  setEditRoles(editRoles.map(er => er.roleId === role.id ? { ...er, validTo: e.target.value } : er));
                                }}
                                className="border rounded px-1.5 py-0.5 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'scope' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Chọn Phạm Vi Phân Dữ Liệu</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        { value: 'ALL', label: 'ALL (Toàn hệ thống)', desc: 'Xem tất cả tài sản' },
                        { value: 'COMPANY', label: 'COMPANY (Theo Công ty)', desc: 'Xem tài sản thuộc cty con' },
                        { value: 'DEPARTMENT', label: 'DEPARTMENT (Phòng ban)', desc: 'Xem theo phòng ban HCNS...' },
                        { value: 'WAREHOUSE', label: 'WAREHOUSE (Theo Kho)', desc: 'Xem tài sản thuộc kho nào' },
                        { value: 'PROJECT', label: 'PROJECT (Theo Dự án)', desc: 'Chỉ xem tài sản của dự án' },
                        { value: 'SELF', label: 'SELF (Chỉ bản thân)', desc: 'Chỉ xem tài sản mình quản lý' },
                        { value: 'CUSTOM', label: 'CUSTOM (Tùy chỉnh đa chiều)', desc: 'Phối hợp đa dạng tiêu chí' }
                      ].map(sc => (
                        <label 
                          key={sc.value}
                          className={`p-3 border rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                            editScopeType === sc.value ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-800">{sc.label}</span>
                            <input
                              type="radio"
                              name="scopeTypeModal"
                              value={sc.value}
                              checked={editScopeType === sc.value}
                              onChange={() => setEditScopeType(sc.value)}
                              className="w-3.5 h-3.5 text-indigo-600"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium leading-relaxed">{sc.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic scope multi-select components */}
                  {editScopeType === 'CUSTOM' && (
                    <div className="bg-indigo-50/30 p-4 border rounded-xl space-y-3 animate-fadeIn">
                      <label className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Layers className="w-4 h-4" /> Giới hạn xem theo Nhóm Tài Sản (Category Scope):</label>
                      <p className="text-[10px] text-slate-500">Giới hạn xem chỉ các tài sản thuộc về các nhóm danh mục cấp 1 này. Thích hợp cho nhân sự phụ trách riêng IT, Cơ điện, HCNS...</p>
                      <div className="flex flex-wrap gap-2 bg-white p-2 border rounded-lg">
                        {categories.map(cat => {
                          const isSelected = selectedCategories.includes(cat.code);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                if (isSelected) setSelectedCategories(selectedCategories.filter(code => code !== cat.code));
                                else setSelectedCategories([...selectedCategories, cat.code]);
                              }}
                              className={`px-3 py-1 text-xs font-semibold rounded border transition-all ${
                                isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cat.name} ({cat.code})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(editScopeType === 'COMPANY' || editScopeType === 'CUSTOM') && (
                    <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Building2 className="w-4 h-4 text-indigo-500" /> Chọn công ty:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {companies.map(c => {
                          const isSelected = selectedCompanies.includes(c.code);
                          return (
                            <button
                              key={c.code}
                              onClick={() => {
                                if (isSelected) setSelectedCompanies(selectedCompanies.filter(code => code !== c.code));
                                else setSelectedCompanies([...selectedCompanies, c.code]);
                              }}
                              className={`px-2.5 py-1 text-xs font-semibold rounded border ${
                                isSelected ? 'bg-indigo-600 text-white border-indigo-650' : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(editScopeType === 'DEPARTMENT' || editScopeType === 'CUSTOM') && (
                    <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Briefcase className="w-4 h-4 text-indigo-500" /> Chọn phòng ban:</label>
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto bg-white p-2 border rounded-lg">
                        {departments.map(d => {
                          const isSelected = selectedDepartments.includes(d.name);
                          return (
                            <button
                              key={d.code}
                              onClick={() => {
                                if (isSelected) setSelectedDepartments(selectedDepartments.filter(name => name !== d.name));
                                else setSelectedDepartments([...selectedDepartments, d.name]);
                              }}
                              className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                                isSelected ? 'bg-indigo-600 text-white border-indigo-650' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {d.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(editScopeType === 'WAREHOUSE' || editScopeType === 'CUSTOM') && (
                    <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><MapPin className="w-4 h-4 text-indigo-500" /> Chọn kho / vị trí:</label>
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto bg-white p-2 border rounded-lg">
                        {locations.map(l => {
                          const isSelected = selectedLocations.includes(l.name);
                          return (
                            <button
                              key={l.code}
                              onClick={() => {
                                if (isSelected) setSelectedLocations(selectedLocations.filter(name => name !== l.name));
                                else setSelectedLocations([...selectedLocations, l.name]);
                              }}
                              className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                                isSelected ? 'bg-indigo-600 text-white border-indigo-650' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {l.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(editScopeType === 'PROJECT' || editScopeType === 'CUSTOM') && (
                    <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><ClipboardList className="w-4 h-4 text-indigo-500" /> Chọn dự án:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nhập tên dự án và ấn Enter..."
                          value={projectInput}
                          onChange={(e) => setProjectInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(); } }}
                          className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1"
                        />
                        <button onClick={addProject} className="bg-indigo-600 text-white px-3 py-1 text-xs font-bold rounded-lg hover:bg-indigo-750">Thêm</button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedProjects.map(proj => (
                          <span key={proj} className="inline-flex items-center gap-1 bg-white border px-2 py-0.5 rounded text-xxs font-bold text-slate-750 shadow-xxs">
                            {proj}
                            <button onClick={() => setSelectedProjects(selectedProjects.filter(p => p !== proj))} className="text-slate-400 hover:text-slate-600"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'func' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-slate-500">Mẫu gán quyền nhanh:</span>
                    <div className="flex gap-2">
                      <button onClick={() => applyTemplate('STAFF')} className="px-2.5 py-1 text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 rounded">Template Staff</button>
                      <button onClick={() => applyTemplate('MANAGER')} className="px-2.5 py-1 text-[10px] font-bold text-emerald-650 bg-emerald-50 border border-emerald-100 rounded">Template Trưởng Phòng</button>
                      <button onClick={() => applyTemplate('AUDITOR')} className="px-2.5 py-1 text-[10px] font-bold text-amber-650 bg-amber-50 border border-amber-100 rounded">Template Kiểm Toán</button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {modules.map(mod => (
                      <div key={mod.name} className="border p-3.5 rounded-xl bg-slate-50/20 space-y-2.5">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b pb-1 mb-2">{mod.name}</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mod.perms.map(p => {
                            const isInherited = inheritedPermissions.has(p.action);
                            const isDenied = deniedPerms.includes(p.action);
                            const isExtra = extraPerms.includes(p.action);
                            const isEnabled = isPermissionEnabled(p.action);
                            
                            return (
                              <div
                                key={p.id}
                                onClick={() => handlePermissionToggle(p.action)}
                                className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer transition-all ${
                                  isEnabled ? 'bg-white shadow-xxs border-slate-200' : 'bg-slate-100/50 text-slate-450 border-slate-150'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={isEnabled} onChange={() => {}} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-350 pointer-events-none" />
                                  <div>
                                    <span className="block text-xs font-semibold">{p.name}</span>
                                    <span className="text-[9px] font-mono text-slate-400 block">{p.action}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  {isInherited && <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-extrabold rounded">Role</span>}
                                  {isExtra && <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded">Extra</span>}
                                  {isDenied && <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 text-[9px] font-extrabold rounded">Deny</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sensitive' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Quyền Hiệu Lực Sau Cùng (Final Active Permission Matrix)</h3>
                  <p className="text-[10px] text-slate-500">Các quyền đã gán hoàn chỉnh từ vai trò và lệnh đè quyền đặc khu sau khi cấn trừ Deny.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 bg-slate-50/50 border rounded-xl">
                    {modules.flatMap(m => m.perms).map(p => {
                      const isEnabled = isPermissionEnabled(p.action);
                      return (
                        <div key={p.id} className={`p-2.5 border rounded-lg flex items-center gap-2 ${
                          isEnabled ? 'bg-white border-indigo-200' : 'bg-slate-100/40 text-slate-400 border-slate-150'
                        }`}>
                          {isEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-slate-350 flex-shrink-0" />}
                          <div className="truncate">
                            <span className={`block text-xs font-semibold ${isEnabled ? 'text-slate-800' : 'text-slate-400'}`}>{p.name}</span>
                            <span className="text-[8px] font-mono text-slate-450 truncate block mt-0.5">{p.action}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nhập Lý Do Cập Nhật Phân Quyền (Bắt buộc / Change Reason):</label>
                    <input
                      type="text"
                      placeholder="Giải trình lý do (Ví dụ: Thăng chức, thay đổi nhiệm sở phụ trách IT...)"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-750 block">Nhật Ký Ghi Nhận Lịch Sử Thay Đổi:</span>
                    <div className="border rounded-xl overflow-hidden text-xxs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 font-semibold border-b">
                          <tr>
                            <th className="px-3 py-2">Thời gian</th>
                            <th className="px-3 py-2">Người chỉnh</th>
                            <th className="px-3 py-2">Ghi chú / Giải trình thay đổi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {historyLoading ? (
                            <tr><td colSpan={3} className="text-center py-4">Đang tải logs...</td></tr>
                          ) : userHistory.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-4 italic text-slate-400">Không có dữ liệu log.</td></tr>
                          ) : (
                            userHistory.map(log => {
                              const det = log.detailsJson ? JSON.parse(log.detailsJson) : {};
                              return (
                                <tr key={log.id}>
                                  <td className="px-3 py-2 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                                  <td className="px-3 py-2 font-bold text-slate-700">{log.performedBy}</td>
                                  <td className="px-3 py-2 text-slate-650 max-w-[200px] truncate" title={det.reason}>{det.reason || 'Cập nhật hệ thống'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t rounded-b-2xl flex justify-between items-center">
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="modalUserStatus"
                    checked={editIsActive}
                    onChange={() => setEditIsActive(true)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-emerald-800">Hoạt động bình thường</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="modalUserStatus"
                    checked={!editIsActive}
                    onChange={() => setEditIsActive(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-800">Khóa truy cập tài khoản</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedUser(null)} className="px-4 py-2 border rounded-xl font-semibold bg-white hover:bg-slate-50 text-xs shadow-xxs">Hủy bỏ</button>
                <button onClick={handleSave} className="px-4 py-2 flex items-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-750 font-bold text-xs shadow transition-all">
                  <Save className="w-3.5 h-3.5 mr-1" /> Lưu và Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ROLE CRUD MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-slate-800">{selectedRole ? 'Cập Nhật Vai Trò' : 'Tạo Vai Trò Mới'}</h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleRoleSave} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Tên Vai Trò (Định danh):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: QLTS_BRANCH, ACC_AUDITOR..."
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  disabled={selectedRole ? SYSTEM_ROLES.includes(selectedRole.name) : false}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Mô tả Chi Tiết:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Khai báo nhiệm vụ cụ thể của vai trò này..."
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-750">Lưu vai trò</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DELEGATION WORKSPACE MODAL */}
      {isDelegationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-slate-800">Thiết lập ủy quyền vai trò công vụ</h2>
              <button onClick={() => setIsDelegationModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleDelegationSubmit} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Từ người dùng ủy nhiệm (Người cấp quyền):</label>
                <select
                  required
                  value={delegationFormData.fromUserId}
                  onChange={(e) => setDelegationFormData({ ...delegationFormData, fromUserId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chọn người đi ủy quyền --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Đến người dùng tiếp nhiệm (Người nhận quyền):</label>
                <select
                  required
                  value={delegationFormData.toUserId}
                  onChange={(e) => setDelegationFormData({ ...delegationFormData, toUserId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chọn người nhận ủy quyền --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Vai trò cần ủy nhiệm:</label>
                <select
                  required
                  value={delegationFormData.roleId}
                  onChange={(e) => setDelegationFormData({ ...delegationFormData, roleId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Hiệu lực từ:</label>
                  <input
                    type="date"
                    required
                    value={delegationFormData.validFrom}
                    onChange={(e) => setDelegationFormData({ ...delegationFormData, validFrom: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Hết hạn vào:</label>
                  <input
                    type="date"
                    required
                    value={delegationFormData.validTo}
                    onChange={(e) => setDelegationFormData({ ...delegationFormData, validTo: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Giải trình lý do ủy quyền:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đi công tác từ 20/05 đến 30/05..."
                  value={delegationFormData.reason}
                  onChange={(e) => setDelegationFormData({ ...delegationFormData, reason: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsDelegationModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-755">Kích hoạt ủy nhiệm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REQUEST WORKFLOW CREATION MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-slate-800">Yêu cầu cấp quyền / Đắp thêm quyền</h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleRequestSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Yêu cầu vai trò bổ sung:</label>
                <select
                  value={requestFormData.requestedRoleId}
                  onChange={(e) => setRequestFormData({ ...requestFormData, requestedRoleId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Để trống nếu không xin vai trò --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.description})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Xin đắp thêm hành động đặc khu (tùy chọn):</label>
                <div className="max-h-[140px] overflow-y-auto p-2 border rounded-lg grid grid-cols-1 gap-1 text-[10px]">
                  {modules.flatMap(m => m.perms).map(p => {
                    const isSelected = requestFormData.requestedPermission.includes(p.action);
                    return (
                      <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRequestFormData({ ...requestFormData, requestedPermission: [...requestFormData.requestedPermission, p.action] });
                            } else {
                              setRequestFormData({ ...requestFormData, requestedPermission: requestFormData.requestedPermission.filter(act => act !== p.action) });
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-650 rounded"
                        />
                        <div>
                          <strong>{p.name}</strong>
                          <span className="text-[8px] font-mono text-slate-400 block">{p.action}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Số ngày cần cấp quyền (thời hạn tạm thời):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={requestFormData.durationDays}
                  onChange={(e) => setRequestFormData({ ...requestFormData, durationDays: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Lý do giải trình (Bắt buộc):</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Khai báo lý do cấp bách để cấp trên phê duyệt nhanh..."
                  value={requestFormData.reason}
                  onChange={(e) => setRequestFormData({ ...requestFormData, reason: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-755">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. PREVIEW MODAL */}
      {previewUser && previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-indigo-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-indigo-900 flex items-center gap-1.5">
                  <Eye className="w-5 h-5 text-indigo-650" />
                  Không gian xem thử quyền (Preview access)
                </h2>
                <p className="text-xs text-indigo-700 mt-0.5">Thành viên: {previewUser.fullName} ({previewUser.username})</p>
              </div>
              <button onClick={() => setPreviewUser(null)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {previewLoading ? (
                <div className="text-center py-10">Đang phân tích thông số dữ liệu...</div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xxs font-black text-slate-400 uppercase tracking-widest mb-2.5">Số lượng bản ghi nhìn thấy trong phạm vi dữ liệu</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 bg-slate-50 border rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Tài sản</span>
                        <span className="block text-xl font-black text-indigo-600 mt-1">{previewData.assetCount}</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">bản ghi</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 border rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Bàn giao</span>
                        <span className="block text-xl font-black text-indigo-600 mt-1">{previewData.handoverCount}</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">bản ghi</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 border rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Kiểm kê</span>
                        <span className="block text-xl font-black text-indigo-600 mt-1">{previewData.inventoryCount}</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">đợt đống</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xxs font-black text-slate-400 uppercase tracking-widest mb-2">Quyền nhạy cảm (Field-level Security)</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg text-xs">
                        <span className="font-semibold text-slate-700">Xem giá mua tài sản:</span>
                        {previewData.cannotView?.purchasePrice ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[10px]">ẨN GIÁ MUA</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[10px]">HIỂN THỊ</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg text-xs">
                        <span className="font-semibold text-slate-700">Xem Nhật ký / Logs:</span>
                        {previewData.cannotView?.auditLogs ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[10px]">KHÓA XEM LOGS</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[10px]">ĐƯỢC TRUY CẬP</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg text-xs">
                        <span className="font-semibold text-slate-700">Xuất báo cáo Excel (.xlsx):</span>
                        {previewData.cannotView?.exportExcel ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded text-[10px]">KHÓA XUẤT FILE</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded text-[10px]">ĐƯỢC XUẤT FILE</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t rounded-b-2xl flex justify-end">
              <button onClick={() => setPreviewUser(null)} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs">Đóng xem thử</button>
            </div>
          </div>
        </div>
      )}
      {/* Main Tab 4: Departments Management */}
      {activeWorkspaceTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-650 animate-bounce" />
                Cơ cấu tổ chức & Sơ đồ phòng ban
              </h2>
              <p className="text-xs text-slate-500 mt-1">Quản lý cây thư mục phòng ban đa cấp, phân phối nhân sự và theo dõi số lượng tài sản trực thuộc.</p>
            </div>
            <button
              onClick={() => handleDeptModalOpen('create')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Thêm phòng ban mới
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 min-h-[300px]">
            {deptTree.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic bg-white rounded-lg border p-6">
                Chưa có phòng ban nào được thiết lập. Hãy bấm nút phía trên để tạo!
              </div>
            ) : (
              <div className="space-y-4">
                {deptTree.map(rootNode => renderDeptNode(rootNode))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER CRUD MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-slate-800">
                {userModalMode === 'create' ? 'Tạo tài khoản người dùng mới' : `Cập nhật thông tin: ${userFormData.username}`}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleUserSubmit} className="p-5 space-y-4">
              {userModalMode === 'create' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tên đăng nhập (Username):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: nguyenvanan"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Họ và tên (Full Name):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Phòng ban trực thuộc:</label>
                <select
                  value={userFormData.departmentId}
                  onChange={(e) => setUserFormData({ ...userFormData, departmentId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chưa gán phòng ban --</option>
                  {deptList.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {userModalMode === 'edit' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Trạng thái tài khoản:</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="LOCKED">Khóa tài khoản (Locked)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                <span className="text-xs font-bold text-indigo-700 block mb-1">
                  {userModalMode === 'create' ? 'Thiết lập mật khẩu:' : 'Đặt lại mật khẩu (Để trống nếu không muốn đổi):'}
                </span>
                
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    required={userModalMode === 'create'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg focus:outline-none bg-white"
                  />
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu mới"
                    required={userModalMode === 'create'}
                    value={userFormData.confirmPassword}
                    onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg focus:outline-none bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.mustChangePassword}
                    onChange={(e) => setUserFormData({ ...userFormData, mustChangePassword: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600 font-semibold">
                    Yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-755">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT CRUD MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-slate-800">
                {deptModalMode === 'create' ? 'Tạo phòng ban mới' : 'Sửa thông tin phòng ban'}
              </h2>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleDeptSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Mã phòng ban:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: HCNS"
                    value={deptFormData.code}
                    onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tên phòng ban:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Hành chính nhân sự"
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Mô tả phòng ban:</label>
                <input
                  type="text"
                  placeholder="Mô tả chức năng nhiệm vụ..."
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Phòng ban cấp trên (Nếu có):</label>
                <select
                  value={deptFormData.parentDeptId}
                  onChange={(e) => setDeptFormData({ ...deptFormData, parentDeptId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Không có (Phòng ban gốc) --</option>
                  {deptList.filter(d => d.id !== editingDeptId).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Trưởng phòng / Phụ trách:</label>
                <select
                  value={deptFormData.managerId}
                  onChange={(e) => setDeptFormData({ ...deptFormData, managerId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chưa gán trưởng phòng --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Thuộc Công ty / Chi nhánh:</label>
                <select
                  value={deptFormData.companyId}
                  onChange={(e) => setDeptFormData({ ...deptFormData, companyId: e.target.value })}
                  className="w-full p-2 text-xs border rounded-lg"
                >
                  <option value="">-- Chưa gán công ty --</option>
                  {companies.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold bg-white hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-755">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED ADMIN RESET USER PASSWORD MODAL */}
      {isResetPwdModalOpen && resetPwdUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col overflow-hidden transition-all duration-300">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-500 animate-spin" style={{ animationDuration: '3s' }} />
                <h2 className="text-sm font-bold text-slate-800">
                  Reset Mật Khẩu: <span className="text-rose-600">{resetPwdUser.fullName} ({resetPwdUser.username})</span>
                </h2>
              </div>
              <button 
                onClick={() => setIsResetPwdModalOpen(false)} 
                className="text-slate-400 hover:text-slate-655 p-1 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 block">Mật khẩu mới:</label>
                <div className="relative">
                  <input
                    type={showResetPwd ? "text" : "password"}
                    required
                    placeholder="Mật khẩu tối thiểu 8 ký tự..."
                    value={resetPwdNewPassword}
                    onChange={(e) => setResetPwdNewPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPwd(!showResetPwd)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 block">Xác nhận mật khẩu mới:</label>
                <div className="relative">
                  <input
                    type={showResetConfirmPwd ? "text" : "password"}
                    required
                    placeholder="Nhập lại mật khẩu mới..."
                    value={resetPwdConfirmPassword}
                    onChange={(e) => setResetPwdConfirmPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPwd(!showResetConfirmPwd)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResetConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Tạo mật khẩu ngẫu nhiên
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200/60 transition-colors mt-2">
                <input
                  type="checkbox"
                  checked={resetPwdMustChange}
                  onChange={(e) => setResetPwdMustChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                Yêu cầu đổi mật khẩu khi đăng nhập lần sau
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsResetPwdModalOpen(false)} 
                  className="px-4 py-2 border rounded-lg text-xs font-bold bg-white hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={resetPwdLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs shadow hover:bg-rose-700 transition-all shadow-rose-200 disabled:opacity-50"
                >
                  {resetPwdLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'QLTS_MANAGER', 'DEPARTMENT_MANAGER', 'STAFF', 'VIEWER', 'AUDITOR'];
