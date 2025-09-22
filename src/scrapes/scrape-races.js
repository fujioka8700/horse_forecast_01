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
      { waitUntil: 'domcontentloaded', timeout: 90000 }, // 待機条件を変更し、タイムアウトを90秒に延長
    );

    console.log('Waiting for selector...');
    await page.waitForSelector('.nk_tb_common.race_table_01', {
      timeout: 60000,
    });

    console.log('Scraping data...');
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
        raw_date: columns[0]?.innerText.trim(),
        course_name: columns[1]?.innerText
          ? columns[1].innerText.trim() + '競馬場'
          : null,
        distance: distance,
        turf_or_dirt: turf_or_dirt,
        weather: columns[2]?.innerText.trim(),
        track_condition: columns[8]?.innerText.trim(),
      };
    });

    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }

    if (!latestRaceData || !latestRaceData.race_id) {
      console.log('No race data found or race_id is missing.');
      return;
    }

    if (latestRaceData.raw_date) {
      latestRaceData.race_date = new Date(
        latestRaceData.raw_date.replace(/\//g, '-'),
      );
      delete latestRaceData.raw_date;
    }

    console.log('Scraped race info:', latestRaceData);

    await dbConnect();
    console.log('Connected to database.');

    const result = await Race.updateOne(
      { race_id: latestRaceData.race_id },
      { $set: latestRaceData },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      console.log('New race data was inserted.');
    } else if (result.modifiedCount > 0) {
      console.log('Existing race data was updated.');
    } else {
      console.log('Race data is already up to date.');
    }
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
