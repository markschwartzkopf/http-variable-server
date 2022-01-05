import { Server } from 'http';
import { EventEmitter } from 'stream';
import { startHttpServer } from './http-server';
import { ServerReplicant } from './replicant';
import { protoHVS } from './types';
import { HVSWS } from './ws-server';

const defaultHttpPort = 9099;
const defaultWsPort = 9098;

export default class HVS implements protoHVS {
  readonly httpPort: number;
  readonly wsPort: number;
  private _ws: HVSWS;
  private _httpServer: Server;
  constructor(staticPath: string, httpPort?: number, wsPort?: number) {
    if (httpPort) {
      this.httpPort = httpPort;
    } else this.httpPort = defaultHttpPort;
    if (wsPort) {
      this.wsPort = wsPort;
    } else this.wsPort = defaultWsPort;
    this._httpServer = startHttpServer(staticPath, this.httpPort, this.wsPort);
    this._ws = new HVSWS(this.wsPort);
  }

  Replicant<T>(name: string): ServerReplicant<T> {
    return new ServerReplicant<T>(name);
  }

  listenFor(message: string, cb: () => void): void {
    console.error('code HVS.listenFor');
  }
  sendMessage(message: string): void {
    console.error('code HVS.sendMessage');
  }
  close(): Promise<void> {
    let isError = false;
    let errs: (Error | undefined)[] = [];
    return new Promise((res, rej) => {
      this._ws.close((err) => {
        errs.push(err);
        if (err) isError = true;
        setTimeout(() => {
          //let httpServer = this._httpServer
          //const httpTerminator = createHttpTerminator({ server: httpServer })
          this._httpServer.close((err) => {
            errs.push(err);
            if (err) isError = true;
            setTimeout(() => {
              if (isError) {
                rej(err);
              } else res();
            }, 500);
          });
        }, 1000);
      });
    });
  }
}
