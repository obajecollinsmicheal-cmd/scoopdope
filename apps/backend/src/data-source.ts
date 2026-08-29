import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { DatabaseConfigParser } from './common/utils/database-config';

config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isStaging = nodeEnv === 'staging';

// Ensure synchronize is always false for migrations (safety first)
const synchronize = false;

// Validate synchronize setting for safety
if ((isProduction || isStaging) && synchronize) {
  throw new Error(
    `CRITICAL: TypeORM synchronize is enabled in ${nodeEnv} environment. ` +
    `This can cause data loss. Synchronize must be disabled in production and staging.`
  );
}

// Parse database configuration (supports both DATABASE_URL and individual env vars)
const dbConfig = DatabaseConfigParser.parse();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.name,
  entities: isProduction
    ? ['dist/**/*.entity.js']
    : ['src/**/*.entity.ts'],
  migrations: isProduction
    ? ['dist/migrations/*.js']
    : ['src/migrations/*.ts'],
  migrationsTableName: 'schema_migrations',
  migrationsTransactionMode: 'all',
  logging: process.env.DB_LOGGING === 'true' ? ['query', 'error', 'schema'] : ['error', 'schema'],
  ssl: isProduction
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
  },
  synchronize,
};

export const AppDataSource = new DataSource(dataSourceOptions);
