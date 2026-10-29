import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';

const originalUri = env.mongoUri;
const originalDnsServers = env.dnsServers;

afterEach(() => {
  env.mongoUri = originalUri;
  env.dnsServers = originalDnsServers;
  vi.restoreAllMocks();
});

describe('Atlas-only database connection', () => {
  it.each(['', 'mongodb://127.0.0.1:27017/financial_request_system'])('rejects missing or local configuration: %s', async (uri) => {
    env.mongoUri = uri;
    const connect = vi.spyOn(mongoose, 'connect');
    await expect(connectDB()).rejects.toThrow('Local database fallback is disabled');
    expect(connect).not.toHaveBeenCalled();
  });

  it('connects using the configured URI without substituting a database', async () => {
    env.mongoUri = 'mongodb+srv://example:example@cluster0.zd5sxzv.mongodb.net/?appName=Cluster0';
    env.dnsServers = ['1.1.1.1', '8.8.8.8'];
    const setServers = vi.spyOn(dns, 'setServers').mockImplementation(() => {});
    const connect = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await connectDB();
    expect(setServers).toHaveBeenCalledWith(env.dnsServers);
    expect(setServers.mock.invocationCallOrder[0]).toBeLessThan(connect.mock.invocationCallOrder[0]);
    expect(connect).toHaveBeenCalledExactlyOnceWith(env.mongoUri, {
      serverSelectionTimeoutMS: 10000, family: 4, lookup: expect.any(Function)
    });
  });

  it('propagates a connection failure without attempting another database', async () => {
    env.dnsServers = [];
    env.mongoUri = 'mongodb+srv://example:example@cluster0.zd5sxzv.mongodb.net/?appName=Cluster0';
    const connect = vi.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Atlas unavailable'));
    await expect(connectDB()).rejects.toThrow('Atlas unavailable');
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
