

import { BrowserReplicant, clientMsg, serverMsg, _hvsBrowser } from '../types/';

const hvs: _hvsBrowser = {
  connected: false,
  _connector: setTimeout(() => {}),
  _hvsWS: null,
  _allReplicants: {},
  _messageCallbacks: {},
  _send: (msg: clientMsg) => {
    if (hvs._hvsWS) {
      let delay = 500;
      if (hvs._hvsWS.readyState == 1) delay = 0;
      setTimeout(() => {
        if (hvs._hvsWS && hvs._hvsWS.readyState == 1)
          hvs._hvsWS.send(JSON.stringify(msg));
      }, delay);
    }
  },
  listenFor: (msg: string, cb: (data: any) => void) => {
    if (hvs._messageCallbacks.hasOwnProperty(msg)) {
      hvs._messageCallbacks.msg.push(cb);
    } else hvs._messageCallbacks.msg = [cb];
  },
  sendMessage: (msg: string, data?: any) => {
    let clientMsg: clientMsg = {type: 'msg', msg: msg}
    if (data) clientMsg.data = data;
    hvs._send(clientMsg)
  },
  Replicant<T>(name: string): BrowserReplicant<T> {
    return new _BrowserReplicant(name);
  },
};

export class _BrowserReplicant<T> implements BrowserReplicant<T> {
  private _value: Exclude<T, undefined> | undefined = undefined;
  private _initialized: boolean = false;
  private _changeListeners: ((newValue: Exclude<T, undefined>) => void)[] = [];
  private _name: string;
  constructor(name: string) {
    this._name = name;
    if (hvs._allReplicants.hasOwnProperty(name))
      return hvs._allReplicants[name];
    hvs._allReplicants[name] = this;
    hvs._send({ type: 'newRep', name: name });
  }
  on(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this {
    this._changeListeners.push(listener);
    return this;
  }
  off(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this {
    let index = this._changeListeners.indexOf(listener);
    if (index != -1) this._changeListeners.splice(index, 1);
    return this;
  }
  get value(): Exclude<T, undefined> {
    if (!this._initialized)
      throw 'Cannot access replicant value before it is initialized. Use promise getValue()';
    return this._value!;
  }
  set value(newVal: Exclude<T, undefined>) {
    this._value = newVal;
    hvs._send({ type: 'rep', name: this._name, rep: newVal });
  }
  getValue(): Promise<T> {
    console.log('getValue called');
    return new Promise((res, rej) => {
      if (this._initialized) {
        res(this._value!);
      } else {
        let once = (newVal: T) => {
          res(newVal);
          this.off('change', once);
        };
        this.on('change', once);
        setTimeout(() => {
          rej('getValue failed for replicant ' + this._name);
        }, 5000);
      }
    });
  }
  _serverChange(newVal: Exclude<T, undefined>) {
    this._initialized = true;
    this._value = newVal;
    for (let i = 0; i < this._changeListeners.length; i++) {
      this._changeListeners[i](newVal);
    }
  }
}

function _connectToServer() {
  if (hvs._hvsWS) {
    console.error('Unexpected HVS race error');
    return;
  } else {
    console.log('Connectiong to server websocket');
  }
  hvs._connector = setTimeout(() => {
    if (!hvs.connected) {
      console.error('Websocket connection failed, retrying');
      setTimeout(() => {
        if (hvs._hvsWS) hvs._hvsWS.close();
        hvs._hvsWS = null;
        _connectToServer();
      }, 2000);
    }
  }, 5000);
  hvs._hvsWS = new WebSocket(
    
    'ws://' +
      new URL('http://' + window.location.host).hostname +
      ':' + //@ts-ignore This constant is declared in inline HTML script tag
      __wsPort
  );
  hvs._hvsWS.onopen = () => {
    clearTimeout(hvs._connector);
    hvs.connected = true;
    console.log('Connection to server open');
    hvs._hvsWS!.onclose = () => {
      console.log('Disconnected from server');
      hvs.connected = false;
      setTimeout(() => {
        hvs._hvsWS = null;
        _connectToServer();
      }, 2000);
    };
  };
  hvs._hvsWS.onerror = (err) => {
    if (hvs.connected) console.error(err);
  };
  hvs._hvsWS.onmessage = (e) => {
    let data: serverMsg | null = null;
    try {
      data = JSON.parse(e.data);
    } catch (err) {
      console.error('bad data from WebSocket server');
    }
    if (data) {
      switch (data.type) {
        case 'msg':
          break;
        case 'rep':
          if (hvs._allReplicants[data.name]) {
            hvs._allReplicants[data.name]._serverChange(data.rep);
          }
          break;
      }
    }
  };
}
_connectToServer();