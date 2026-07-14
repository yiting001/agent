/** 应用逻辑使用的可替换时间源。 */
export interface Clock {
  now(): Date;
}
