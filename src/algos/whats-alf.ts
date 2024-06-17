
import { parse, isFuture } from 'date-fns';
import { InvalidRequestError } from '@atproto/xrpc-server';
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton';
import { AppContext } from '../config';

type SkeletonFeedPost = {
    post: string;
    reason?: { [k: string]: any; $type: string; } | undefined;
};
// max 15 chars
export const shortname = 'whats-alf';
export const requiresAuth = false; // No authentication needed


export const handler = async (ctx: AppContext, params: QueryParams): Promise<{ cursor?: string, feed: SkeletonFeedPost[] }> => {
    try {
        console.log('Handler params:', params);

        let builder = ctx.db
            .selectFrom('post as p')
            .leftJoin('post as parent', 'p.replyParent', 'parent.uri')
            .select([
                'p.uri as uri',
                'p.cid as cid',
                'p.content as content',
                'p.replyParent as replyParent',
                'p.replyRoot as replyRoot',
                'p.indexedAt as indexedAt',
                'parent.uri as parent_uri',
                'parent.cid as parent_cid',
                'parent.content as parent_content',
                'parent.replyParent as parent_replyParent',
                'parent.replyRoot as parent_replyRoot',
                'parent.indexedAt as parent_indexedAt'
            ])
            .where('p.content', 'like', '%Mark 12:31%')
            .orderBy('p.cid', 'desc')
            .limit(params.limit);

        if (params.cursor) {
            const [indexedAt, cid] = params.cursor.split('::');
            if (!indexedAt || !cid) {
                throw new InvalidRequestError('Malformed cursor');
            }
            
            const timeStr = new Date(parseInt(indexedAt, 10)).toISOString();
            builder = builder
                .where('p.indexedAt', '<', timeStr)
                .orWhere((qb) => qb.where('p.indexedAt', '=', timeStr)
                .where('p.cid', '<', cid));
        }

        const res = await builder.execute();
        console.log('Query result:', res);

        const feed: SkeletonFeedPost[] = res.map((row: any) => ({ 
            post: row.uri ?? "defaultUri",
            reason: row.content ? formatReason(getCustomReason(row, containsBibleVerse(row.content))) : undefined
        }));

        let cursor: string | undefined;
        const last = res.at(-1);

        if (last && last.indexedAt) {
            cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`;
        }

        return {
            cursor,
            feed,
        };
    } catch (error: any) {
        if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
            console.warn('Warning in whats-alf handler: Self-signed certificate in certificate chain.');

            return {
                cursor: undefined,
                feed: [],
            };
        } else {
            console.error('Error in whats-alf handler:', error);
            throw error;
        }
    }
};
