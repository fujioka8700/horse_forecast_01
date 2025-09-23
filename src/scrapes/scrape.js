import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    // Docker内で実行するための引数
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // Chromiumの実行可能パスを指定
    executablePath: '/usr/bin/chromium',
  });
  const page = await browser.newPage();

  await page.goto('https://example.com');
  const title = await page.title();
  console.log(`ページタイトル: ${title}`);

  await browser.close();
})();
