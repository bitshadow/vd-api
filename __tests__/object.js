const mockRedis = require('ioredis-mock');
const request = require('supertest');
const app = require('../index');
const KeyModel = require('../models/key.model');
const ValueModel = require('../models/value.model');

jest.mock('ioredis', () => mockRedis)

describe('POST /object', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await KeyModel.deleteMany({});
    await ValueModel.deleteMany({});
  });

  test('It should return error if no key-value pair is provided', async () => {
    const response = await request(app)
      .post('/object/')
      .expect(400);

    expect(response.body).toHaveProperty('error', 'At least one key-value pair is required');
  });

  test('It should return error if more than one key-value pair is provided', async () => {
    const response = await request(app)
      .post('/object')
      .send({ key1: 'value1', key2: 'value2' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Maximum one key-value pair can be supplied');
  });

  test('It should create a new key-value pair', async () => {
    const response = await request(app)
      .post('/object')
      .send({ key: 'Value' })
      .expect(200);

    expect(response.body).toHaveProperty('key', 'key');
    expect(response.body).toHaveProperty('value', 'Value');
    expect(response.body).toHaveProperty('timestamp');

    // Check if the key and value are saved in the database
    const key = await KeyModel.findOne({ name: 'key' });
    expect(key).toBeTruthy();

    const value = await ValueModel.findOne({ key: key._id });
    expect(value).toBeTruthy();
    expect(value.value).toBe('Value');
  });
});

describe('GET /object/:key', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await KeyModel.deleteMany({});
    await ValueModel.deleteMany({});
  });

  test('It should return error if key is not provided', async () => {
    const response = await request(app)
      .get('/object')
      .expect(400);

    expect(response.body).toHaveProperty('error', 'key is required');
  });

  test('It should return error if timestamp is invalid', async () => {
    const response = await request(app)
      .get('/object/testKey?timestamp=random')
      .expect(400);

    expect(response.body).toHaveProperty('error', 'invalid timestamp');
  });

  test('It should return error if key not found', async () => {
    const response = await request(app)
      .get('/object/nonExistingKey')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Key not found');
  });

  test('It should return the latest value for a given key', async () => {
    // Create a key-value pair first
    await request(app)
      .post('/object')
      .send({ key: 'value1' })
      .expect(200);

    await request(app)
      .post('/object')
      .send({ key: 'value2' })
      .expect(200);

    const response = await request(app)
      .get('/object/key')
      .expect(200);

    expect(response.body).toHaveProperty('key', 'key');
    expect(response.body).toHaveProperty('value', 'value2');
  });

  test('It should return the value of the key at the given timestamp', async () => {
    // Create a key
    const key = await KeyModel.create({ name: 'testKey' });

    // Create values for the key at different timestamps
    const v1 = await ValueModel.create({ key: key._id, value: 'value1', timestamp: new Date('2022-03-01') });
    const v2 = await ValueModel.create({ key: key._id, value: 'value2', timestamp: new Date('2022-03-02') });
    const v3 = await ValueModel.create({ key: key._id, value: 'value3', timestamp: new Date('2022-03-03') });

    key.values = [v1, v2, v3];
    key.save()

    // Get the value of the key at a specific timestamp
    const response = await request(app)
      .get('/object/testKey?timestamp=' + Math.floor(new Date('2022-03-01').getTime() / 1000)) // Timestamp for '2022-03-01'
      .expect(200);

    expect(response.body).toHaveProperty('key', 'testKey');
    expect(response.body).toHaveProperty('value', 'value1');
  });
});

