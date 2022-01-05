import { clearInterval } from 'timers';
import WS, { WebSocketServer } from 'ws';
import HVS from '.';
import { ServerReplicant } from './replicant';
import { clientMsg, serverMsg } from './types';

interface hvsWS extends WS {
  isAlive: boolean;
  replicants: { [key: string]: ServerReplicant<any> };
  server: HVSWS;
  hvsSend: (msg: serverMsg) => void;
  unSubs: (() => void)[];
  unsubscribe: () => void;
}

export class HVSWS extends WebSocketServer {
  parentServer: HVS;
  heartbeat: NodeJS.Timer;
  constructor(port: number, parent: HVS, cb?: () => void) {
    super({ port: port }, () => {
      console.log('ws server started');
      if (cb) cb();
    });
    //super({ port: port }, cb);
    this.parentServer = parent;
    this.on('connection', (ws) => {
      init(ws as hvsWS, this);
    });
    this.once('close', () => {
      clearInterval(this.heartbeat);
    });
    this.heartbeat = setInterval(() => {
      this.clients.forEach((ws) => {
        let aWS = ws as hvsWS;
        if (!aWS.isAlive) {
          console.warn('closing unresponsive websocket');
          aWS.unsubscribe();
          ws.terminate();
        }
        aWS.isAlive = false;
        ws.ping();
      });
    }, 3000);
  }
}

function init(ws: hvsWS, server: HVSWS) {
  ws.server = server;
  ws.replicants = {};
  ws.isAlive = true;
  ws.hvsSend = (msg) => {
    ws.send(JSON.stringify(msg));
  };
  ws.unSubs = [];
  ws.unsubscribe = () => {
    for (let i = 0; i < ws.unSubs.length; i++) ws.unSubs[i]();
  };

  ws.on('close', () => {
    ws.unsubscribe();
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    let data: clientMsg | null = null;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.error('bad data from WebSocket client');
    }
    if (data) {
      switch (data.type) {
        case 'msg':
          break;
        case 'newRep':
          const name = data.name;
          if (!ws.replicants.hasOwnProperty(name)) {
            ws.replicants[name] = ws.server.parentServer.Replicant<any>(name);
            if (ws.replicants[name].initialized) {
              ws.hvsSend({
                type: 'rep',
                name: name,
                rep: ws.replicants[name].value,
              });
            }
            let socketListener = (newVal: any) => {
              ws.hvsSend({ type: 'rep', name: name, rep: newVal });
            };
            ws.replicants[name].on('change', socketListener);
            let unsub = () => {
              ws.replicants[name].off('change', socketListener);
            };
            ws.unSubs.push(unsub);
          }
          break;
        case 'rep':
          if (ws.replicants.hasOwnProperty(data.name)) {
            ws.replicants[data.name].value = data.rep;
          } else
            console.error(
              'Client websocket attempting to set unsubscribed replicant'
            );
          break;
      }
    }
  });
}
