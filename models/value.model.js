const mongoose = require('mongoose');
const { Schema } = mongoose;

const valueSchema = new Schema({
  key: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'key', // Reference to the Key model
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

valueSchema.index({ value: 1, timestamp: -1 }, { unique: true });

module.exports = mongoose.model('value', valueSchema);
