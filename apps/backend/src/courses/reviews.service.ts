import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from './course.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Review } from './review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>
  ) {}

  async create(courseId: string, userId: string, dto: CreateReviewDto) {
    await this.ensureCourseExists(courseId);

    const existing = await this.reviewRepo.findOne({ where: { courseId, userId } });
    if (existing) {
      throw new ConflictException('You have already reviewed this course');
    }

    const enrollment = await this.enrollmentRepo.findOne({
      where: { courseId, userId },
    });

    if (!enrollment || !enrollment.completedAt) {
      throw new UnprocessableEntityException(
        'Only users with completed enrollments can review this course'
      );
    }

    const review = this.reviewRepo.create({
      courseId,
      userId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
    });

    return this.reviewRepo.save(review);
  }

  async findByCourse(courseId: string, query: ReviewQueryDto = {}) {
    await this.ensureCourseExists(courseId);

    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { courseId },
      order: { createdAt: 'DESC' },
      relations: ['user'],
      skip: offset,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async flagReview(courseId: string, reviewId: string) {
    await this.ensureCourseExists(courseId);
    const review = await this.reviewRepo.findOne({ where: { id: reviewId, courseId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    review.flagged = true;
    return this.reviewRepo.save(review);
  }

  private async ensureCourseExists(courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, isDeleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }
}
