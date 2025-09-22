import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import dbConnect from '../lib/dbConnect.js';
import Race from '../models/Race.js';

const scrapeAndSave = async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath:
        '/usr/bin/chromium' /** chromiumを使用するため、このコードは削除しない */,
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    );

    console.log('Navigating to page...');
    await page.goto(
      'https://db.netkeiba.com/?pid=race_list&word=&start_year=1975&start_mon=none&end_year=none&end_mon=none&kyori_min=&kyori_max=&sort=date&list=20',
      { waitUntil: 'domcontentloaded', timeout: 90000 },
    );

    console.log('Waiting for selector...');
    await page.waitForSelector('.nk_tb_common.race_table_01', {
      timeout: 60000,
    });

    console.log('Scraping data for all races...');
    const racesData = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('.nk_tb_common.race_table_01 tbody tr'),
      );
      const races = [];
      let currentDate = '';
      let currentVenue = '';

      // ヘッダー行を除外してループ
      for (const row of rows.slice(1)) {
        const columns = Array.from(row.querySelectorAll('td'));
        let date, venue, weather, raceNameCell, distance, trackCondition;

        // rowspanを考慮して日付と開催地を決定
        if (columns.length > 12) {
          // 通常の行（日付セルあり）
          date = columns[0]?.innerText.trim();
          venue = columns[1]?.innerText.trim();
          weather = columns[2]?.innerText.trim();
          raceNameCell = columns[4];
          distance = columns[6]?.innerText.trim();
          trackCondition = columns[8]?.innerText.trim();
          currentDate = date;
          currentVenue = venue;
        } else {
          // rowspanで日付セルが省略された行
          date = currentDate;
          venue = currentVenue;
          weather = columns[0]?.innerText.trim();
          raceNameCell = columns[2];
          distance = columns[4]?.innerText.trim();
          trackCondition = columns[6]?.innerText.trim();
        }

        const raceLink = raceNameCell?.querySelector('a');
        const raceHref = raceLink ? raceLink.href : '';
        const raceIdMatch = raceHref.match(/race\/(\d+)/);
        if (!raceIdMatch) continue; // race_idがなければスキップ

        const race_id = raceIdMatch[1];
        const turf_or_dirt = distance ? distance.charAt(0) : null;
        const distNum = distance ? parseInt(distance.substring(1), 10) : null;

        races.push({
          race_id: race_id,
          raw_date: date,
          course_name: venue ? venue + '競馬場' : null,
          distance: distNum,
          turf_or_dirt: turf_or_dirt,
          weather: weather,
          track_condition: trackCondition,
        });
      }
      return races;
    });

    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }

    if (!racesData || racesData.length === 0) {
      console.log('No race data found.');
      return;
    }

    console.log(`Scraped ${racesData.length} races. Saving to database...`);

    await dbConnect();
    console.log('Connected to database.');

    for (const raceData of racesData) {
      if (!raceData.race_id) continue;

      if (raceData.raw_date) {
        raceData.race_date = new Date(raceData.raw_date.replace(/\//g, '-'));
        delete raceData.raw_date;
      }

      const result = await Race.updateOne(
        { race_id: raceData.race_id },
        { $set: raceData },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(` -> Inserted new race: ${raceData.race_id}`);
      } else if (result.modifiedCount > 0) {
        console.log(` -> Updated existing race: ${raceData.race_id}`);
      } else {
        // console.log(` -> Race data is already up to date: ${raceData.race_id}`);
      }
    }
    console.log('All race data has been processed.');

  } catch (error) {
    console.error('An error occurred:', error);
    if (browser) {
      await browser.close();
      console.log('Browser closed due to an error.');
    }
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

scrapeAndSave();
