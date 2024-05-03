import { parse, isFuture } from 'date-fns';
import { InvalidRequestError } from '@atproto/xrpc-server';
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton';
import { AppContext } from '../config';
import { Kysely, PostgresDialect } from 'kysely';

type SkeletonFeedPost = {
    post: string;
    reason?: { [k: string]: any; $type: string; } | undefined;
};


// max 15 chars
export const shortname = 'whats-alf';
export const requiresAuth = false; // This algorithm does not require authentication

export const handler = async (ctx: AppContext, params: QueryParams): Promise<{ cursor?: string, feed: SkeletonFeedPost[] }> => {
    let builder = ctx.db
        .selectFrom('post')
        .leftJoin('post as parent', 'post.replyParent', 'parent.uri')
        .selectAll()
        .orderBy('cid', 'desc')
        .limit(params.limit);


    if (params.cursor) {
        const [indexedAt, cid] = params.cursor.split('::');
        if (!indexedAt || !cid) {
            throw new InvalidRequestError('Malformed cursor');
        }
        const timeStr = new Date(parseInt(indexedAt, 10)).toISOString();
        builder = builder
            .where('post.indexedAt', '<', timeStr)
            .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr).where('post.cid', '<', cid));
    }

    const feed: SkeletonFeedPost[] = res.map((row) => ({
        post: row.uri ?? "defaultUri",  // Provide a default value or handle `null` explicitly
        reason: formatReason(getCustomReason(row, containsFutureBookmark(row.content)))
    }));
    

    let cursor: string | undefined;
    const last = res.at(-1);
    if (last) {
        cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`;
    }

    return {
        cursor,
        feed,
    };
};

function containsFutureBookmark(postContent: string): boolean {
    const match = postContent.match(/@bookmarkalerts\.bsky\.social !bookmark this for (\d{2}\/\d{2}\/\d{4})/);
    if (match) {
        const date = parse(match[1], 'MM/dd/yyyy', new Date());
        return isFuture(date);
    }
    return false;
}

function getCustomReason(row: any, hasFutureBookmark: boolean): string {
    if (hasFutureBookmark) {
        return 'Bookmark this post for a future date';
    } else if (row.likes && row.likes > 200 && new Date(row.indexedAt) > new Date(Date.now() - 86400000)) {
        return 'Trending and popular post';
    } else if (row.comments && row.comments.length > 50) {
        return 'Hot topic in discussion';
    }
    return 'Highlighted for relevance';
}

// Modified to match expected structured type
function formatReason(reason: string | undefined): any {
    if (!reason) return undefined;
    return { reason, $type: "CustomReasonType" };  // You may want to adjust the $type based on your system's needs
}
