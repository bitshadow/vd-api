const express = require('express');
const router = express.Router();
const KeyModel = require('../models/key.model');
const ValueModel = require('../models/value.model');

const redis = require('../redis');

// Function to delete keys from Redis based on a pattern
const deleteKeys = async (pattern) => {
  const keys = await redis.keys(`${pattern}::*`)
  if (keys.length > 0) {
    redis.del(keys)
  }
}

router.get('', async (_, res) => {
  return res.status(400).json({ error: 'key is required' });
});

router.get('/:key', async (req, res) => {
  const { key } = req.params;
  const timestamp = parseInt(req.query.timestamp);
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }

  if (req.query.timestamp && isNaN(timestamp)) {
    return res.status(400).json({ error: 'invalid timestamp' });
  }

  try {
    const redisKey = `Key::${key}:${timestamp}`;
    const cachedData = await redis.get(redisKey);

    if (cachedData) {
      // Return cached data if found
      return res.json(JSON.parse(cachedData));
    }

    const keyObject = await KeyModel.findOne({ name: key })
      .populate({
        path: 'values',
        match: timestamp
          ? { timestamp: { $lte: new Date(timestamp * 1000) } }
          : {},
        options: { sort: { timestamp: -1 }, limit: 1 },
      })
      .exec();

    if (!keyObject) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (!keyObject.values.length) {
      return res.status(404).json({ error: 'Value not found' });
    }

    const response = { key, value: keyObject.values[0].value };
    await redis.set(redisKey, JSON.stringify(response))

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const entries = Object.entries(req.body);

  if (entries.length === 0) {
    return res
      .status(400)
      .json({ error: 'At least one key-value pair is required' });
  }

  if (entries.length > 1) {
    return res
      .status(400)
      .json({ error: 'Maximum one key-value pair can be supplied' });
  }

  try {
    const promises = entries.map(async ([key, value]) => {
      let keyObj = await KeyModel.findOne({ name: key });
      if (!keyObj) {
        keyObj = await KeyModel.create({ name: key });
      }

      const timestamp = new Date();
      const newValue = await ValueModel.create({
        key: keyObj._id,
        timestamp,
        value,
      });
      await newValue.save();
      keyObj.values.push(newValue._id);
      await keyObj.save();

      return { key, value, timestamp };
    });

    const results = await Promise.all(promises);

    // Delete cached keys from Redis
    deleteKeys('Key')

    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
