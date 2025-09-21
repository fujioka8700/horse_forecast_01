import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name.'],
    maxlength: [20, 'Name cannot be more than 20 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
  },
  age: {
    type: Number,
    required: false,
  },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
