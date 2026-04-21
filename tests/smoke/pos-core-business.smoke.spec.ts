import { expect } from '@playwright/test';
import { createPublishAnnouncementAndCloseToHome } from '../../flows/home-announcement.flow';
import { test } from '../../fixtures/test.fixture';
import { waitUntil } from '../../utils/wait';
import { ensureLoggedInHomePage } from './pos-business.shared';

test.describe('【POS 核心业务补充冒烟】', () => {
  test(
    '应能从主页打开消息中心并看到工具栏',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const messagesPage = await loggedInHomePage.openMessageCenter();
      await messagesPage.expectMessageToolbarActionsVisible();
    },
  );

  test(
    '应能关闭消息中心并回到主页主功能区',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const messagesPage = await loggedInHomePage.openMessageCenter();
      await messagesPage.expectMessageToolbarActionsVisible();
      await messagesPage.clickMessageToolbarClose();
      await messagesPage.expectMessagePanelClosed();
      await loggedInHomePage.expectPrimaryFunctionCardsVisible();
    },
  );

  test(
    '应能新建并发送一条公告',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const { subject, body } = await createPublishAnnouncementAndCloseToHome(loggedInHomePage);
      expect(subject).toContain('自动化公告主题-');
      expect(body).toContain('自动化公告正文-');
    },
  );

  test(
    '应能重新进入消息中心查看刚创建的公告并清空列表',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const { subject, body } = await createPublishAnnouncementAndCloseToHome(loggedInHomePage);
      const messagesPage = await loggedInHomePage.openMessageCenter();
      await messagesPage.expectMessageToolbarActionsVisible();
      await messagesPage.clickMessageListItemBySubjectOrBody(subject, body);
      await messagesPage.expectAnnouncementDetailShowsSubjectAndBody(subject, body);
      await messagesPage.clickClearAllInMessageList();
      await messagesPage.expectMessageListDoesNotShowAnnouncementSubject(subject);
    },
  );

  test(
    '应能在简体中文与 English 之间切换主页文案',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      await loggedInHomePage.expectPrimaryFunctionCardsVisible();
      await loggedInHomePage.expectLanguageMenuButtonVisible();

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

      await loggedInHomePage.openLanguageMenu();
      await loggedInHomePage.clickLanguageOptionSimplifiedChinese();
      await loggedInHomePage.expectPrimaryFunctionCardsShowDineInAndDeliveryChinese();

      await loggedInHomePage.openLanguageMenu();
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
    },
  );

  test(
    '应能切换主页主题并看到 Light/Dark 翻转',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const before = await loggedInHomePage.readThemeToggleDisplayLabel();
      await loggedInHomePage.clickThemeToggle();

      const after = await waitUntil(
        async () => loggedInHomePage.readThemeToggleDisplayLabel(),
        (label) => label !== before,
        {
          timeout: 15_000,
          interval: 300,
          message: '点击主题切换后，顶栏 Light/Dark 展示未在预期时间内翻转',
        },
      );

      expect(after).not.toBe(before);
      const expected: Record<'Light' | 'Dark', 'Light' | 'Dark'> = {
        Light: 'Dark',
        Dark: 'Light',
      };
      expect(after).toBe(expected[before]);
    },
  );

  test(
    '应能从主页点击 Dine In 进入选桌页',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const selectTablePage = await loggedInHomePage.clickDineIn();
      await selectTablePage.expectLoaded();
    },
  );

  test(
    '应能从主页点击 Delivery 进入填单页',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const deliveryPage = await loggedInHomePage.clickDelivery();
      await deliveryPage.expectVisible();
    },
  );

  test(
    '应能从主页点击 Pick Up 进入填单页',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const pickUpPage = await loggedInHomePage.clickPickUp();
      await pickUpPage.expectVisible();
    },
  );

  test(
    '应能从主页点击 To Go 进入点单页',
    {
      tag: ['@smoke'],
    },
    async ({ homePage, licenseSelectionPage, employeeLoginPage }) => {
      const loggedInHomePage = await ensureLoggedInHomePage({
        homePage,
        licenseSelectionPage,
        employeeLoginPage,
        employeePassword: '11',
      });

      const orderDishesPage = await loggedInHomePage.clickToGo();
      await orderDishesPage.expectLoaded();
    },
  );
});
