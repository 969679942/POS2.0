import { createPublishAnnouncementAndCloseToHome } from '../../flows/home-announcement.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';

test.describe('首页-新建公告', () => {
  test(
    '应能从首页经铃铛进入消息页、新建公告并发送后出现成功类提示，关闭消息页后回到主页',
    {
      tag: ['@e2e'],
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

      await test.step('经消息中心创建并发送公告后关闭回到主页', async () => {
        await createPublishAnnouncementAndCloseToHome(loggedInHomePage);
      });
    },
  );
});
