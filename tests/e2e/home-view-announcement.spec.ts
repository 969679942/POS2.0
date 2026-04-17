import { createPublishAnnouncementAndCloseToHome } from '../../flows/home-announcement.flow';
import { enterWithEmployeePassword } from '../../flows/employee-login.flow';
import { openHome } from '../../flows/home.flow';
import { enterWithAvailableLicense } from '../../flows/license-selection.flow';
import { test } from '../../fixtures/test.fixture';

test.describe('首页-查看公告', () => {
  test(
    '应在新建公告后再次进入消息页查看详情并 Clear All 清空列表',
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

      const { subject, body } = await test.step('前置：调用新建公告流程并回到主页', async () =>
        createPublishAnnouncementAndCloseToHome(loggedInHomePage),
      );

      await test.step('断言首页右上角铃铛入口可见', async () => {
        await loggedInHomePage.expectMessageBellButtonVisible();
      });

      const messagesPage = await test.step('步骤一：再次点击铃铛进入消息页', async () =>
        loggedInHomePage.openMessageCenter(),
      );

      await messagesPage.expectMessageToolbarActionsVisible();

      await test.step('步骤二：在列表中定位并点击刚创建的公告', async () => {
        await messagesPage.clickMessageListItemBySubjectOrBody(subject, body);
      });

      await test.step('断言公告主题与正文与创建时一致', async () => {
        await messagesPage.expectAnnouncementDetailShowsSubjectAndBody(subject, body);
      });

      await test.step('步骤三：点击右下角 Clear All', async () => {
        await messagesPage.clickClearAllInMessageList();
      });

      await test.step('断言公告列表中不再出现该条公告', async () => {
        await messagesPage.expectMessageListDoesNotShowAnnouncementSubject(subject);
      });
    },
  );
});
