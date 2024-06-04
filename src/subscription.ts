import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos';
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription';

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt);

    const postsToDelete = ops.posts.deletes.map((del) => del.uri);
    const postsToCreate = ops.posts.creates
      .filter((create) => create.record.text.toLowerCase().includes('@bookmarkalerts'))
      .map((create) => ({
          uri: create.uri,
          cid: create.cid,
          content: create.record.text, // Store the post content
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          parent_uri: create.record?.reply?.parent.uri ?? null, // Store parent post details
          parent_cid: create.record?.reply?.parent.cid ?? null,
          parent_content: create.record?.reply?.parent.text ?? null,
          parent_replyParent: create.record?.reply?.parent.replyParent ?? null,
          parent_replyRoot: create.record?.reply?.parent.replyRoot ?? null,
          parent_indexedAt: create.record?.reply?.parent.indexedAt ?? null,
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
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    } catch (error) {
      console.error('Failed to update database:', error);
    }
  }
}
