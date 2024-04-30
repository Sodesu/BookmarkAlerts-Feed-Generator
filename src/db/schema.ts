export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string;
  cid: string;
  replyParent: string | null;
  replyRoot: string | null;
  indexedAt: string;      
  scheduledDate: string | null;
  responseSent: boolean;
}

export type SubState = {
  service: string
  cursor: number
}
