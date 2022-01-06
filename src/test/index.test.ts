import puppeteer from 'puppeteer';
import HVS from './../index';
import fs from 'fs';
jest.useRealTimers();
jest.setTimeout(10000);

//delete replicants directory
if (fs.existsSync(__dirname + '/../../replicants'))
  fs.rmSync(__dirname + '/../../replicants', { recursive: true });
let browser: puppeteer.Browser | undefined;
let page: puppeteer.Page | undefined;
let hvs: HVS | undefined;
let consoleVars: { [key: string]: any } = {};
const testFileRep = { name: 'alteredBeast', value: 'Rise from your grave!' };

const sleep = async (ms: number) =>
  await new Promise((res) => setTimeout(res, ms));

describe('Main tests', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
    });
    page = await browser.newPage();
    //There's probably a better way to do this:
    page?.on('console', (t) => {
      let text = t.text();
      try {
        let msg = JSON.parse(text);
        let props = Object.getOwnPropertyNames(msg);
        if (typeof msg == 'object' && props.length == 1) {
          consoleVars[props[0]] = msg[props[0]];
        }
      } catch {}
    });

    await new Promise<void>((res) => {hvs = new HVS(__dirname + '/public/', 9097, 9096, res)})
  });

  test('Replicants should not allow get() of unset value', () => {
    let test = hvs!.Replicant<string>('test1Rep');
    expect(() => {
      let x = test.value;
    }).toThrow();
  });
  test('Replicants should not allow undefined as a value', () => {
    let test = hvs!.Replicant<string>('test1Rep');
    test.value = 'something to make it save a .json file for later tests'
    expect(() => {
      //@ts-ignore
      test.value = undefined;
    }).toThrow();
  });
  test('Replicants should prevent writing to disk too frequently', async () => {
    let test2 = hvs!.Replicant<string>('test2Rep');
    test2.value = 'bad 2nd Value';
    test2.value = '2nd Value';
    await sleep(500);
    //@ts-ignore
    expect(test2._canSave).toBe(false);
  });
  test('Replicants should be restored from disk at startup', async () => {
    await hvs!.close();
    fs.writeFileSync(
      __dirname + '/../../replicants/fileRep.json',
      JSON.stringify(testFileRep)
    );
    await sleep(2000);
    await new Promise<void>((res) => {hvs = new HVS(__dirname + '/public/', 9097, 9096, res)})
    let aBeast = hvs!.Replicant<string>('alteredBeast');
    await sleep(1000)
    expect(aBeast.value).toBe('Rise from your grave!');
  });
  test('HTTP server should serve pages from static directory', async () => {
    await page?.goto('http://localhost:9097/test-page.html');
    await expect(page?.title()).resolves.toBe('http-variable-server test');
  });
  test('HTTP server should appropriately send 404', async () => {
    let page2 = await browser?.newPage();
    await page2?.goto('http://localhost:9097/test-page2.html');
    await page2?.on('response', (resp) => {
      expect(resp.status()).toBe(404)
    })
  });
  test('Browser should be able to instatiate replicants', async () => {

    await sleep(700);
    expect(consoleVars.test3).toBe('1st Value');
  });
  test('Browser should be able to receive existing replicants', async () => {
    expect(consoleVars.test2).toBe('Rise from your grave!');
  });
  //test('messages are sent from server to server')
  //test('messages are sent from server to client')
  //test('messages are sent from client to server')
  test('WS client count should be accurate', async () => {
    expect(hvs?.wsClientCount).toBe(1);
    await sleep(3000)
    await page?.close()
    await sleep(3000)
    expect(hvs?.wsClientCount).toBe(0);
  })
});

afterAll(async () => {
  await browser?.close?.();
  await hvs?.close();
  //await sleep(5000);
});


/* To do:
Implement messaging
Develop testing Node client to
  Send bad data
  ws.terminate() and test the heartbeat
  attempt to set unsubscribed Replicant
 */