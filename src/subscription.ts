import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos';
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription';
import { Post } from './db/schema'; // Ensure this import matches your actual file structure

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt);

    for (const post of ops.posts.creates) {
      console.log(post.record.text)
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only alf-related posts
        return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          content: create.record.text ?? null,
          replyParent: create.record?.reply?.parent?.uri ?? null,
          replyRoot: create.record?.reply?.root?.uri ?? null,
          indexedAt: new Date().toISOString(),
          parent_uri: create.record?.reply?.parent?.uri ?? null,
          parent_cid: create.record?.reply?.parent?.cid ?? null,
          parent_content: create.record?.reply?.parent?.text ?? null,
          parent_replyParent: create.record?.reply?.parent?.replyParent ?? null,
          parent_replyRoot: create.record?.reply?.parent?.replyRoot ?? null,
          parent_indexedAt: create.record?.reply?.parent?.indexedAt ?? null,
        }
      })


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
    }
  }
