import { OrderDishesPage } from '../pages/order-dishes.page';
import { step } from '../utils/step';

export type ComboSectionSelection = string | Record<string, number>;

export type ComboSelections = Record<string, ComboSectionSelection>;

export interface DishOrderParams {
  dishName: string;
  quantity?: number;
  weight?: number;
  price?: number;
  specifications?: string[];
  comboSelections?: ComboSelections;
}

export class OrderDishesFlow {
  @step('业务步骤：添加普通菜品到购物车')
  async addRegularDish(
    orderDishesPage: OrderDishesPage,
    dishName: string,
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickDish(dishName);
    await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
  }

  @step('业务步骤：添加第一个可用菜品到购物车')
  async addFirstAvailableDish(orderDishesPage: OrderDishesPage): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickFirstAvailableDish();
  }

  @step('业务步骤：添加称重菜品到购物车')
  async addWeightedDish(
    orderDishesPage: OrderDishesPage,
    dishName: string,
    weight: number,
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickDish(dishName);
    await orderDishesPage.enterWeightInDialog(weight);
    await orderDishesPage.confirmWeightDialog();
    await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
  }

  @step('业务步骤：添加套餐菜品到购物车')
  async addComboDish(
    orderDishesPage: OrderDishesPage,
    dishName: string,
    selections: ComboSelections,
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickDish(dishName);

    // 固定套餐等场景可能点击后直接入购物车，不会弹出套餐选择层。
    if (!(await orderDishesPage.isComboDialogVisible())) {
      await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
      return;
    }

    for (const [sectionName, sectionSelection] of Object.entries(selections)) {
      if (typeof sectionSelection === 'string') {
        await orderDishesPage.selectComboSectionItem(sectionName, sectionSelection);
        continue;
      }

      for (const [sectionDishName, sectionDishQuantity] of Object.entries(sectionSelection)) {
        if (sectionDishQuantity < 1) {
          continue;
        }

        await orderDishesPage.selectComboSectionItem(
          sectionName,
          sectionDishName,
          sectionDishQuantity,
        );
      }
    }

    await orderDishesPage.satisfyMandatoryComboSelectionsIfNeeded();
    await orderDishesPage.confirmComboDialog();
    await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
  }

  @step('业务步骤：在点单页搜索关键字并在结果中添加一条规格菜')
  async searchAndAddSpecDish(
    orderDishesPage: OrderDishesPage,
    keyword: string,
    dishButtonName: string,
    specifications: string[],
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.openDishSearchPanel();
    await orderDishesPage.applyDishSearchKeyword(keyword);
    await orderDishesPage.expectDishSearchResultVisible(dishButtonName);
    await this.addSpecDish(orderDishesPage, dishButtonName, specifications, quantity);
  }

  @step('业务步骤：添加规格菜品到购物车')
  async addSpecDish(
    orderDishesPage: OrderDishesPage,
    dishName: string,
    specifications: string[],
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickDish(dishName);

    if (await orderDishesPage.isSpecificationDialogVisible()) {
      for (const spec of specifications) {
        await orderDishesPage.selectSpecification(spec);
      }

      await orderDishesPage.confirmSpecificationDialog();
    }

    await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
  }

  @step('业务步骤：添加开价菜品到购物车')
  async addOpenPriceDish(
    orderDishesPage: OrderDishesPage,
    dishName: string,
    price: number,
    quantity: number = 1,
  ): Promise<void> {
    await orderDishesPage.expectLoaded();
    await orderDishesPage.clickDish(dishName);
    await this.adjustQuantityIfNeeded(orderDishesPage, quantity);
    await orderDishesPage.enterPrice(price);
    await orderDishesPage.confirmPriceDialog();
  }

  @step('业务步骤：通用添加菜品到购物车')
  async addDishToCart(
    orderDishesPage: OrderDishesPage,
    params: DishOrderParams,
  ): Promise<void> {
    const { dishName, quantity = 1, weight, price, specifications, comboSelections } = params;

    if (weight !== undefined) {
      await this.addWeightedDish(orderDishesPage, dishName, weight, quantity);
      return;
    }

    if (price !== undefined) {
      await this.addOpenPriceDish(orderDishesPage, dishName, price, quantity);
      return;
    }

    if (specifications && specifications.length > 0) {
      await this.addSpecDish(orderDishesPage, dishName, specifications, quantity);
      return;
    }

    if (comboSelections && Object.keys(comboSelections).length > 0) {
      await this.addComboDish(orderDishesPage, dishName, comboSelections, quantity);
      return;
    }

    await this.addRegularDish(orderDishesPage, dishName, quantity);
  }

  @step(
    (_orderDishesPage: OrderDishesPage, quantity: number) =>
      quantity === 1 ? '业务步骤：保持默认点餐数量 1' : `业务步骤：将点餐数量切换为 ${quantity}`,
  )
  private async adjustQuantityIfNeeded(
    orderDishesPage: OrderDishesPage,
    quantity: number,
  ): Promise<void> {
    if (quantity === 1) {
      return;
    }

    await orderDishesPage.changeDishCount(quantity);
  }
}

export async function addRegularDish(
  orderDishesPage: OrderDishesPage,
  dishName: string,
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addRegularDish(orderDishesPage, dishName, quantity);
}

export async function addFirstAvailableDish(orderDishesPage: OrderDishesPage): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addFirstAvailableDish(orderDishesPage);
}

export async function addWeightedDish(
  orderDishesPage: OrderDishesPage,
  dishName: string,
  weight: number,
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addWeightedDish(orderDishesPage, dishName, weight, quantity);
}

export async function addComboDish(
  orderDishesPage: OrderDishesPage,
  dishName: string,
  selections: ComboSelections,
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addComboDish(orderDishesPage, dishName, selections, quantity);
}

export async function addSpecDish(
  orderDishesPage: OrderDishesPage,
  dishName: string,
  specifications: string[],
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addSpecDish(orderDishesPage, dishName, specifications, quantity);
}

export async function searchAndAddSpecDish(
  orderDishesPage: OrderDishesPage,
  keyword: string,
  dishButtonName: string,
  specifications: string[],
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.searchAndAddSpecDish(orderDishesPage, keyword, dishButtonName, specifications, quantity);
}

export async function addOpenPriceDish(
  orderDishesPage: OrderDishesPage,
  dishName: string,
  price: number,
  quantity: number = 1,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addOpenPriceDish(orderDishesPage, dishName, price, quantity);
}

export async function addDishToCart(
  orderDishesPage: OrderDishesPage,
  params: DishOrderParams,
): Promise<void> {
  const flow = new OrderDishesFlow();
  await flow.addDishToCart(orderDishesPage, params);
}
