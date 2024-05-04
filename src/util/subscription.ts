import { Subscription } from '@atproto/xrpc-server'
import { cborToLexRecord, readCar } from '@atproto/repo'
import { BlobRef } from '@atproto/lexicon'
import { ids, lexicons } from '../lexicon/lexicons'
import { Record as PostRecord } from '../lexicon/types/app/bsky/feed/post'
import {
  Commit,
  OutputSchema as RepoEvent,
  isCommit,
} from '../lexicon/types/com/atproto/sync/subscribeRepos'
import { Database } from '../db'




export abstract class FirehoseSubscriptionBase {
  public sub: Subscription<RepoEvent>

  constructor(public db: Database, public service: string) {
    this.sub = new Subscription({
      service: service,
      method: ids.ComAtprotoSyncSubscribeRepos,
      getParams: () => this.getCursor(),
      validate: (value: unknown) => {
        try {
          return lexicons.assertValidXrpcMessage<RepoEvent>(
            ids.ComAtprotoSyncSubscribeRepos,
            value,
          )
        } catch (err) {
          console.error('repo subscription skipped invalid message', err)
        }
      },
    })
  }

  abstract handleEvent(evt: RepoEvent): Promise<void>



  async run(subscriptionReconnectDelay: number, maxDelay: number = 32000) {
    let delay = subscriptionReconnectDelay;
    try {
      for await (const evt of this.sub) {
        try {
          await this.handleEvent(evt);
        } catch (err) {
          console.error('repo subscription could not handle message', err);
        }
        if (isCommit(evt) && evt.seq % 20 === 0) {
          await this.updateCursor(evt.seq);
        }
      }
    } catch (err) {
      console.error('repo subscription errored', err);
      setTimeout(() => {
        this.run(Math.min(delay * 2, maxDelay)); // Exponential backoff
      }, delay);
    }
  }


  async updateCursor(cursor: number) {
    await this.db
      .updateTable('sub_state')
      .set({ cursor })
      .where('service', '=', this.service)
      .execute()
  }

  async getCursor(): Promise<{ cursor?: number }> {
    const res = await this.db
      .selectFrom('sub_state')
      .selectAll()
      .where('service', '=', this.service)
      .executeTakeFirst()
    return res ? { cursor: res.cursor } : {}
  }
}


export const getOpsByType = async (evt: Commit): Promise<OperationsByType> => {
  const car = await readCar(evt.blocks)
  const opsByType: OperationsByType = {
    posts: { creates: [], deletes: [] },
  }

  for (const op of evt.ops) {
    const uri = `at://${evt.repo}/${op.path}`
    const [collection] = op.path.split('/')

    if (op.action === 'update') continue // updates not supported yet

    if (op.action === 'create') {
      if (!op.cid) continue
      const recordBytes = car.blocks.get(op.cid)
      if (!recordBytes) continue
      const record = cborToLexRecord(recordBytes)
      const create = { uri, cid: op.cid.toString(), author: evt.repo }
      if (collection === ids.AppBskyFeedPost && isPost(record)) {
        opsByType.posts.creates.push({ record, ...create })
      }
    }

    if (op.action === 'delete') {
      if (collection === ids.AppBskyFeedPost) {
        opsByType.posts.deletes.push({ uri })
      }
    }
  }

  return opsByType
}

type OperationsByType = {
  posts: Operations<PostRecord>
}

type Operations<T = Record<string, unknown>> = {
  creates: CreateOp<T>[]
  deletes: DeleteOp[]
}

type CreateOp<T> = {
  uri: string
  cid: string
  author: string
  record: T
}

type DeleteOp = {
  uri: string
}

export const isPost = (obj: unknown): obj is PostRecord => {
  return isType(obj, ids.AppBskyFeedPost)
}

const isType = (obj: unknown, nsid: string) => {
  try {
    lexicons.assertValidRecord(nsid, fixBlobRefs(obj))
    return true
  } catch (err) {
    return false
  }
}

const fixBlobRefs = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(fixBlobRefs)
  }
  if (obj && typeof obj === 'object') {
    if (obj.constructor.name === 'BlobRef') {
      const blob = obj as BlobRef
      return new BlobRef(blob.ref, blob.mimeType, blob.size, blob.original)
    }
    return Object.entries(obj).reduce((acc, [key, val]) => {
      return Object.assign(acc, { [key]: fixBlobRefs(val) })
    }, {} as Record<string, unknown>)
  }
  return obj
}



// export const getOpsByType = async (evt: Commit): Promise<{ posts: { creates: CreateOp<PostRecord>[]; deletes: DeleteOp[]; } }> => {
//   let car;
//   try {
//     car = await readCar(evt.blocks);
//   } catch (error) {
//     console.error('Failed to read CAR file:', error);
//     throw new Error('Failed to process event due to CAR read error.');
//   }

//   const ops: { posts: { creates: CreateOp<PostRecord>[]; deletes: DeleteOp[]; } } = { posts: { creates: [], deletes: [] } };

//   for (const op of evt.ops) {
//     const uri = `at://${evt.repo}/${op.path}`;
//     const [collection] = op.path.split('/');

//     if (op.action === 'create' && collection === ids.AppBskyFeedPost) {
//       if (!op.cid) continue;
//       const recordBytes = car.blocks.get(op.cid);
//       if (!recordBytes) {
//         console.warn(`No record found for CID ${op.cid}`);
//         continue;
//       }
//       try {
//         const record = cborToLexRecord<PostRecord>(recordBytes);
//         ops.posts.creates.push({ uri, cid: op.cid.toString(), author: evt.repo, record });
//       } catch (error) {
//         console.error(`Failed to decode record for CID ${op.cid}:`, error);
//       }
//     } else if (op.action === 'delete' && collection === ids.AppBskyFeedPost) {
//       ops.posts.deletes.push({ uri });
//     }
//   }

//   return ops;
// };



// type CreateOp<T> = {
//   uri: string
//   cid: string
//   author: string
//   record: T
// }

// type DeleteOp = {
//   uri: string
// }
