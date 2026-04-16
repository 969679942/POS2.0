import { HomePage } from '../pages/home.page';
import { step } from '../utils/step';

export class BossClockInFlow {
  @step('业务步骤：在已登录主页为员工 Boss 完成上班打卡并确认出现 Clocked in at 提示')
  async clockInBossAndAssertClockedInAt(homePage: HomePage): Promise<void> {
    await homePage.expectEmployeeReady();
    await homePage.expectBossClockInEntryVisible();
    if (await homePage.isClockedInAtAlreadyShownBelowBoss()) {
      return;
    }
    await homePage.clickBossToOpenClockPanel();
    await homePage.expectBossClockDialogReady();
    await homePage.clickClockInOnBossPanelIfVisible();
    await homePage.expectClockedInAtLineVisible();
  }
}

export async function clockInBossAfterEmployeeLogin(homePage: HomePage): Promise<void> {
  const flow = new BossClockInFlow();
  await flow.clockInBossAndAssertClockedInAt(homePage);
}
