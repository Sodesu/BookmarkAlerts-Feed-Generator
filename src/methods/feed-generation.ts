import { InvalidRequestError } from '@atproto/xrpc-server'
import { Server } from '../lexicon'
import { AppContext } from '../config'
import algos from '../algos'
import { AtUri } from '@atproto/syntax'



export default function (server: Server, ctx: AppContext) {
    server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
        const feedUri = new AtUri(params.feed);
        const algo = algos[feedUri.rkey];
        
        if (feedUri.hostname !== ctx.cfg.publisherDid ||
            feedUri.collection !== 'app.bsky.feed.generator' ||
            !algo) {
            throw new InvalidRequestError(
                'Unsupported algorithm',
                'UnsupportedAlgorithm',
            );
        }

        // Check if authentication is required and process it accordingly
        // if (algo.requiresAuth) {
        //   const isAuthenticated = await validateAuth(...);
        //   if (!isAuthenticated) throw new Error("Authentication required");
        // }

        const body = await algo.handler(ctx, params);
        
        return {
            encoding: 'application/json',
            body: body,
        }
    });
}
