import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // HttpException 交给 Nest 默认逻辑，除非是 204
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // 特殊处理 204
      if ((status as HttpStatus) === HttpStatus.NO_CONTENT) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        return res.status(HttpStatus.NO_CONTENT).send();
      }

      // 其他 HttpException 继续交给 Nest 默认处理
      throw exception;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Internal server error";
    let stack: string | undefined;

    if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      ...(process.env.NODE_ENV !== "production" && stack ? { stack } : {}),
    };

    res.status(status).json(errorResponse);
  }
}
