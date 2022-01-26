const HVS = require('http-variable-server').default;

const hvs = new HVS(__dirname + '/public/');
const myRep = hvs.Replicant('myRep')
myRep.value = 'Content from Node application'
hvs.listenFor('consoleLogThis', (data) => {
  console.log(data)
})