import { clockInBossAfterEmployeeLogin } from '../../flows/boss-clock-in.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { bossClockInSmokeTestData } from '../../test-data/boss-clock-in-smoke';

test.describe('Boss 上班打卡冒烟', () => {
  test(
    '应能从首页进入并在登录后通过 Boss 入口打卡，确认出现 Clocked in at 提示',
    {
      tag: ['@smoke'],
      annotation: [
        {
          type: 'issue',
          description: 'https://devtickets.atlassian.net/browse/POS-46667',
        },
      ],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      test.setTimeout(90_000);

      await test.step('用例步骤：打开首页并完成壳加载', async () => {
        await openHome(homePage);
      });

      await test.step('用例步骤：若 10 秒内出现 License 选择页则选择可用 PC License，否则跳过', async () => {
        if (await licenseSelectionPage.isVisible(10_000)) {
          await enterWithAvailableLicense(licenseSelectionPage, homePage);
        }
      });

      const homeAfterLogin = await test.step('用例步骤：以 Boss 员工口令完成登录', async () =>
        enterWithEmployeePassword(
          employeeLoginPage,
          homePage,
          bossClockInSmokeTestData.employeePassword,
        ),
      );

      await test.step(
        '用例步骤：Boss 上班打卡（先判 Boss 下是否已有 Clocked in at；无则点 Boss 再 Clock In，最后断言 Clocked in at）',
        async () => {
          await clockInBossAfterEmployeeLogin(homeAfterLogin);
        },
      );
    },
  );
});

