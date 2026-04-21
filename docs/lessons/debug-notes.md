# 2026-04-20 Recall 导航差分备忘

## 这份备忘只记录 AGENTS 之外的新经验

AGENTS.md 里已经覆盖了这些通用规则：

- `iframe` / `contentFrame()` / `data-testid` / `waitUntil`
- 失败后看中文步骤和 `error-context.md`
- 先稳定位再改脚本
- 修改后必须实际跑用例

所以这份文件只保留这次实战里额外冒出来、以后最值得优先回想的差分结论。

## 差分 1: 回主页后不要立刻点 `Recall`

这次最稳定的路径不是“返回主页后直接点 `Recall`”，而是：

1. 从点餐页回到主页壳。
2. 先点主页顶栏刷新按钮。
3. 等主页核心功能卡重新稳定显示。
4. 再点 `Recall`。

### 为什么

主页虽然肉眼可见已经回来了，但 DOM 可能还在重绘或残留旧状态。  
不刷新时，`Recall` 入口会出现“看得到、点不稳”的情况。

## 差分 2: `Recall` 搜索前别先急着清条件

这次在 `Recall` 里，`clearAllSearchConditions()` 容易碰到 loading overlay 或筛选重排，导致搜索链路被打断。  
更稳的做法是：

1. 进入 `Recall` 后先确认页面壳已加载。
2. 直接按订单号打开手动搜索。
3. 不要先做清条件。

### 为什么

当前这版 Recall 页面里，默认筛选和 loading 状态会互相影响。  
在“只是为了按订单号搜到订单”的场景里，先清条件反而更不稳定。

## 差分 3: 送厨后先读左上角订单 chip，再做 Recall 搜索

这条链路里，订单号最稳定的来源不是响应体，也不是先等 Recall 列表自己出现，而是：

1. 点击 `Send`。
2. 直接读取点餐页左上角的订单 chip。
3. 回主页。
4. 刷新主页。
5. 进 `Recall`。
6. 用 chip 里的订单号去搜。

### 为什么

左上角 chip 是送厨后最直接、最稳定的订单号来源。  
之前去抓响应体、等默认列表渲染、先清筛选，都比这条路更绕也更脆。

## 本次最终可复用的顺序

```ts
await orderDishesPage.sendOrder();
const orderNumber = await orderDishesPage.readOrderNumberChipText();
await orderDishesPage.returnToHomeShell();

await homePage.clickRefreshButton();
await homePage.expectPrimaryFunctionCardsVisible();
const recallPage = await homePage.clickRecall();
await recallPage.expectLoaded();

await searchRecallOrders(recallPage, {
  clearFirst: false,
  manualSearch: {
    tag: RecallManualSearchTags.orderNumber,
    keyword: orderNumber.replace(/^#/, ''),
  },
});
```

## 这次最重要的提醒

以后如果再次遇到“页面看起来回主页了，但 Recall 进不去”：

- 先怀疑主页还没稳定，不要先加更多复杂 locator。
- 优先试一次主页刷新。
- 别先清 Recall 条件。
- 订单号优先从左上角 chip 取。

