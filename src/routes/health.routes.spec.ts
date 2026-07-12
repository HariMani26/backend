import request from 'supertest';

import { createApp } from '../app';

describe('GET /api/health', () => {
  const app = createApp();

  it('returns the standard success envelope with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Service healthy',
      data: {
        status: 'ok',
        timestamp: expect.any(String),
      },
    });
  });
});

describe('GET /api/unknown-route', () => {
  const app = createApp();

  it('returns the standard error envelope with a 404', async () => {
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/unknown-route',
      errors: [],
    });
  });
});
