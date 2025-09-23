import mongoose from 'mongoose';

const RaceSchema = new mongoose.Schema({
  race_id: { type: String, required: true, unique: true },
  race_date: { type: Date, required: true },
  course_name: { type: String, required: true },
  distance: { type: Number },
  turf_or_dirt: { type: String },
  weather: { type: String },
  track_condition: { type: String },
});

export default mongoose.models.Race || mongoose.model('Race', RaceSchema);