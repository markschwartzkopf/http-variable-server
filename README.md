# http-variable-server

This is a minimal http server for providing browser-based control of your Node.js application, along with a basic API for sharing variables and sending messages to the javascript within the page.

## Usage

Instantiate the server:

```
import HVS from 'http-variable-server'; //TypeScript
const HVS = require('http-variable-server'); //JavaScript

/* Start http server on port 8888, pointing to files in the "../public" directory, sending variables/messages via websockets on port 8889 */
const hvs = new HVS(__dirname + '/../public/', 8888, 8889, () => {
  console.log('connected')
});
```


Shared variables are called replicants, and the API of replicants and message sending mimics the API of [NodeCG](https://nodecg.dev), although with more minimal functionality.

Replicant usage, both in the Node application and in the browser:

```
const myRep = hvs.Replicant('myRep');

myRep.on('change', (newValue) => {
    console.log(`myRep changed to ${newValue}`);
});

myRep.value = 'Hello!';
myRep.value = { objects: 'work too!' };
myRep.value = { objects: { can: { be: 'nested!' } } };
myRep.value = ['Even', 'arrays', 'work!'];
```

Message sending, both in the Node application and in the browser:
```
hvs.listenFor('printMessage', (data) => {
  console.log(data)
})

hvs.sendMessage('printMessage', 'dope.');
```