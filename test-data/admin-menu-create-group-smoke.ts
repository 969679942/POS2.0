/** Admin / Menu / Create New Group 冒烟用例共享数据 */
export const adminMenuCreateGroupSmokeTestData = {
  /** 与现有导航类冒烟一致，可按环境替换 */
  employeePassword: '11',
  /** 新建菜单组名称前缀；后缀为 10 位随机字母数字 */
  groupNamePrefix: 'autotest_create_menu_',
} as const;
