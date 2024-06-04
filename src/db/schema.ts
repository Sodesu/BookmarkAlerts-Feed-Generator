export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string;
  indexedAt: string;
  cid: string;
  content: string | null;  // Add content field
  replyParent: string | null;
  replyRoot: string | null;
  parent_uri: string | null;  // Add parent fields
  parent_cid: string | null;
  parent_content: string | null;
  parent_replyParent: string | null;
  parent_replyRoot: string | null;
  parent_indexedAt: string | null;
}

export type SubState = {
  service: string
  cursor: number
}
