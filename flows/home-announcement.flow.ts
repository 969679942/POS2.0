import { HomePage } from '../pages/home.page';
import { buildAnnouncementTestCopy } from '../test-data/home-announcement';
import { step } from '../utils/step';

export type PublishedAnnouncement = {
  subject: string;
  body: string;
};

export class HomeAnnouncementFlow {
  @step('业务步骤：经消息中心创建并发送一条公告后关闭浮层回到主页')
  async createPublishAnnouncementAndCloseToHome(homePage: HomePage): Promise<PublishedAnnouncement> {
    const { subject, body } = buildAnnouncementTestCopy();

    await homePage.expectMessageBellButtonVisible();
    const messagesPage = await homePage.openMessageCenter();
    await messagesPage.expectMessageToolbarActionsVisible();
    await messagesPage.clickNewAnnouncement();
    await messagesPage.fillAnnouncementSubject(subject);
    await messagesPage.fillAnnouncementBody(body);
    await messagesPage.clickSendAnnouncement();
    await messagesPage.expectAnnouncementSuccessFeedbackVisible();
    await messagesPage.clickMessageToolbarClose();
    await messagesPage.expectMessagePanelClosed();
    await homePage.expectPrimaryFunctionCardsVisible();

    return { subject, body };
  }
}

export async function createPublishAnnouncementAndCloseToHome(
  homePage: HomePage,
): Promise<PublishedAnnouncement> {
  const flow = new HomeAnnouncementFlow();
  return await flow.createPublishAnnouncementAndCloseToHome(homePage);
}
