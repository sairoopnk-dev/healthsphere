import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('Test Setup Verification', () => {
  it('should have mongodb-memory-server connected', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('should have access to vitest globals', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
});
