export const getAssetAssigneeDisplay = (asset: any) => {
  const latestAssignmentName = String(asset?.assignments?.[0]?.newUserName || '').trim();
  const assignmentAreaName = /^KHU\s+VỰC:\s*/i.test(latestAssignmentName)
    ? latestAssignmentName.replace(/^KHU\s+VỰC:\s*/i, '').trim()
    : '';
  const areaName = String(asset?.assignedAreaName || assignmentAreaName).trim();
  const isArea = Boolean(areaName)
    && (asset?.currentAssigneeType === 'AREA' || !String(asset?.currentUserName || '').trim());

  return {
    isArea,
    name: isArea ? areaName : String(asset?.currentUserName || '').trim() || 'Chưa cấp phát',
    detail: isArea
      ? 'Khu vực sử dụng'
      : String(asset?.currentPosition || asset?.departmentName || '').trim() || '-',
  };
};
