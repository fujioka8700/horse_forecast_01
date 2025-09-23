// うまく抽出できない。

import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import dbConnect from '../lib/dbConnect.js';
import Result from '../models/Result.js';

const scrapeResults = async () => {
  let browser;
  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Connected to database.');

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

    const raceListUrl =
      'https://db.netkeiba.com/?pid=race_list&word=&start_year=1975&start_mon=none&end_year=none&end_mon=none&kyori_min=&kyori_max=&sort=date&list=20';
    console.log(`Navigating to race list page: ${raceListUrl}`);
    await page.goto(raceListUrl, { waitUntil: 'networkidle0', timeout: 90000 });

    // レース一覧ページでのセレクタ確認
    const listPageSelector = '.nk_tb_common.race_table_01';
    const existsOnListPage = await page.evaluate(
      (sel) => !!document.querySelector(sel),
      listPageSelector,
    );
    console.log(
      `  -> Selector "${listPageSelector}" on LIST page? --- ${
        existsOnListPage ? 'Yes, Found.' : 'No, Not Found.'
      }`,
    );

    console.log('Finding the first race in the list...');
    await page.waitForSelector('.nk_tb_common.race_table_01');
    const firstRaceId = await page.evaluate(() => {
      const firstRaceRow = document.querySelector(
        '.nk_tb_common.race_table_01 tbody tr:nth-child(2)',
      );
      if (!firstRaceRow) return null;
      const raceLink = firstRaceRow.querySelector('td:nth-child(5) a');
      if (!raceLink) return null;
      const raceHref = raceLink.href;
      const raceIdMatch = raceHref.match(/race\/(\d+)/);
      return raceIdMatch ? raceIdMatch[1] : null;
    });

    if (!firstRaceId) {
      console.log('Could not find the link to the first race. Exiting.');
      return;
    }
    console.log(`Found first race ID: ${firstRaceId}`);

    const resultUrl = `https://db.netkeiba.com/race/${firstRaceId}/`;
    console.log(`Navigating to race result page: ${resultUrl}`);
    await page.goto(resultUrl, { waitUntil: 'networkidle0', timeout: 90000 });
    console.log(
      'Waiting for an additional 5 seconds to ensure all content is rendered...',
    );
    await new Promise((r) => setTimeout(r, 5000)); // Replaced page.waitForTimeout

    // レース結果ページでのセレクタ確認
    const resultPageSelector = '.nk_tb_common.race_table_01';
    const existsOnResultPage = await page.evaluate(
      (sel) => !!document.querySelector(sel),
      resultPageSelector,
    );
    console.log(
      `  -> Selector "${resultPageSelector}" on RESULT page? --- ${
        existsOnResultPage ? 'Yes, Found.' : 'No, Not Found.'
      }`,
    );

    const resultTableSelector = 'table.race_table_01';
    console.log(`Waiting for selector: ${resultTableSelector}`);
    await page.waitForSelector(resultTableSelector, { timeout: 60000 });

    const allResultsData = await page.evaluate((raceId) => {
      const results = [];
      const debugInfo = []; // To store debug messages for skipped rows
      const table = document.querySelector('table.race_table_01');
      if (!table) {
        debugInfo.push('Table .race_table_01 not found.');
        return { results, debugInfo };
      }

      // Select all tr elements within tbody
      const allTrElements = table.querySelectorAll('tbody tr');
      debugInfo.push(`allTrElements.length: ${allTrElements.length}`); // New debug log

      // Filter out potential header rows if the first row is not a data row
      const dataRows = Array.from(allTrElements).filter((row, index) => {
        // Assuming the first row might be a header, start processing from the second row (index 1)
        // Or, if the first row is a data row, this filter might not be needed.
        // For now, let's assume the first row is a header and data starts from index 1 (second row).
        return index >= 1; // Skip the first row (index 0)
      });

      debugInfo.push(`dataRows (after filter).length: ${dataRows.length}`); // New debug log

      dataRows.forEach((row, index) => {
        const columns = row.querySelectorAll('td');
        const rowDebug = {
          rowIndex: index + 2,
          skippedReason: null,
          rank: null,
          horseName: null,
          allATags: [],
        };

        const rank = columns[0]?.innerText.trim();
        rowDebug.rank = rank;
        if (!rank || parseInt(rank, 10) < 1) {
          rowDebug.skippedReason = `Invalid rank: ${rank}`;
          debugInfo.push(rowDebug);
          return; // Skip this row
        }

        let horseName = null;
        for (const td of columns) {
          const allATagsInTd = td.querySelectorAll('a');
          allATagsInTd.forEach((a) =>
            rowDebug.allATags.push({
              id: a.id,
              href: a.href,
              text: a.innerText,
            }),
          );

          const horseLink = td.querySelector('a[id^="umalink_"]');
          if (horseLink) {
            horseName = horseLink.innerText.trim();
            break;
          }
        }

        rowDebug.horseName = horseName;
        if (!horseName) {
          rowDebug.skippedReason =
            'Horse name <a> tag with id starting with "umalink_" not found.';
          debugInfo.push(rowDebug);
          return; // Skip this row
        }

        const jockey = columns[6]?.querySelector('a')?.innerText.trim();
        const trainer = columns[7]?.querySelector('a')?.innerText.trim();

        results.push({
          race_id: raceId,
          rank: parseInt(rank, 10),
          horse_name: horseName,
          jockey: jockey,
          trainer: trainer,
        });
      });

      return { results, debugInfo };
    }, firstRaceId);

    // Now, outside page.evaluate, process allResultsData
    if (allResultsData.results && allResultsData.results.length > 0) {
      console.log(
        `Found ${allResultsData.results.length} results from page.evaluate. Saving to MongoDB...`,
      );
      for (const resultData of allResultsData.results) {
        const dbResult = await Result.updateOne(
          { race_id: resultData.race_id, rank: resultData.rank },
          { $set: resultData },
          { upsert: true },
        );

        if (dbResult.upsertedCount > 0) {
          console.log(
            ` -> Inserted new result for race ${resultData.race_id}, rank ${resultData.rank}`,
          );
        } else if (dbResult.modifiedCount > 0) {
          console.log(
            ` -> Updated existing result for race ${resultData.race_id}, rank ${resultData.rank}`,
          );
        } else {
          console.log(
            ` -> Result for race ${resultData.race_id}, rank ${resultData.rank} is already up to date.`,
          );
        }
      }
    } else {
      console.log(
        'Could not find or parse any race result data from the table.',
      );
    }

    if (allResultsData.debugInfo && allResultsData.debugInfo.length > 0) {
      console.error(
        'Skipped Rows Debug Info:',
        JSON.stringify(allResultsData.debugInfo, null, 2),
      );
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

scrapeResults();
