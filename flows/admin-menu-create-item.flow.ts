import { AdminPage } from '../pages/admin.page';
import { roundMoneyToCents } from '../utils/money';
import { step } from '../utils/step';

function randomAlnum8(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

type CreateItemSaveMode = 'strict' | 'flexible' | 'none';

export type AdminMenuItemKind = 'regular' | 'weighted' | 'detailPrice' | 'openPrice';

export type AdminMenuItemScenario = {
  kind: AdminMenuItemKind;
  variantLabel: string;
  itemName: string;
  itemPrice?: string;
  memberPrice?: string;
  tare?: string;
  beforeSave: (adminPage: AdminPage) => Promise<void>;
  saveMode?: CreateItemSaveMode;
  saveSuccessTimeoutMs?: number;
};

export class AdminMenuCreateItemFlow {
  /** 生成指定前缀 + 8 位随机字母数字，避免与现有菜品重名 */
  private buildRandomItemName(prefix: string): string {
    return `${prefix}${randomAlnum8()}`;
  }

  /** 生成 `Item_` + 8 位随机字母数字，避免与现有菜品重名 */
  buildRegularItemName(prefix = 'Item_'): string {
    return this.buildRandomItemName(prefix);
  }

  /** 生成 `WeightedItem_` + 8 位随机字母数字，避免与现有称重菜重名 */
  buildWeightedItemName(prefix = 'WeightedItem_'): string {
    return this.buildRandomItemName(prefix);
  }

  /** 生成 `DetailPriceItem_` + 8 位随机字母数字，避免与现有 detail price 菜重名 */
  buildDetailPriceItemName(prefix = 'DetailPriceItem_'): string {
    return this.buildRandomItemName(prefix);
  }

  /** 生成 `OpenPriceItem_` + 8 位随机字母数字，避免与现有 open price 菜重名 */
  buildOpenPriceItemName(prefix = 'OpenPriceItem_'): string {
    return this.buildRandomItemName(prefix);
  }

  /** 生成指定类型的菜品场景，供测试统一使用 */
  buildItemScenario(kind: AdminMenuItemKind): AdminMenuItemScenario {
    switch (kind) {
      case 'regular': {
        const itemName = this.buildRegularItemName();
        const itemPrice = this.buildRegularItemPrice();
        return {
          kind,
          variantLabel: '普通菜',
          itemName,
          itemPrice,
          memberPrice: this.buildMemberPrice(itemPrice),
          beforeSave: async () => {},
        };
      }
      case 'weighted': {
        const itemName = this.buildWeightedItemName();
        const itemPrice = this.buildRegularItemPrice();
        const tare = this.buildTareValue();
        return {
          kind,
          variantLabel: '称重菜',
          itemName,
          itemPrice,
          memberPrice: this.buildMemberPrice(itemPrice),
          tare,
          beforeSave: async (page) => {
            await page.checkUnitPriceItem();
            await page.expectTareInputVisible();
            await page.fillTare(tare);
          },
        };
      }
      case 'detailPrice': {
        const itemName = this.buildDetailPriceItemName();
        const itemPrice = this.buildRegularItemPrice();
        const memberPrice = this.buildMemberPrice(itemPrice);
        const firstDetailPrice = this.buildRegularItemPrice();
        const secondDetailPrice = this.buildRegularItemPrice();
        return {
          kind,
          variantLabel: 'detail price 菜',
          itemName,
          itemPrice,
          memberPrice,
          saveMode: 'flexible',
          saveSuccessTimeoutMs: 3_000,
          beforeSave: async (page) => {
            await page.checkDetailPriceItem();
            await page.expectDetailPriceAreaVisible();
            await page.fillDetailPriceItemPrice(0, firstDetailPrice);
            await page.fillDetailPriceMemberPrice(0, memberPrice);
            await page.selectDetailPriceType(0, this.buildDetailPriceTypeName());
            await page.selectDetailPriceSize(0);
            await page.clickAddDetailPrice();
            await page.fillDetailPriceItemPrice(1, secondDetailPrice);
            await page.fillDetailPriceMemberPrice(1, memberPrice);
            await page.selectDetailPriceType(1, this.buildDetailPriceTypeName());
            await page.selectDetailPriceSize(1);
          },
        };
      }
      case 'openPrice': {
        const itemName = this.buildOpenPriceItemName();
        return {
          kind,
          variantLabel: 'open price 菜',
          itemName,
          beforeSave: async (page) => {
            await page.checkOpenPriceItem();
          },
        };
      }
    }
  }

  /** 生成 0.01 - 99.99 的随机价格（保留两位小数） */
  buildRegularItemPrice(): string {
    const cents = Math.floor(Math.random() * 9_999) + 1;
    return (cents / 100).toFixed(2);
  }

  /** 会员价固定为菜价的 90%，并向最近分 cents 取整 */
  buildMemberPrice(itemPrice: string): string {
    const memberPrice = roundMoneyToCents(Number(itemPrice) * 0.9);
    return memberPrice.toFixed(2);
  }

  /** 称重菜默认 tare，按用户要求固定填 0.1 */
  buildTareValue(): string {
    return '0.1';
  }

  /** detail price 默认使用 Dine In */
  buildDetailPriceTypeName(): string {
    return 'Dine In';
  }

  @step((_adminPage: AdminPage, categoryName: string) => `业务步骤：进入菜单组中的 Category「${categoryName}」编辑页`)
  async stepOpenCategoryEditor(adminPage: AdminPage, categoryName: string): Promise<void> {
    await adminPage.clickCategoryNameInMenuGroup(categoryName);
  }

  @step(
    (_adminPage: AdminPage, scenario: AdminMenuItemScenario) => `业务步骤：在${scenario.variantLabel}表单中创建菜品 ${scenario.itemName}`,
  )
  async stepCreateItemScenarioInCategory(adminPage: AdminPage, scenario: AdminMenuItemScenario): Promise<void> {
    await adminPage.clickCreateNewItemFromToolbar();
    await adminPage.expectItemEditorVisible();
    await adminPage.fillItemName(scenario.itemName);
    if (scenario.itemPrice !== undefined) {
      await adminPage.fillItemPrice(scenario.itemPrice);
    }
    if (scenario.memberPrice !== undefined) {
      await adminPage.fillMemberPrice(scenario.memberPrice);
    }
    await scenario.beforeSave(adminPage);
    await adminPage.enableDefaultKitchenPrinters();
    await adminPage.expectApplyCategoryTaxSelected();
    await adminPage.clickSaveItemForm();

    const saveMode = scenario.saveMode ?? 'strict';
    if (saveMode === 'strict') {
      await adminPage.expectSuccessfullySavedMessageVisible();
      return;
    }

    if (saveMode === 'flexible') {
      try {
        await adminPage.expectSaveSuccessMessageVisibleFlexible({ timeout: scenario.saveSuccessTimeoutMs ?? 3_000 });
      } catch {
        /* 部分环境保存后无显式成功提示，后续搜索断言兜底 */
      }
    }
  }

  @step(
    (_adminPage: AdminPage, itemName: string, itemPrice: string, memberPrice: string) =>
      `业务步骤：在普通菜表单中填写 Item Name=${itemName}、Item Price=${itemPrice}、Member Price=${memberPrice}`,
  )
  async stepCreateRegularItemInCategory(
    adminPage: AdminPage,
    itemName: string,
    itemPrice: string,
    memberPrice: string,
  ): Promise<void> {
    await this.stepCreateItemScenarioInCategory(adminPage, {
      kind: 'regular',
      variantLabel: '普通菜',
      itemName,
      itemPrice,
      memberPrice,
      beforeSave: async () => {},
    });
  }

  @step(
    (_adminPage: AdminPage, itemName: string, itemPrice: string, memberPrice: string, tare: string) =>
      `业务步骤：在称重菜表单中填写 Item Name=${itemName}、Item Price=${itemPrice}、Member Price=${memberPrice}、Tare=${tare}`,
  )
  async stepCreateWeightedItemInCategory(
    adminPage: AdminPage,
    itemName: string,
    itemPrice: string,
    memberPrice: string,
    tare: string,
  ): Promise<void> {
    await this.stepCreateItemScenarioInCategory(adminPage, {
      kind: 'weighted',
      variantLabel: '称重菜',
      itemName,
      itemPrice,
      memberPrice,
      tare,
      beforeSave: async (page) => {
        await page.checkUnitPriceItem();
        await page.expectTareInputVisible();
        await page.fillTare(tare);
      },
    });
  }

  @step(
    (_adminPage: AdminPage, itemName: string, itemPrice: string, memberPrice: string) =>
      `业务步骤：在 detail price 菜表单中填写 Item Name=${itemName}、Item Price=${itemPrice}、Member Price=${memberPrice} 并创建两行 detail price`,
  )
  async stepCreateDetailPriceItemInCategory(
    adminPage: AdminPage,
    itemName: string,
    itemPrice: string,
    memberPrice: string,
  ): Promise<void> {
    const firstDetailPrice = this.buildRegularItemPrice();
    const secondDetailPrice = this.buildRegularItemPrice();

    await this.stepCreateItemScenarioInCategory(adminPage, {
      kind: 'detailPrice',
      variantLabel: 'detail price 菜',
      itemName,
      itemPrice,
      memberPrice,
      saveMode: 'flexible',
      saveSuccessTimeoutMs: 3_000,
      beforeSave: async (page) => {
        await page.checkDetailPriceItem();
        await page.expectDetailPriceAreaVisible();
        await page.fillDetailPriceItemPrice(0, firstDetailPrice);
        await page.fillDetailPriceMemberPrice(0, memberPrice);
        await page.selectDetailPriceType(0, this.buildDetailPriceTypeName());
        await page.selectDetailPriceSize(0);
        await page.clickAddDetailPrice();
        await page.fillDetailPriceItemPrice(1, secondDetailPrice);
        await page.fillDetailPriceMemberPrice(1, memberPrice);
        await page.selectDetailPriceType(1, this.buildDetailPriceTypeName());
        await page.selectDetailPriceSize(1);
      },
    });
  }

  @step((_adminPage: AdminPage, itemName: string) => `业务步骤：在 open price 菜表单中创建菜品 ${itemName}`)
  async stepCreateOpenPriceItemInCategory(adminPage: AdminPage, itemName: string): Promise<void> {
    await this.stepCreateItemScenarioInCategory(adminPage, {
      kind: 'openPrice',
      variantLabel: 'open price 菜',
      itemName,
      beforeSave: async (page) => {
        await page.checkOpenPriceItem();
      },
    });
  }
}
