import { Logger } from '@nestjs/common';

export class DatabaseConfigValidator {
  private static readonly logger = new Logger(DatabaseConfigValidator.name);

  static validateSynchronizeConfig(nodeEnv: string, synchronize: boolean): void {
    const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

    if (isProduction && synchronize) {
      const errorMessage =
        `CRITICAL: TypeORM synchronize is ENABLED in ${nodeEnv} environment. ` +
        `This can cause data loss by silently modifying the database schema on startup. ` +
        `Synchronize must be disabled in staging and production environments. ` +
        `Only enable synchronize in test/development environments.`;

      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (isProduction && !synchronize) {
      this.logger.log(
        `✓ TypeORM synchronize is correctly disabled in ${nodeEnv} environment`
      );
    }
  }

  static validateSynchronizeNotInSourceCode(sourceCode: string): boolean {
    const synchronizePatterns = [
      /synchronize\s*:\s*true/gi,
      /synchronize\s*=\s*true/gi,
    ];

    const matches = synchronizePatterns.filter((pattern) =>
      pattern.test(sourceCode)
    );

    if (matches.length > 0) {
      this.logger.warn(
        'WARNING: Found hardcoded synchronize: true in source code. ' +
          'This should only be used in test environments.'
      );
      return false;
    }

    return true;
  }
}
