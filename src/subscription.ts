import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos';
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription';
import { Post } from './db/schema';

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt);

    const postsToDelete = ops.posts.deletes.map((del) => del.uri);

    const postsToCreate: Post[] = ops.posts.creates
      .filter((create) => create.record.text.toLowerCase().includes('@bookmarkalerts'))
      .map((create) => ({
        uri: create.uri,
        cid: create.cid,
        content: create.record.text ?? null,
        replyParent: create.record?.reply?.parent?.uri ?? null,
        replyRoot: create.record?.reply?.root?.uri ?? null,
        indexedAt: new Date().toISOString(),
        parent_uri: typeof create.record?.reply?.parent?.uri === 'string' ? create.record?.reply?.parent?.uri : null,
        parent_cid: typeof create.record?.reply?.parent?.cid === 'string' ? create.record?.reply?.parent?.cid : null,
        parent_content: typeof create.record?.reply?.parent?.text === 'string' ? create.record?.reply?.parent?.text : null,
        parent_replyParent: typeof create.record?.reply?.parent?.replyParent === 'string' ? create.record?.reply?.parent?.replyParent : null,
        parent_replyRoot: typeof create.record?.reply?.parent?.replyRoot === 'string' ? create.record?.reply?.parent?.replyRoot : null,
        parent_indexedAt: typeof create.record?.reply?.parent?.indexedAt === 'string' ? create.record?.reply?.parent?.indexedAt : null,
      }));

    try {
      if (postsToDelete.length > 0) {
        await this.db
          .deleteFrom('post')
          .where('uri', 'in', postsToDelete)
          .execute();
      }
      if (postsToCreate.length > 0) {
        await this.db
          .insertInto('post')
          .values(postsToCreate)
          .onConflict((oc) =>
            oc
              .column('uri')
              .doUpdateSet({
                cid: (db) => db.ref('excluded.cid'),
                content: (db) => db.ref('excluded.content'),
                replyParent: (db) => db.ref('excluded.replyParent'),
                replyRoot: (db) => db.ref('excluded.replyRoot'),
                indexedAt: (db) => db.ref('excluded.indexedAt'),
                parent_uri: (db) => db.ref('excluded.parent_uri'),
                parent_cid: (db) => db.ref('excluded.parent_cid'),
                parent_content: (db) => db.ref('excluded.parent_content'),
                parent_replyParent: (db) => db.ref('excluded.parent_replyParent'),
                parent_replyRoot: (db) => db.ref('excluded.parent_replyRoot'),
                parent_indexedAt: (db) => db.ref('excluded.parent_indexedAt'),
              })
          )
          .execute();
      }
    } catch (error) {
      console.error('Failed to update database:', error);
      // Additional error handling as needed
    }
  }
}
