/** 首页消息 / 新建公告用例中的可区分文案（避免与历史公告撞车） */
export function buildAnnouncementTestCopy(): { subject: string; body: string } {
  const stamp = Date.now();
  return {
    subject: `自动化公告主题-${stamp}`,
    body: `自动化公告正文-${stamp}`,
  };
}
