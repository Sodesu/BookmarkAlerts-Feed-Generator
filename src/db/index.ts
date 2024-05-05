import dotenv from 'dotenv'
dotenv.config();
import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { DatabaseSchema } from './schema';
import { migrationProvider } from './migrations';
import { Pool } from 'pg';
import fs from 'fs';



export const createDb = (): Kysely<DatabaseSchema> => {
  // Ensure the CA certificate path is defined
  const caPath = process.env.AWS_RDS_CA_PATH;
  if (!caPath) {
    throw new Error('The AWS RDS CA path isnt defined properly.');
  }

  const pool = new Pool({
    connectionString: process.env.FEEDGEN_DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync(caPath)
    }
  });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: pool
    }),
  });
};

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
