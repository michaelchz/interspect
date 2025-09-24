import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * 错误处理工具类
 * 提供用于提取错误消息的实用方法，避免 @typescript-eslint/no-unsafe-member-access。
 */
export const ErrorUtils = {
  /**
   * 解析 HttpException 或其他错误为统一响应格式
   * @param error 任意类型的错误
   * @returns 包含 HTTP 状态码与 JSON 消息的对象
   */
  parseHttpErrorResponse(error: unknown): { status: number; message: string } {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      return {
        status: error.getStatus(),
        message:
          typeof response === "string" ? response : JSON.stringify(response),
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: _extractErrorMessage(error),
    };
  },
};

/**
 * 提取错误消息字符串，内部函数
 * @param error 任意类型的错误对象
 * @returns 提取到的错误消息
 */
function _extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "Internal Server Error (Unknown error)";
}
