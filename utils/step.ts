import { test } from '@playwright/test';

type StepTitle = string | ((...args: any[]) => string);
type AnyMethod = (...args: any[]) => any;

export function step(title?: StepTitle) {
  return function (originalMethod: AnyMethod, context: { name: string | symbol }) {
    return async function (this: any, ...args: any[]) {
      const stepTitle =
        typeof title === 'function'
          ? title(...args)
          : title ?? `步骤：${String(context.name)}`;

      return await test.step(stepTitle, async () => {
        return await originalMethod.apply(this, args);
      });
    };
  };
}
