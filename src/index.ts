import dotenv from 'dotenv'
import FeedGenerator from './server'

const run = async () => {
  dotenv.config();
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME, 'example.com');
  const serviceDid = maybeStr(process.env.FEEDGEN_SERVICE_DID, `did:web:${hostname}`);
  const server = FeedGenerator.create({
    port: maybeInt(process.env.FEEDGEN_PORT, 3000),
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST, 'localhost'),
    databaseUrl: maybeStr(process.env.FEEDGEN_DATABASE_URL),
    subscriptionEndpoint: maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT, 'wss://bsky.network'),
    publisherDid: maybeStr(process.env.FEEDGEN_PUBLISHER_DID, 'did:example:alice'),
    subscriptionReconnectDelay: maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY, 3000),
    hostname,
    serviceDid,
  })
  if (!server.cfg.databaseUrl) {
    throw new Error("Database URL must be provided.");
  }
  await server.start();
  console.log(`🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`);
}

const maybeStr = (val?: string, defaultValue: string = '') => val || defaultValue;

const maybeInt = (val?: string, defaultValue: number = 0): number => {
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

run()
