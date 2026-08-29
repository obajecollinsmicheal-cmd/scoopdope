export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export class DatabaseConfigParser {
  static parse(): DatabaseConfig {
    // Prefer DATABASE_URL for cloud compatibility
    if (process.env.DATABASE_URL) {
      return this.parseDatabaseUrl(process.env.DATABASE_URL);
    }

    // Fall back to individual environment variables
    return this.parseIndividualEnvVars();
  }

  private static parseDatabaseUrl(url: string): DatabaseConfig {
    try {
      const dbUrl = new URL(url);
      return {
        host: dbUrl.hostname || 'localhost',
        port: dbUrl.port ? parseInt(dbUrl.port, 10) : 5432,
        username: dbUrl.username || '',
        password: dbUrl.password || '',
        name: dbUrl.pathname?.slice(1) || 'scoopdope',
      };
    } catch (error) {
      throw new Error(
        `Failed to parse DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private static parseIndividualEnvVars(): DatabaseConfig {
    const config: DatabaseConfig = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || '',
      password: process.env.DATABASE_PASSWORD || '',
      name: process.env.DATABASE_NAME || 'scoopdope',
    };

    if (!config.username || !config.password) {
      throw new Error(
        'Database credentials are missing. ' +
        'Provide either DATABASE_URL or DATABASE_USER and DATABASE_PASSWORD environment variables.'
      );
    }

    return config;
  }
}
