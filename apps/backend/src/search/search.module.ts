import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchAnalytic } from './search-analytic.entity';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        node: config.get<string>('elasticsearch.node') || 'http://localhost:9200',
        auth: config.get<string>('elasticsearch.apiKey')
          ? { apiKey: config.get<string>('elasticsearch.apiKey')! }
          : undefined,
        maxRetries: 3,
        requestTimeout: 15_000,
        maxIdleSockets: 10,
        minIdleSockets: 2,
        sniffOnStart: false,
        sniffOnConnectionFault: false,
      }),
    }),
    TypeOrmModule.forFeature([SearchAnalytic]),
  ],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
