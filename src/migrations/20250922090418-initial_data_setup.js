module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // コレクションの作成
    await db.createCollection('races');
    await db.createCollection('entries');
    await db.createCollection('results');

    // 初期データの投入（例）
    const racesData = [
      {
        race_id: 'R001',
        race_date: new Date('2025-09-22'),
        course_name: '東京競馬場',
        distance: 1600,
        turf_or_dirt: '芝',
        weather: '晴',
        track_condition: '良',
      },
    ];

    const entriesData = [
      {
        entry_id: 'E001',
        race_id: 'R001',
        horse_name: 'ディープインパクト',
        jockey_name: '武豊',
        trainer_name: '池江泰郎',
        handicap_weight: 56,
        gate_number: 1,
        odds: 1.2,
        popularity: 1,
        gender: '牡',
        age: 3,
        horse_sire: 'サンデーサイレンス',
        horse_dam: 'ウインドインハーヘア',
      },
    ];

    const resultsData = [
      {
        result_id: 'RS001',
        race_id: 'R001',
        entry_id: 'E001',
        finish_rank: 1,
        finish_time: 94.2,
        prize_money: 10000,
      },
    ];

    await db.collection('races').insertMany(racesData);
    await db.collection('entries').insertMany(entriesData);
    await db.collection('results').insertMany(resultsData);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // 変更を元に戻す処理
    await db.collection('races').drop();
    await db.collection('entries').drop();
    await db.collection('results').drop();
  },
};
