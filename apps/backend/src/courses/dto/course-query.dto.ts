import { IsOptional, IsString, IsIn } from 'class-validator';
import { Trim, Sanitize } from 'class-sanitizer';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CourseQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search on title and description' })
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  search?: string;

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Filter by course level',
  })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  level?: string;

  @ApiPropertyOptional({ description: 'Filter by BCP-47 language code (e.g. "en", "es", "fr")' })
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  language?: string;

}
