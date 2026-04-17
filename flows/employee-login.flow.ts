import { EmployeeLoginPage } from '../pages/employee-login.page';
import { HomePage } from '../pages/home.page';
import { step } from '../utils/step';

export class EmployeeLoginFlow {
  @step('业务步骤：使用员工密码登录并进入主页')
  async enterWithEmployeePassword(
    employeeLoginPage: EmployeeLoginPage,
    homePage: HomePage,
    password: string,
  ): Promise<HomePage> {
    await employeeLoginPage.expectVisible();
    await employeeLoginPage.fillPassword(password);
    await employeeLoginPage.clickConfirm();
    await employeeLoginPage.expectPasscodeDismissedAfterLogin();
    await homePage.expectEmployeeReady();

    return homePage;
  }
}

export async function enterWithEmployeePassword(
  employeeLoginPage: EmployeeLoginPage,
  homePage: HomePage,
  password: string,
): Promise<HomePage> {
  const employeeLoginFlow = new EmployeeLoginFlow();
  return await employeeLoginFlow.enterWithEmployeePassword(
    employeeLoginPage,
    homePage,
    password,
  );
}
