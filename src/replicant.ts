import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path/posix';
import { protoReplicant } from './types/index';
import sanitize from 'sanitize-filename';

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
  private _canSave: boolean = true;
  private _filename: string;
  private _name: string;
  constructor(
    name: string,
    allReplicants: { [key: string]: ServerReplicant<any> },
    initValue?: any,
    filename?: string
  ) {
    super();
    this._name = name;
    if (initValue) {
      this._value = initValue;
      this._initialized = true;
    }
    if (filename) {
      this._filename = filename;
    } else {
      this._filename = sanitize(name);
      if (path.basename(name) == name && name != '.' && name != '..')
        if (allReplicants.hasOwnProperty(name)) return allReplicants[name];
      while (
        fs.existsSync(__dirname + '/../replicants/' + this._filename + '.json')
      ) {
        this._filename += '_';
      }
    }
    allReplicants[name] = this;
  }

  private _save() {
    if (this._canSave && this._value != undefined) {
      this._canSave = false;
      const oldVal = this._value;
      fs.writeFile(
        __dirname + '/../replicants/' + this._filename + '.json',
        JSON.stringify({ name: this._name, value: this._value }),
        () => {}
      );
      setTimeout(() => {
        this._canSave = true;
        if (this._value !== oldVal) this._save();
      }, 5000);
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
    //
    this._value = newVal;
    this.emit('change', newVal);
    this._save();
  }
}
