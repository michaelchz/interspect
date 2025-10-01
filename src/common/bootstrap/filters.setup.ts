import { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

/**
 * 设置全局过滤器
 */
export const setupFilters = (app: INestApplication): void => {
  app.useGlobalFilters(new AllExceptionsFilter());
};