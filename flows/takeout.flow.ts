import { DeliveryPage } from '../pages/delivery.page';
import { HomePage } from '../pages/home.page';
import { OrderDishesPage } from '../pages/order-dishes.page';
import { PickUpPage } from '../pages/pick-up.page';
import { step } from '../utils/step';

export type PickUpOrderParams = {
  phoneNumber?: string;
  customerName?: string;
  note?: string;
};

export type DeliveryOrderParams = {
  phoneNumber?: string;
  customerName?: string;
  address: string;
  street?: string;
  zipCode?: string;
  note?: string;
};

export class TakeoutFlow {
  @step('业务步骤：从主页点击 To Go 并进入点单页')
  async startToGoOrder(homePage: HomePage): Promise<OrderDishesPage> {
    const orderDishesPage = await homePage.clickToGo();
    await orderDishesPage.expectLoaded();
    return orderDishesPage;
  }

  @step('业务步骤：从主页进入 Pick Up 信息页并完成开始下单')
  async startPickUpOrder(
    homePage: HomePage,
    params: PickUpOrderParams = {},
  ): Promise<OrderDishesPage> {
    const pickUpPage = await homePage.clickPickUp();
    await pickUpPage.expectVisible();
    await this.fillPickUpInformation(pickUpPage, params);

    const orderDishesPage = await pickUpPage.clickStartOrder();
    await orderDishesPage.expectLoaded();
    return orderDishesPage;
  }

  @step('业务步骤：从主页进入 Delivery 信息页并完成开始下单')
  async startDeliveryOrder(
    homePage: HomePage,
    params: DeliveryOrderParams,
  ): Promise<OrderDishesPage> {
    const deliveryPage = await homePage.clickDelivery();
    await deliveryPage.expectVisible();
    await this.fillDeliveryInformation(deliveryPage, params);

    const orderDishesPage = await deliveryPage.clickStartOrder();
    await orderDishesPage.expectLoaded();
    return orderDishesPage;
  }

  @step('业务步骤：按需填写 Pick Up 信息页中的可选字段')
  private async fillPickUpInformation(
    pickUpPage: PickUpPage,
    params: PickUpOrderParams,
  ): Promise<void> {
    const { phoneNumber, customerName, note } = params;

    if (phoneNumber !== undefined) {
      await pickUpPage.fillPhoneNumber(phoneNumber);
    }

    if (customerName !== undefined) {
      await pickUpPage.fillCustomerName(customerName);
    }

    if (note !== undefined) {
      await pickUpPage.fillNote(note);
    }
  }

  @step('业务步骤：按需填写 Delivery 信息页中的字段并保留地址为必填')
  private async fillDeliveryInformation(
    deliveryPage: DeliveryPage,
    params: DeliveryOrderParams,
  ): Promise<void> {
    const { phoneNumber, customerName, address, street, zipCode, note } = params;

    if (phoneNumber !== undefined) {
      await deliveryPage.fillPhoneNumber(phoneNumber);
    }

    if (customerName !== undefined) {
      await deliveryPage.fillCustomerName(customerName);
    }

    await deliveryPage.fillAddress(address);

    if (street !== undefined) {
      await deliveryPage.fillStreet(street);
    }

    if (zipCode !== undefined) {
      await deliveryPage.fillZipCode(zipCode);
    }

    if (note !== undefined) {
      await deliveryPage.fillNote(note);
    }
  }
}

export async function startToGoOrder(homePage: HomePage): Promise<OrderDishesPage> {
  const takeoutFlow = new TakeoutFlow();
  return await takeoutFlow.startToGoOrder(homePage);
}

export async function startPickUpOrder(
  homePage: HomePage,
  params: PickUpOrderParams = {},
): Promise<OrderDishesPage> {
  const takeoutFlow = new TakeoutFlow();
  return await takeoutFlow.startPickUpOrder(homePage, params);
}

export async function startDeliveryOrder(
  homePage: HomePage,
  params: DeliveryOrderParams,
): Promise<OrderDishesPage> {
  const takeoutFlow = new TakeoutFlow();
  return await takeoutFlow.startDeliveryOrder(homePage, params);
}
