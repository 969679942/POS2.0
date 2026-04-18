import { adminMenuCreateGroupSmokeTestData } from './admin-menu-create-group-smoke';

/** Admin / Menu / Delete Menu Group 冒烟：登录与口令与新建用例一致；组名前缀便于环境内检索 */
export const adminMenuDeleteGroupSmokeTestData = {
  employeePassword: adminMenuCreateGroupSmokeTestData.employeePassword,
  /** 前置创建的菜单组名称前缀；后缀为 10 位随机字母数字 */
  groupNamePrefix: 'autotest_delete_menu_',
} as const;
