import puppeteer from 'puppeteer';
import HVS from './../index';

let browser: puppeteer.Browser | undefined;
let page: puppeteer.Page | undefined;
let hvs: HVS | undefined;
let consoleVars: { [key: string]: any } = {};

const sleep = async (ms: number) =>
  await new Promise((res) => setTimeout(res, ms));

describe('Replicant functionality across server, browser', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
    });
    page = await browser.newPage();

    hvs = new HVS(__dirname + '/public/', 9097, 9096);
    let test2 = hvs.Replicant<string>('test2Rep');
    test2.value = '2nd Value'
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
  });

  it('Should serve pages from static directory', async () => {
    await page?.goto('http://localhost:9097/test-page.html');
    await expect(page?.title()).resolves.toBe('http-variable-server test');
  });
  it('Should be able to instatiate replicants', async () => {
    await sleep(700);
    expect(consoleVars.test3).toBe('1st Value');
  });
  it('Should be able to receive existing replicants', async () => {
    expect(consoleVars.test2).toBe('2nd Value');
  });
});

afterAll(async () => {
  await browser?.close?.();
  await hvs?.close();
});
