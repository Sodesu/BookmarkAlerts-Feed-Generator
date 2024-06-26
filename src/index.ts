import dotenv from 'dotenv';
import FeedGenerator from './server';
import fs from 'fs';
import https from 'https';
import { subscribe } from './subscription';
import { createDb, migrateToLatest } from './db';
import { AppContext} from './config';
import { DidResolver, MemoryCache } from '@atproto/identity';
import { Migrator } from 'kysely';
import { migrationProvider } from './db/migrations';

import http from 'http';


const parseBool = (val: string | undefined, defaultValue: boolean): boolean => {
    if (val === undefined) {
        return defaultValue;
    }
    return val.toLowerCase() === 'true';
};
const maybeStr = (val?: string, defaultValue: string = ''): string => val ?? defaultValue;
const maybeInt = (val?: string, defaultValue: number = 0): number => {
    if (val === undefined) return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};
// interface SSLConfig {
//     rejectUnauthorized: boolean;
//     key: Buffer;
//     cert: Buffer;
//     ca?: Buffer; // Optional, include if you use a CA bundle for extra verification
//   }  
const run = async () => {
    dotenv.config();
    const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME, 'aws.theitpharaoh.com');
    const serviceDid = maybeStr(process.env.FEEDGEN_SERVICE_DID, `did:web:${hostname}`);
    const useSSL = parseBool(process.env.FEEDGEN_DATABASE_USE_SSL, true);
    
    let sslOptions: https.ServerOptions | undefined = undefined;
    if (useSSL) {
        const keyPath = process.env.SSL_KEY_PATH;
        const certPath = process.env.SSL_CERT_PATH;
        const caPath = process.env.AWS_RDS_CA_PATH; // Optional
        
        if (!keyPath || !certPath) {
            throw new Error("SSL certificate or key path is not defined in environment variables.");
        }
        sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
            rejectUnauthorized: parseBool(process.env.FEEDGEN_DATABASE_SSL_REJECT_UNAUTHORIZED, true)
          };
      
          if (caPath) {
            sslOptions.ca = fs.readFileSync(caPath);
          }
        }
    const serverConfig = {
        port: maybeInt(process.env.FEEDGEN_PORT, 3000),
        listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST, 'localhost'),
        hostname,
        databaseUrl: maybeStr(process.env.FEEDGEN_DATABASE_URL),
        subscriptionEndpoint: maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT, 'wss://bsky.network'),
        serviceDid,
        publisherDid: maybeStr(process.env.FEEDGEN_PUBLISHER_DID, 'did:example:alice'),
        subscriptionReconnectDelay: maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY, 3000)
    };

    const db = createDb();


    try {
        console.log('Running migrations...');
        await migrateToLatest(db);
        console.log('Migrations completed successfully.');
    } catch (error) {
        console.error('Error running migrations:', error);
    }

    const didCache = new MemoryCache();
    const didResolver = new DidResolver({ plcUrl: 'https://plc.directory', didCache });

    const ctx: AppContext = {
      db,
      didResolver,
      cfg: serverConfig,
    };


    await subscribe(ctx);


    const feedGenerator = FeedGenerator.create(serverConfig);
    if (sslOptions) {

        const httpsServer = https.createServer(sslOptions, feedGenerator.app);
        httpsServer.listen(serverConfig.port, serverConfig.listenhost, () => {
            console.log(`🤖 HTTPS feed generator running at https://${hostname}:${serverConfig.port}`);
        });
    } else {

        await feedGenerator.start();
        console.log(`🤖 HTTP feed generator running at http://${serverConfig.listenhost}:${serverConfig.port}`);
    }
};
run().catch(error => console.error("Failed to start the server:", error));
