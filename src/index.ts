import fs from 'fs';
import http from 'http';

import { startHttpServer } from './http-server';
import { ServerReplicant } from './replicant';
import { protoHVS } from './types';
import { HVSWS } from './ws-server';

const defaultHttpPort = 9099;
const defaultWsPort = 9098;

export default class HVS implements protoHVS {
  readonly httpPort: number;
  readonly wsPort: number;
  private msgEventHandlers: { [key: string]: ((data?: any) => void)[] } = {};
  private _ws: HVSWS | null = null;
  private _httpServer: http.Server | null = null;
  private _allReplicants: { [key: string]: ServerReplicant<any> } = {};
  constructor(
    staticPath: string,
    httpPort?: number,
    wsPort?: number,
    cb?: () => void
  ) {
    /* istanbul ignore else */
    if (httpPort) {
      this.httpPort = httpPort;
    } else this.httpPort = defaultHttpPort;
    /* istanbul ignore else */
    if (wsPort) {
      this.wsPort = wsPort;
    } else this.wsPort = defaultWsPort;
    Promise.all([
      new Promise<void>((res) => {
        this._httpServer = startHttpServer(
          staticPath,
          this.httpPort,
          this.wsPort,
          res
        );
      }),
      new Promise<void>((res) => {
        this._ws = new HVSWS(this.wsPort, this, this.msgEventHandlers, res);
      }),
      this._loadReplicantsFromFiles(),
    ])
      .then(cb)
      .catch(/* istanbul ignore next */ (err) => console.log(err));
  }

  get wsClientCount(): number {
    return this._ws!.clients.size;
  }

  Replicant<T>(name: string): ServerReplicant<T> {
    return new ServerReplicant<T>(name, this._allReplicants);
  }

  listenFor(msg: string, cb: (data: any) => void): void {
    if (this.msgEventHandlers.hasOwnProperty(msg)) {
      this.msgEventHandlers[msg].push(cb);
    } else {
      this.msgEventHandlers[msg] = [cb];
    }
  }

  unlisten(msg: string, cb: (data: any) => void): void {
    if (this.msgEventHandlers[msg]) {
      let index = this.msgEventHandlers[msg].indexOf(cb);
      if (index != -1) this.msgEventHandlers[msg].splice(index, 1);
    }
  }

  sendMessage(msg: string, data?: any): void {
    if (this.msgEventHandlers.hasOwnProperty(msg)) {
      for (let i = 0; i < this.msgEventHandlers[msg].length; i++) {
        this.msgEventHandlers[msg][i](data);
      }
    }
  }

  close(): Promise<void> {
    let isError = false;
    let errs: (Error | undefined)[] = [];
    return new Promise((res, rej) => {
      this._ws!.close((err) => {
        errs.push(err);
        if (err) isError = true;
        setTimeout(() => {
          //let httpServer = this._httpServer
          //const httpTerminator = createHttpTerminator({ server: httpServer })
          this._httpServer!.close((err) => {
            errs.push(err);
            if (err) isError = true;
            setTimeout(() => {
              if (isError) {
                /* istanbul ignore next */
                rej(err);
              } else res();
            }, 500);
          });
        }, 1000);
      });
    });
  }

  private _loadReplicantsFromFiles(): Promise<void> {
    return new Promise((res1, rej1) => {
      if (!fs.existsSync(__dirname + '/../replicants')) {
        fs.mkdirSync(__dirname + '/../replicants');
        res1();
      } else {
        fs.readdir(__dirname + '/../replicants', (err, repFiles) => {
          if (err) {
            /* istanbul ignore next */
            rej1("Can't read replicants directory");
          } else {
            let readfilePromises: Promise<void>[] = [];
            for (let i = 0; i < repFiles.length; i++) {
              if (repFiles[i].slice(-4) == 'json') {
                readfilePromises.push(
                  new Promise((res2, rej2) => {
                    fs.readFile(
                      __dirname + '/../replicants/' + repFiles[i],
                      (err, buf) => {
                        try {
                          let fileRep = JSON.parse(buf.toString());
                          let rep = new ServerReplicant<any>(
                            fileRep.name,
                            this._allReplicants,
                            fileRep.value,
                            repFiles[i].slice(0, -5)
                          );
                          res2();
                        } catch {
                          /* istanbul ignore next */
                          rej2('Corrupted replicant storage file');
                        }
                      }
                    );
                  })
                );
              }
            }
            Promise.all(readfilePromises)
              .then(() => {
                res1();
              })
              .catch((err) => {
                /* istanbul ignore next */
                rej1(err);
              });
          }
        });
      }
    });
  }
}
