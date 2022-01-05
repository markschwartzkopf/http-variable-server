import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { protoReplicant } from './types/index';

//
//intantiate replicants from files
//

let allReplicants: { [key: string]: ServerReplicant<any> } = {};

export interface ServerReplicant<T> extends protoReplicant<T> {
  on(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this;
  off(
    event: 'change',
    listener: (newValue: Exclude<T, undefined>) => void
  ): this;
  emit(event: 'change', newValue: Exclude<T, undefined>): boolean;
}

export class ServerReplicant<T> extends EventEmitter
  implements protoReplicant<T> {
  private _value: Exclude<T, undefined> | undefined = undefined;
  private _initialized: boolean = false;
  private _saved: boolean = true;
  private _newValBuffer: Exclude<T, undefined>[] = [];
  constructor(name: string) {
    super();
    if (allReplicants.hasOwnProperty(name)) return allReplicants[name];
    allReplicants[name] = this;
    console.log('code replicant recall'); //set _initialized
    console.log('code Replicant.save()');
    /* setInterval(() => {
      this.save();
    }, 5000) */
  }

  save() {
    if (!this._saved) {
      this._saved = true;
      console.error('code Replicant.save()');
    }
  }

  get initialized() {
    return this._initialized;
  }

  get value(): Exclude<T, undefined> {
    if (!this._initialized) throw "Can't get replicant.value before setting it";
    return this._value!;
  }

  set value(newVal: Exclude<T, undefined>) {
    if (newVal == undefined) throw 'Cannot set replicant value to undefined.';
    this._initialized = true;
    if (this._newValBuffer.length == 0) {
      this._newValBuffer.push(newVal);
      this._set();
    } else this._newValBuffer.push(newVal);
  }

  private _set() {
    if (this._newValBuffer.length > 0) {
      let newVal = this._newValBuffer[0];
      if (newVal === this._value) return;
      this._value = newVal;
      this.emit('change', newVal);
      this._newValBuffer.shift();
      this._saved = false;
      this._set();
    }
  }
}
