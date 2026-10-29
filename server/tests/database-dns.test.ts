import { Resolver } from 'node:dns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseLookup } from '../src/config/databaseDns.js';

afterEach(() => vi.restoreAllMocks());

describe('database socket DNS', () => {
  it('uses configured resolvers and returns all IPv4 addresses for Node sockets', async () => {
    const servers = vi.spyOn(Resolver.prototype, 'setServers').mockImplementation(() => {});
    vi.spyOn(Resolver.prototype, 'resolve4').mockImplementation(((_host, callback) => {
      callback(null, ['192.0.2.1', '192.0.2.2']);
    }) as any);
    const lookup = createDatabaseLookup(['1.1.1.1']);
    const addresses = await new Promise((resolve, reject) => {
      lookup('cluster.example', { all: true, family: 4 }, (error, result) => error ? reject(error) : resolve(result));
    });
    expect(servers).toHaveBeenCalledWith(['1.1.1.1']);
    expect(addresses).toEqual([{ address: '192.0.2.1', family: 4 }, { address: '192.0.2.2', family: 4 }]);
  });

  it('supports the single-address callback used by TLS connections', async () => {
    vi.spyOn(Resolver.prototype, 'resolve4').mockImplementation(((_host, callback) => callback(null, ['192.0.2.1'])) as any);
    const lookup = createDatabaseLookup(['1.1.1.1']);
    const result = await new Promise((resolve, reject) => {
      lookup('cluster.example', { family: 4 }, (error, address, family) => error ? reject(error) : resolve({ address, family }));
    });
    expect(result).toEqual({ address: '192.0.2.1', family: 4 });
  });

  it('passes DNS errors back instead of connecting to a different server', async () => {
    const failure = Object.assign(new Error('DNS unavailable'), { code: 'ETIMEOUT' });
    vi.spyOn(Resolver.prototype, 'resolve4').mockImplementation(((_host, callback) => callback(failure)) as any);
    const lookup = createDatabaseLookup(['1.1.1.1']);
    await expect(new Promise((resolve, reject) => {
      lookup('cluster.example', {}, (error, address) => error ? reject(error) : resolve(address));
    })).rejects.toBe(failure);
  });

  it('does not look up literal IP addresses', async () => {
    const resolve4 = vi.spyOn(Resolver.prototype, 'resolve4');
    const lookup = createDatabaseLookup(['1.1.1.1']);
    const address = await new Promise((resolve, reject) => {
      lookup('192.0.2.3', {}, (error, result) => error ? reject(error) : resolve(result));
    });
    expect(address).toBe('192.0.2.3');
    expect(resolve4).not.toHaveBeenCalled();
  });
});
