import { _BrowserReplicant } from "../browser/hvs-browser";

type serverMsg =
  | { type: 'msg'; msg: string; data?: any }
  | { type: 'rep'; name: string; rep: any };
type clientMsg =
  | { type: 'msg'; msg: string; data?: any }
  | { type: 'rep'; name: string; rep: any } //set replicant value
  | { type: 'newRep'; name: string }; //subscribe to replicant updates, (instantiate if needed)

interface protoReplicant<T> {
  on(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this;
  off(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this;
  value: Exclude<T, undefined>;
}

export interface BrowserReplicant<T> extends protoReplicant<T> {
  getValue(): Promise<T>;
}

interface protoHVS {
  listenFor: (message: string, cb: (data?: any) => void) => void;
  sendMessage: (message: string, data?: any) => void;
  Replicant<T>(name: string): protoReplicant<T>;
}

export interface hvsBrowser extends protoHVS {
  Replicant<T>(name: string): BrowserReplicant<T>;
  readonly connected: boolean;
}

interface _hvsBrowser extends hvsBrowser {
  connected: boolean;
  _connector: NodeJS.Timer;
  _hvsWS: WebSocket | null;
  _allReplicants: { [key: string]: _BrowserReplicant<any> };
  _messageCallbacks: { [key: string]: ((data?: any) => void)[] };
  _send: (msg: clientMsg) => void,
}
