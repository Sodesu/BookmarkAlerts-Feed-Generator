import dotenv from 'dotenv';
import FeedGenerator from './server';
import fs from 'fs';
import https from 'https';

// Helper function to parse boolean environment variables
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

interface SSLConfig {
  rejectUnauthorized: boolean;
  ca: Buffer;
}

const run = async () => {
    dotenv.config();
    const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME, 'example.com');
    const serviceDid = maybeStr(process.env.FEEDGEN_SERVICE_DID, `did:web:${hostname}`);
    const useSSL = parseBool(process.env.FEEDGEN_DATABASE_USE_SSL, true);
    
    let sslOptions: https.ServerOptions | undefined = undefined;
    if (useSSL) {
        const caPath = process.env.AWS_RDS_CA_PATH;
        if (!caPath) {
            throw new Error("AWS RDS CA path must be defined in environment variables.");
        }
        sslOptions = {
            rejectUnauthorized: parseBool(process.env.FEEDGEN_DATABASE_SSL_REJECT_UNAUTHORIZED, true),
            ca: fs.readFileSync(caPath)
        };
    }

    const serverConfig = {
        port: maybeInt(process.env.FEEDGEN_PORT, 3000),
        listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST, 'localhost'),
        databaseUrl: maybeStr(process.env.FEEDGEN_DATABASE_URL),
        subscriptionEndpoint: maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT, 'wss://bsky.network'),
        publisherDid: maybeStr(process.env.FEEDGEN_PUBLISHER_DID, 'did:example:alice'),
        subscriptionReconnectDelay: maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY, 3000),
        hostname,
        serviceDid
    };

    const feedGenerator = FeedGenerator.create(serverConfig);

    if (sslOptions) {
        // Example of creating an HTTPS server using sslOptions, adapting it to your actual server setup
        const httpsServer = https.createServer(sslOptions, feedGenerator.app);
        httpsServer.listen(serverConfig.port, serverConfig.listenhost, () => {
            console.log(`🤖 HTTPS feed generator running at https://${serverConfig.listenhost}:${serverConfig.port}`);
        });
    } else {
        // If not using HTTPS, start normally
        await feedGenerator.start();
        console.log(`🤖 HTTP feed generator running at http://${serverConfig.listenhost}:${serverConfig.port}`);
    }
};

run().catch(error => console.error("Failed to start the server:", error));
