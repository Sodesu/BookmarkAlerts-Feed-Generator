import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { DatabaseSchema } from './schema';
import { migrationProvider } from './migrations';
import { Pool } from 'pg';
import fs from 'fs';



export const createDb = (): Kysely<DatabaseSchema> => {
  const pool = new Pool({
    connectionString: process.env.FEEDGEN_DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('path/to/aws-rds-ca-cert.pem') // Adjust the path to your AWS RDS CA certificate
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
