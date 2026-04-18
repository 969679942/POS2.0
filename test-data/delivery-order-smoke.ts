/**
 * Delivery 冒烟共用：员工口令与外送填单字段（与 `takeout-entry` 中 Delivery 入口示例保持一致）。
 * 若环境地址校验规则变化，请仅在此调整。
 */
export const deliveryOrderSmokeCommon = {
  employeePassword: '11',
  phoneNumber: '1934221992',
  customerName: '解决急急急',
  address: '5611 Jersey Ave',
  street: 'Room 101',
  zipCode: '94061',
  note: '自动化外送备注',
} as const;

/** 供 `startDeliveryOrder` 使用，与 `flows/takeout.flow` 中 `DeliveryOrderParams` 字段一致 */
export function deliverySmokeOrderParams() {
  return {
    phoneNumber: deliveryOrderSmokeCommon.phoneNumber,
    customerName: deliveryOrderSmokeCommon.customerName,
    address: deliveryOrderSmokeCommon.address,
    street: deliveryOrderSmokeCommon.street,
    zipCode: deliveryOrderSmokeCommon.zipCode,
    note: deliveryOrderSmokeCommon.note,
  };
}
