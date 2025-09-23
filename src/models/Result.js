import mongoose from 'mongoose';

const ResultSchema = new mongoose.Schema({
  race_id: {
    type: String,
    required: [true, 'Please provide a race_id for this result.'],
    // 将来的にはRaceモデルへの参照も可能です
    // type: mongoose.Schema.Types.ObjectId,
    // ref: 'Race',
  },
  rank: {
    type: Number,
    required: [true, 'Please provide a rank.'],
  },
  horse_name: {
    type: String,
    required: [true, 'Please provide a horse name.'],
  },
  jockey: {
    type: String,
  },
  trainer: {
    type: String,
  },
});

// Next.jsのホットリロードでモデルの重複コンパイルエラーを防ぐための記述です
export default mongoose.models.Result || mongoose.model('Result', ResultSchema);
