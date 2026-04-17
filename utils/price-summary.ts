/**
 * 从点餐页左侧「价格汇总」折叠按钮的 innerText / 拼合文案中解析标签金额。
 * 兼容 Down（展开）与 Up（收起）两种文案形态。
 */
export function parsePriceSummaryToggleInnerText(inner: string): Record<string, string> {
  const record: Record<string, string> = {};
  const compact = inner.replace(/\s+/g, ' ').trim();

  const countMatch = /\bCount\s+(\d+)\b/i.exec(compact);
  if (countMatch) {
    record.Count = countMatch[1];
  }

  const subMatch = /\bSubtotal\s+(\$[\d,.]+)/i.exec(compact);
  if (subMatch) {
    record.Subtotal = subMatch[1];
  }

  const taxMatch = /\bTax\s+(\$[\d,.]+)/i.exec(compact);
  if (taxMatch) {
    record.Tax = taxMatch[1];
  }

  const tbtMatch = /\bTotal Before Tips\s+(\$[\d,.]+)/i.exec(compact);
  if (tbtMatch) {
    record['Total Before Tips'] = tbtMatch[1];
  }

  const cashMatch =
    /\bTotal\s*\(\s*Cash\s*\)\s*(?:Save\$[\d,.]+\s*)?(\$[\d,.]+)/i.exec(compact) ??
    /\bTotal\s*\(\s*Cash\s*\)\s*(\$[\d,.]+)/i.exec(compact);
  if (cashMatch) {
    record['Total(Cash)'] = cashMatch[1];
  }

  const cardMatch = /\bTotal\s*\(\s*Card\s*\)\s*(\$[\d,.]+)/i.exec(compact);
  if (cardMatch) {
    record['Total(Card)'] = cardMatch[1];
  }

  return record;
}
