import { Resolver } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';

// dns.setServers covers Atlas SRV discovery, but Node sockets normally use the
// operating system's DNS. Give MongoDB sockets the same configured resolvers.
export function createDatabaseLookup(servers: string[]): LookupFunction {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(servers);

  return (hostname, options, callback) => {
    const literalFamily = isIP(hostname);
    const family = literalFamily || (options.family === 6 ? 6 : 4);
    const complete = (error: NodeJS.ErrnoException | null, addresses: string[] = []) => {
      if (error) return callback(error, []);
      if (!addresses.length) {
        return callback(Object.assign(new Error(`No DNS addresses found for ${hostname}`), { code: 'ENOTFOUND' }), []);
      }
      if (options.all) callback(null, addresses.map((address) => ({ address, family })));
      else callback(null, addresses[0], family);
    };
    if (literalFamily) queueMicrotask(() => complete(null, [hostname]));
    else if (family === 6) resolver.resolve6(hostname, complete);
    else resolver.resolve4(hostname, complete);
  };
}
