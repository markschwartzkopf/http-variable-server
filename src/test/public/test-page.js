const test1 = hvs.Replicant('test1Rep/');
test1.on('change', (newVal) => {
  console.log(JSON.stringify({ test1: newVal }));
});
const test2 = hvs.Replicant('alteredBeast');
test2.on('change', (newVal) => {
  console.log(JSON.stringify({ test2: newVal }));
});
const test3 = hvs.Replicant('test1Rep/'); //again
test3.on('change', (newVal) => {
  console.log(JSON.stringify({ test3: newVal }));
});

test1.value = '1st Value';
hvs.sendMessage('msgFromClient', '1st msgFromClient');
hvs.listenFor('msgFromServer', (data) => {
  console.log(JSON.stringify({ serverToClient: data }));
});
