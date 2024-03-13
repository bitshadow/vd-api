const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Assuming keys are unique
  },
  values: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'value',
    },
  ],
});

module.exports = mongoose.model('key', keySchema);
