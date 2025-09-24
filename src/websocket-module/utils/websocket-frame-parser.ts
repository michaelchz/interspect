import { Logger } from "@nestjs/common";

/**
 * WebSocket 帧解析器
 * 用于解析 TCP 流中的 WebSocket 帧
 */
export class WebSocketFrameParser {
  private readonly logger = new Logger(WebSocketFrameParser.name);
  private buffer: Buffer = Buffer.alloc(0);
  private readonly maskBuffer = Buffer.alloc(4);
  private fragmentedMessage: {
    type: string | null;
    fragments: Buffer[];
  } | null = null;

  /**
   * 解析 WebSocket 帧
   */
  parse(data: Buffer): { messages: unknown[]; remaining: Buffer } {
    // 将新数据添加到缓冲区
    this.buffer = Buffer.concat([this.buffer, data]);
    const messages: unknown[] = [];

    while (this.buffer.length >= 2) {
      // 解析帧头
      const byte1 = this.buffer[0];
      const byte2 = this.buffer[1];

      const fin = (byte1 & 0x80) !== 0;
      const opcode = byte1 & 0x0f;
      const masked = (byte2 & 0x80) !== 0;
      let payloadLength = byte2 & 0x7f;

      let offset = 2;

      // 处理扩展的 payload 长度
      if (payloadLength === 126) {
        if (this.buffer.length < offset + 2) break;
        payloadLength = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (this.buffer.length < offset + 8) break;
        payloadLength = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      // 处理掩码
      if (masked) {
        if (this.buffer.length < offset + 4) break;
        this.buffer.copy(this.maskBuffer, 0, offset, offset + 4);
        offset += 4;
      }

      // 检查是否有完整的 payload
      if (this.buffer.length < offset + payloadLength) break;

      // 提取 payload
      const payload = this.buffer.subarray(offset, offset + payloadLength);

      // 如果有掩码，需要解码
      if (masked) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= this.maskBuffer[i % 4];
        }
      }

      // 处理分片消息
      if (opcode === 0x00) {
        // 继续帧
        if (this.fragmentedMessage) {
          this.fragmentedMessage.fragments.push(payload);
        }
      } else {
        // 开始新的消息
        if (fin && this.fragmentedMessage) {
          // 上一条分片消息结束，先处理
          const fullPayload = Buffer.concat(this.fragmentedMessage.fragments);
          this.processCompleteMessage(
            this.fragmentedMessage.type,
            fullPayload,
            messages,
          );
          this.fragmentedMessage = null;
        }

        if (!fin) {
          // 开始新的分片消息
          this.fragmentedMessage = {
            type: this.getMessageType(opcode),
            fragments: [payload],
          };
        } else {
          // 完整的单帧消息
          this.processCompleteMessage(
            this.getMessageType(opcode),
            payload,
            messages,
          );
        }
      }

      // 如果是 FIN 帧且有分片消息，处理分片消息
      if (fin && this.fragmentedMessage && opcode !== 0x00) {
        const fullPayload = Buffer.concat(this.fragmentedMessage.fragments);
        this.processCompleteMessage(
          this.fragmentedMessage.type,
          fullPayload,
          messages,
        );
        this.fragmentedMessage = null;
      }

      // 移除已处理的数据
      this.buffer = this.buffer.subarray(offset + payloadLength);
    }

    return { messages, remaining: this.buffer };
  }

  /**
   * 获取消息类型
   */
  private getMessageType(opcode: number): string | null {
    switch (opcode) {
      case 0x01:
        return "text";
      case 0x02:
        return "binary";
      default:
        return null;
    }
  }

  /**
   * 处理完整的消息
   */
  private processCompleteMessage(
    type: string | null,
    payload: Buffer,
    messages: unknown[],
  ) {
    if (!type) return;

    if (type === "text") {
      try {
        const content = payload.toString("utf8");
        // 尝试解析 JSON 以获取 MessageType
        let messageType = "Unknown";
        try {
          const parsed = JSON.parse(content) as { MessageType?: string };
          messageType = parsed.MessageType || "Unknown";
        } catch {
          // 不是 JSON，显示原始内容
        }

        messages.push({
          type: "text",
          opcode: "TEXT",
          content,
          messageType,
          size: payload.length,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // UTF-8 解析失败，当作二进制处理
        messages.push({
          type: "binary",
          opcode: "BINARY",
          size: payload.length,
          error: "UTF-8 decode failed",
          timestamp: new Date().toISOString(),
        });
      }
    } else if (type === "binary") {
      messages.push({
        type: "binary",
        opcode: "BINARY",
        size: payload.length,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 重置解析器状态
   */
  reset() {
    this.buffer = Buffer.alloc(0);
    this.fragmentedMessage = null;
  }
}
