// Generates Anchor app icons (512 / 192 / apple-touch 180) with Puppeteer.
// Dusk-study palette: charcoal #17130e, sage #aab98e, sand #e6c98f, Fraunces face.
// Run from the project root: node "Therapy App/icons/gen-icons.mjs"
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const fraunces = readFileSync(join(here, '..', 'fonts', 'Fraunces.woff2')).toString('base64');

const html = `<!DOCTYPE html><html><head><style>
  @font-face{font-family:'Fraunces';src:url(data:font/woff2;base64,${fraunces}) format('woff2');font-weight:100 900}
  *{margin:0;padding:0}
  body{width:512px;height:512px;overflow:hidden}
  .tile{
    width:512px;height:512px;position:relative;
    background:
      radial-gradient(120% 75% at 50% -12%, rgba(109,125,82,.4), transparent 55%),
      radial-gradient(110% 70% at 80% 115%, rgba(230,201,143,.16), transparent 58%),
      #17130e;
    display:flex;align-items:center;justify-content:center;
  }
  /* the anchor mark: a Fraunces "a" resting on a ground line */
  .a{
    font-family:'Fraunces',serif;font-weight:500;font-size:300px;line-height:1;
    color:#e6c98f;letter-spacing:-0.04em;
    text-shadow:0 0 110px rgba(230,201,143,.45);
    margin-top:-46px;
  }
  .ground{
    position:absolute;left:106px;right:106px;top:388px;height:12px;border-radius:8px;
    background:#aab98e;box-shadow:0 0 40px rgba(170,185,142,.6);
  }
  .dot{
    position:absolute;top:352px;left:50%;transform:translateX(88px);
    width:26px;height:26px;border-radius:50%;background:#aab98e;
    box-shadow:0 0 30px rgba(170,185,142,.7);
  }
</style></head><body>
  <div class="tile"><div class="a">a</div><div class="ground"></div><div class="dot"></div></div>
</body></html>`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');

for (const [size, name] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']]) {
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: size / 512 });
  await page.screenshot({ path: join(here, name), clip: { x: 0, y: 0, width: 512, height: 512 } });
  console.log('wrote', name, `${size}x${size}`);
}
await browser.close();
