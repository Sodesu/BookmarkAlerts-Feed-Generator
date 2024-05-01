import { Server } from '../lexicon'
import { AppContext } from '../config'
import algos from '../algos'
import { AtUri } from '@atproto/syntax'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.describeFeedGenerator(async () => {
    try {
      const feeds = Object.keys(algos).map((shortname) => {
        const uri = AtUri.make(
          ctx.cfg.publisherDid,
          'app.bsky.feed.generator',
          shortname,
        ).toString();
        return { uri };
      });
      return {
        encoding: 'application/json',
        body: {
          did: ctx.cfg.serviceDid,
          feeds,
        },
      };
    } catch (error) {
      console.error('Failed to describe feed generator:', error);
      throw error;
    }
  })
}
