import { Inject, Injectable } from "@nestjs/common";
import * as http from "http";
import * as https from "https";
import { Socket } from "net";

@Injectable()
export class AgentMetricsService {
  constructor(
    @Inject("STATIC_HTTP_AGENT")
    private readonly staticHttpAgent: http.Agent,
    @Inject("STATIC_HTTPS_AGENT")
    private readonly staticHttpsAgent: https.Agent,
  ) {}

  private getAgentStatus(httpAgent: http.Agent, httpsAgent: https.Agent) {
    const countSockets = (sockets: NodeJS.ReadOnlyDict<Socket[]>) => {
      if (!sockets) return 0;
      return Object.values(sockets).reduce(
        (count, socketsArray) =>
          count + (socketsArray ? socketsArray.length : 0),
        0,
      );
    };

    return {
      http: {
        active: countSockets(httpAgent.sockets),
        idle: countSockets(httpAgent.freeSockets),
      },
      https: {
        active: countSockets(httpsAgent.sockets),
        idle: countSockets(httpsAgent.freeSockets),
      },
    };
  }

  public getAllAgentStatuses() {
    return {
      static: this.getAgentStatus(this.staticHttpAgent, this.staticHttpsAgent),
    };
  }
}
