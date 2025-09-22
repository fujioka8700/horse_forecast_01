import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    // Docker内で実行するための引数
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // Chromiumの実行可能パスを指定
    executablePath: '/usr/bin/chromium',
  });
  const page = await browser.newPage();

  // ユーザーエージェントを設定
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  );

  await page.goto(
    'https://db.netkeiba.com/?pid=race_list&word=&start_year=1975&start_mon=none&end_year=none&end_mon=none&kyori_min=&kyori_max=&sort=date&list=20',
    { waitUntil: 'networkidle2', timeout: 60000 }, // タイムアウトを60秒に延長
  );

  // レースリストのテーブルが表示されるまで待機（タイムアウトを60秒に延長）
  await page.waitForSelector('.nk_tb_common.race_table_01', { timeout: 60000 });

  // evaluate内ではシリアライズ可能なデータのみを返す
  const latestRaceData = await page.evaluate(() => {
    const dataRow = document.querySelector(
      '.nk_tb_common.race_table_01 tbody tr:nth-child(2)',
    );
    if (!dataRow) return null;

    const columns = dataRow.querySelectorAll('td');
    if (columns.length < 9) {
      return null;
    }

    const raceLink = columns[4]?.querySelector('a');
    const raceHref = raceLink ? raceLink.href : '';
    const raceIdMatch = raceHref.match(/race\/(\d+)/);
    const race_id = raceIdMatch ? raceIdMatch[1] : null;

    const distanceStr = columns[6]?.innerText.trim();
    const turf_or_dirt = distanceStr ? distanceStr.charAt(0) : null;
    const distance = distanceStr
      ? parseInt(distanceStr.substring(1), 10)
      : null;

    return {
      race_id: race_id,
      raw_date: columns[0]?.innerText.trim(), // 日付は文字列で返す
      course_name: columns[1]?.innerText
        ? columns[1].innerText.trim() + '競馬場'
        : null,
      distance: distance,
      turf_or_dirt: turf_or_dirt,
      weather: columns[2]?.innerText.trim(),
      track_condition: columns[8]?.innerText.trim(),
    };
  });

  // Node.js側でDateオブジェクトに変換
  if (latestRaceData && latestRaceData.raw_date) {
    latestRaceData.race_date = new Date(
      latestRaceData.raw_date.replace(/\//g, '-'),
    );
    delete latestRaceData.raw_date; // 不要なプロパティを削除
  }

  console.log('整形後のレース情報:', latestRaceData);

  await browser.close();
})();
