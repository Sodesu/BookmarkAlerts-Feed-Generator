import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { DatabaseSchema } from './schema';
import { migrationProvider } from './migrations';
import { Pool } from 'pg';

export const createDb = (): Database => {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.FEEDGEN_DATABASE_URL
      }),
    }),
  })
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
