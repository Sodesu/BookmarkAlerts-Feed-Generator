import { Kysely, Migration, MigrationProvider } from 'kysely';

const migrations: Record<string, Migration> = {};

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

migrations['001'] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable('post')
      .addColumn('uri', 'varchar', (col) => col.primaryKey())
      .addColumn('cid', 'varchar', (col) => col.notNull())
      .addColumn('content', 'text') // Add content column
      .addColumn('replyParent', 'varchar')
      .addColumn('replyRoot', 'varchar')
      .addColumn('indexedAt', 'varchar', (col) => col.notNull())
      .addColumn('parent_uri', 'varchar') // Add parent columns
      .addColumn('parent_cid', 'varchar')
      .addColumn('parent_content', 'text')
      .addColumn('parent_replyParent', 'varchar')
      .addColumn('parent_replyRoot', 'varchar')
      .addColumn('parent_indexedAt', 'varchar')
      .execute();

    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'varchar', (col) => col.primaryKey())
      .addColumn('cursor', 'integer', (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable('post').execute();
    await db.schema.dropTable('sub_state').execute();
  },
};

migrations['002'] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .alterTable('post')
      .addColumn('content', 'text')
      .addColumn('parent_uri', 'varchar')
      .addColumn('parent_cid', 'varchar')
      .addColumn('parent_content', 'text')
      .addColumn('parent_replyParent', 'varchar')
      .addColumn('parent_replyRoot', 'varchar')
      .addColumn('parent_indexedAt', 'varchar')
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema
      .alterTable('post')
      .dropColumn('content')
      .dropColumn('parent_uri')
      .dropColumn('parent_cid')
      .dropColumn('parent_content')
      .dropColumn('parent_replyParent')
      .dropColumn('parent_replyRoot')
      .dropColumn('parent_indexedAt')
      .execute();
  },
};
