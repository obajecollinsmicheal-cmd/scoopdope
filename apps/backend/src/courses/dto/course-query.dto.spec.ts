import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CourseQueryDto } from './course-query.dto';

describe('CourseQueryDto', () => {
  it('rejects limits above 100', async () => {
    const dto = plainToInstance(CourseQueryDto, { limit: 101 });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });
});
