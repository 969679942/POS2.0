import { adminMenuCreateGroupSmokeTestData } from './admin-menu-create-group-smoke';

/** Admin / Menu / Create Menu Category 冒烟 */
export const adminMenuCreateCategorySmokeTestData = {
  employeePassword: adminMenuCreateGroupSmokeTestData.employeePassword,
  /** 前置菜单组名称前缀（与新建组流程一致） */
  groupNamePrefix: adminMenuCreateGroupSmokeTestData.groupNamePrefix,
} as const;
