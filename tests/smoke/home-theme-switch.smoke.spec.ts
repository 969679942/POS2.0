import { expect } from '@playwright/test';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { waitUntil } from '../../utils/wait';

test.describe('首页切换页面颜色', () => {
  test(
    '应能在登录后通过顶栏 Light/Dark 切换并看到主题文案翻转',
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
      await openHome(homePage);

      if (await licenseSelectionPage.isVisible(10_000)) {
        await enterWithAvailableLicense(licenseSelectionPage, homePage);
      }

      const loggedInHomePage = await enterWithEmployeePassword(
        employeeLoginPage,
        homePage,
        '11',
      );

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();

      const before = await test.step('读取切换前顶栏展示的 Light 或 Dark', async () =>
        loggedInHomePage.readThemeToggleDisplayLabel(),
      );

      await test.step('点击顶栏主题切换（Light 或 Dark）', async () => {
        await loggedInHomePage.clickThemeToggle();
      });

      const after = await waitUntil(
        async () => loggedInHomePage.readThemeToggleDisplayLabel(),
        (label) => label !== before,
        {
          timeout: 15_000,
          interval: 300,
          message: '点击主题切换后，顶栏 Light/Dark 展示未在预期时间内翻转',
        },
      );

      await test.step('断言主题在 Light 与 Dark 之间已切换', async () => {
        expect(after).not.toBe(before);
        const expected: Record<'Light' | 'Dark', 'Light' | 'Dark'> = {
          Light: 'Dark',
          Dark: 'Light',
        };
        expect(after).toBe(expected[before]);
      });
    },
  );
});
