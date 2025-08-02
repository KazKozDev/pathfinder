import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('API Endpoints', () => {
  const baseUrl = 'http://localhost:3001';

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
  });

  it('should return health status', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('OK');
  });

  it('should return jobs list', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should handle 404 for non-existent endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/nonexistent`);
    expect(response.status).toBe(404);
  });
});
