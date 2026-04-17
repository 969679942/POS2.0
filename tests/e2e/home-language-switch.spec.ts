import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';
import { waitUntil } from '../../utils/wait';

test.describe('首页切换语言', () => {
  test(
    '应能从首页经顶栏语言入口切换为简体中文并看到堂吃、外送等中文文案',
    {
      tag: ['@regression'],
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

      await test.step('断言顶栏球形图标（语言）入口可见', async () => {
        await loggedInHomePage.expectLanguageMenuButtonVisible();
      });

      await test.step('打开语言列表；若已为中文界面则先切回 English', async () => {
        await loggedInHomePage.openLanguageMenu();
        if (await loggedInHomePage.isDineInFunctionCardShowingChineseLabel()) {
          await loggedInHomePage.clickLanguageOptionEnglish();
          await waitUntil(
            async () => !(await loggedInHomePage.isDineInFunctionCardShowingChineseLabel()),
            (ok) => ok,
            {
              timeout: 15_000,
              interval: 300,
              message: '切回 English 后，堂吃功能卡仍显示为中文标识',
            },
          );
        }
      });

      await test.step('再次打开语言列表并断言 English 为当前选中项（√ 或 aria-selected）', async () => {
        await loggedInHomePage.openLanguageMenu();
        await loggedInHomePage.expectEnglishLanguageOptionShowsSelectionIndicator();
      });

      await test.step('点击简体中文', async () => {
        await loggedInHomePage.openLanguageMenu();
        await loggedInHomePage.clickLanguageOptionSimplifiedChinese();
      });

      await waitUntil(
        async () => loggedInHomePage.isDineInFunctionCardShowingChineseLabel(),
        (ok) => ok,
        {
          timeout: 15_000,
          interval: 300,
          message: '选择简体中文后，堂吃功能卡未在预期时间内显示中文「堂吃」',
        },
      );

      await test.step('断言堂吃、外送等功能卡已为中文（堂吃、外送）', async () => {
        await loggedInHomePage.expectPrimaryFunctionCardsShowDineInAndDeliveryChinese();
      });
    },
  );
});
