import { Controller, Req, Res, All } from "@nestjs/common";
import type { Request, Response } from "express";
import { StaticService } from "../services/static.service";

@Controller()
export class ProxyController {
  constructor(private readonly staticService: StaticService) {}

  // 处理所有 HTTP 方法和路径
  @All("*")
  public proxyAll(@Req() req: Request, @Res() res: Response): void {
    console.log("Reuqest: " + req.url);
    this.staticService.forwardRequest(req, res);
  }
}
