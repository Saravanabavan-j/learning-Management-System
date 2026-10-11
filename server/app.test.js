import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from './app.js';
import { requiredText, positiveId } from './validators/input.js';

test('health endpoint returns service status without requiring a database request', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('unknown API routes return a consistent 404 response', async () => {
  const response = await request(app).get('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'API route not found.');
});

test('requiredText trims valid input and rejects empty values', () => {
  assert.equal(requiredText('  LearnSpace  ', 'Title'), 'LearnSpace');
  assert.throws(() => requiredText('   ', 'Title'), /Title is required/);
  assert.throws(() => requiredText('long text', 'Title', 3), /3 characters or fewer/);
});

test('positiveId accepts positive integer IDs only', () => {
  assert.equal(positiveId('42'), 42);
  assert.throws(() => positiveId('0'), /positive integer/);
  assert.throws(() => positiveId('abc'), /positive integer/);
});
