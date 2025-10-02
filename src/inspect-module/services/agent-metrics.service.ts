import { Injectable } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { Socket } from 'net';

@Injectable()
export class AgentMetricsService {
  private staticHttpAgent: http.Agent | null = null;
  private staticHttpsAgent: https.Agent | null = null;

  setStaticAgents(httpAgent: http.Agent, httpsAgent: https.Agent) {
    this.staticHttpAgent = httpAgent;
    this.staticHttpsAgent = httpsAgent;
  }

  private getAgentStatus(httpAgent: http.Agent, httpsAgent: https.Agent) {
    const countSockets = (sockets: NodeJS.ReadOnlyDict<Socket[]>) => {
      if (!sockets) return 0;
      return Object.values(sockets).reduce(
        (count, socketsArray) => count + (socketsArray ? socketsArray.length : 0),
        0
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
    if (!this.staticHttpAgent || !this.staticHttpsAgent) {
      return {
        static: {
          http: { active: 0, idle: 0 },
          https: { active: 0, idle: 0 },
        },
      };
    }

    return {
      static: this.getAgentStatus(this.staticHttpAgent, this.staticHttpsAgent),
    };
  }
}
