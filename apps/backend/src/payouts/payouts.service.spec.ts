import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { PayoutsService } from './payouts.service';
import { Payout } from './payout.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { ConfigService } from '@nestjs/config';
import { KycService } from '../kyc/kyc.service';

function makeEnrollment(id: string, courseId: string, completedAt: Date | null): Enrollment {
  return {
    id,
    userId: `user-${id}`,
    courseId,
    enrolledAt: new Date('2026-01-01'),
    completedAt,
    enrolledVersionNumber: 1,
    transactionHash: null,
    user: null as any,
    course: null as any,
  };
}

function makeCourse(id: string, instructorId: string | null): Course {
  return {
    id,
    instructorId,
    instructor: instructorId ? { id: instructorId, email: `${instructorId}@test.com` } as any : null,
  } as any;
}

describe('PayoutsService — calculatePayouts pagination', () => {
  let service: PayoutsService;
  let enrollmentsRepo: jest.Mocked<Repository<Enrollment>>;
  let coursesRepo: jest.Mocked<Repository<Course>>;
  let payoutsRepo: jest.Mocked<Repository<Payout>>;
  let configService: jest.Mocked<ConfigService>;

  const START_DATE = new Date('2026-01-01');
  const END_DATE = new Date('2026-12-31');
  const COURSE_ID = 'course-uuid-1';
  const INSTRUCTOR_ID = 'instructor-uuid-1';

  beforeEach(async () => {
    const mockEnrollmentsRepo: Partial<jest.Mocked<Repository<Enrollment>>> = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockCoursesRepo: Partial<jest.Mocked<Repository<Course>>> = {
      find: jest.fn(),
    };

    const mockPayoutsRepo: Partial<jest.Mocked<Repository<Payout>>> = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockConfigService: Partial<jest.Mocked<ConfigService>> = {
      get: jest.fn(),
    };

    const mockKycService: Partial<jest.Mocked<KycService>> = {
      isApproved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentsRepo },
        { provide: getRepositoryToken(Course), useValue: mockCoursesRepo },
        { provide: getRepositoryToken(Payout), useValue: mockPayoutsRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: KycService, useValue: mockKycService },
      ],
    }).compile();

    service = module.get(PayoutsService);
    enrollmentsRepo = module.get(getRepositoryToken(Enrollment));
    coursesRepo = module.get(getRepositoryToken(Course));
    payoutsRepo = module.get(getRepositoryToken(Payout));
    configService = module.get(ConfigService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'PLATFORM_FEE_PERCENT') return 20;
      if (key === `COURSE_PRICE_${COURSE_ID}`) return 100;
      if (key === 'payouts.batchSize') return 500;
      return defaultValue;
    });
  });

  it('processes 2500 enrollments across 5 paginated batches', async () => {
    const courses = [makeCourse(COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    const allEnrollments = Array.from({ length: 2500 }, (_, i) =>
      makeEnrollment(`enrollment-${i}`, COURSE_ID, new Date('2026-06-01')),
    );

    const batchSize = 500;
    let callCount = 0;

    enrollmentsRepo.find.mockImplementation((options: any) => {
      const skip = options?.skip ?? 0;
      const take = options?.take ?? batchSize;
      const batch = allEnrollments.slice(skip, skip + take);
      callCount++;
      return Promise.resolve(batch);
    });

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    const result = await service.calculatePayouts(START_DATE, END_DATE);

    expect(enrollmentsRepo.find).toHaveBeenCalledTimes(6);

    for (let i = 0; i < 5; i++) {
      expect(enrollmentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ courseId: COURSE_ID }),
          order: { id: 'ASC' },
          skip: i * batchSize,
          take: batchSize,
        }),
      );
    }

    expect(enrollmentsRepo.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skip: 2500,
        take: batchSize,
      }),
    );

    expect(payoutsRepo.create).toHaveBeenCalledTimes(1);
    const createdPayout = payoutsRepo.create.mock.calls[0][0];
    
    const grossRevenue = 2500 * 100; // $250,000
    const stripePercentageFee = grossRevenue * 0.029; // 2.9% = $7,250
    const stripeFixedFee = 0.30 * 2500; // $750
    const expectedStripeFee = stripePercentageFee + stripeFixedFee; // $8,000
    const expectedNetRevenue = grossRevenue - expectedStripeFee; // $242,000
    const expectedPlatformFee = expectedNetRevenue * 0.2; // $48,400
    const expectedInstructorShare = expectedNetRevenue - expectedPlatformFee; // $193,600
    
    expect(createdPayout.totalRevenue).toBe(250000);
    expect(createdPayout.stripeFee).toBeCloseTo(8000, 2);
    expect(createdPayout.platformFee).toBeCloseTo(48400, 2);
    expect(createdPayout.instructorShare).toBeCloseTo(193600, 2);
  });

  it('does not call find() once with no limit', async () => {
    const courses = [makeCourse(COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    const allEnrollments = Array.from({ length: 1500 }, (_, i) =>
      makeEnrollment(`enrollment-${i}`, COURSE_ID, new Date('2026-06-01')),
    );

    enrollmentsRepo.find.mockImplementation((options: any) => {
      const skip = options?.skip ?? 0;
      const take = options?.take ?? 500;
      return Promise.resolve(allEnrollments.slice(skip, skip + take));
    });

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    await service.calculatePayouts(START_DATE, END_DATE);

    expect(enrollmentsRepo.find).toHaveBeenCalledTimes(4);

    const firstCallArgs = enrollmentsRepo.find.mock.calls[0][0] as any;
    expect(firstCallArgs).toHaveProperty('take');
    expect(firstCallArgs.take).toBe(500);
  });

  it('skips courses with no instructor', async () => {
    const courses = [makeCourse(COURSE_ID, null)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    const result = await service.calculatePayouts(START_DATE, END_DATE);

    expect(enrollmentsRepo.find).not.toHaveBeenCalled();
    expect(payoutsRepo.create).not.toHaveBeenCalled();
  });

  it('skips courses with zero completions', async () => {
    const courses = [makeCourse(COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    enrollmentsRepo.find.mockResolvedValueOnce([]);

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    await service.calculatePayouts(START_DATE, END_DATE);

    expect(payoutsRepo.create).not.toHaveBeenCalled();
  });

  it('continues processing remaining batches when one batch fetch fails', async () => {
    const courses = [makeCourse(COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    const allEnrollments = Array.from({ length: 1500 }, (_, i) =>
      makeEnrollment(`enrollment-${i}`, COURSE_ID, new Date('2026-06-01')),
    );

    let callCount = 0;
    enrollmentsRepo.find.mockImplementation((options: any) => {
      callCount++;
      const skip = options?.skip ?? 0;
      const take = options?.take ?? 500;

      if (callCount === 2) {
        throw new Error('DB connection timeout');
      }

      return Promise.resolve(allEnrollments.slice(skip, skip + take));
    });

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    await service.calculatePayouts(START_DATE, END_DATE);

    expect(enrollmentsRepo.find).toHaveBeenCalledTimes(4);

    const createdPayout = payoutsRepo.create.mock.calls[0][0];
    
    const grossRevenue = 1000 * 100; // $100,000
    const stripePercentageFee = grossRevenue * 0.029; // $2,900
    const stripeFixedFee = 0.30 * 1000; // $300
    const expectedStripeFee = stripePercentageFee + stripeFixedFee; // $3,200
    const expectedNetRevenue = grossRevenue - expectedStripeFee; // $96,800
    const expectedPlatformFee = expectedNetRevenue * 0.2; // $19,360
    const expectedInstructorShare = expectedNetRevenue - expectedPlatformFee; // $77,440
    
    expect(createdPayout.totalRevenue).toBe(100000);
    expect(createdPayout.stripeFee).toBeCloseTo(3200, 2);
    expect(createdPayout.platformFee).toBeCloseTo(19360, 2);
    expect(createdPayout.instructorShare).toBeCloseTo(77440, 2);
  });

  // ── Stripe Fee Deduction Tests ─────────────────────────────────────────────

  it('deducts Stripe fees (2.9% + $0.30 per completion) from gross revenue before calculating payout', async () => {
    const courses = [makeCourse(COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    const COMPLETION_COUNT = 10;
    const COURSE_PRICE = 50.00; // $50 per course
    const completedEnrollments = Array.from({ length: COMPLETION_COUNT }, (_, i) =>
      makeEnrollment(`enrollment-${i}`, COURSE_ID, new Date('2026-06-01')),
    );

    enrollmentsRepo.find.mockResolvedValueOnce(completedEnrollments);
    enrollmentsRepo.find.mockResolvedValueOnce([]); // End of pagination

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'PLATFORM_FEE_PERCENT') return 20;
      if (key === `COURSE_PRICE_${COURSE_ID}`) return COURSE_PRICE;
      if (key === 'payouts.batchSize') return 500;
      return defaultValue;
    });

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    await service.calculatePayouts(START_DATE, END_DATE);

    expect(payoutsRepo.create).toHaveBeenCalledTimes(1);
    const createdPayout = payoutsRepo.create.mock.calls[0][0];

    const grossRevenue = COMPLETION_COUNT * COURSE_PRICE; // 10 * $50 = $500
    const stripePercentageFee = grossRevenue * 0.029; // 2.9% of $500 = $14.50
    const stripeFixedFee = 0.30 * COMPLETION_COUNT; // $0.30 * 10 = $3.00
    const expectedStripeFee = stripePercentageFee + stripeFixedFee; // $14.50 + $3.00 = $17.50

    const expectedNetRevenue = grossRevenue - expectedStripeFee; // $500 - $17.50 = $482.50
    const expectedPlatformFee = expectedNetRevenue * 0.20; // 20% of $482.50 = $96.50
    const expectedInstructorShare = expectedNetRevenue - expectedPlatformFee; // $482.50 - $96.50 = $386.00

    expect(createdPayout.totalRevenue).toBeCloseTo(500, 2);
    expect(createdPayout.stripeFee).toBeCloseTo(17.50, 2);
    expect(createdPayout.platformFee).toBeCloseTo(96.50, 2);
    expect(createdPayout.instructorShare).toBeCloseTo(386.00, 2);
  });

  it('correctly handles minimum $0.30 Stripe fee for very small transactions', async () => {
    const SMALL_COURSE_ID = 'small-course-id';
    const courses = [makeCourse(SMALL_COURSE_ID, INSTRUCTOR_ID)];
    coursesRepo.find.mockResolvedValueOnce(courses as any);

    const COMPLETION_COUNT = 1;
    const SMALL_COURSE_PRICE = 5.00; // $5 course
    const completedEnrollments = [
      makeEnrollment('enrollment-1', SMALL_COURSE_ID, new Date('2026-06-01')),
    ];

    enrollmentsRepo.find.mockResolvedValueOnce(completedEnrollments);
    enrollmentsRepo.find.mockResolvedValueOnce([]);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'PLATFORM_FEE_PERCENT') return 20;
      if (key === `COURSE_PRICE_${SMALL_COURSE_ID}`) return SMALL_COURSE_PRICE;
      if (key === 'payouts.batchSize') return 500;
      return defaultValue;
    });

    payoutsRepo.save.mockResolvedValueOnce([] as any);

    await service.calculatePayouts(START_DATE, END_DATE);

    expect(payoutsRepo.create).toHaveBeenCalledTimes(1);
    const createdPayout = payoutsRepo.create.mock.calls[0][0];

    const grossRevenue = 1 * 5.00; // $5.00
    const stripePercentageFee = grossRevenue * 0.029; // 2.9% of $5 = $0.145
    const stripeFixedFee = 0.30 * 1; // $0.30
    const expectedStripeFee = stripePercentageFee + stripeFixedFee; // $0.145 + $0.30 = $0.445

    const expectedNetRevenue = grossRevenue - expectedStripeFee; // $5.00 - $0.445 = $4.555
    const expectedPlatformFee = expectedNetRevenue * 0.20; // 20% of $4.555 = $0.911
    const expectedInstructorShare = expectedNetRevenue - expectedPlatformFee; // $4.555 - $0.911 = $3.644

    expect(createdPayout.totalRevenue).toBeCloseTo(5.00, 2);
    expect(createdPayout.stripeFee).toBeCloseTo(0.445, 3);
    expect(createdPayout.platformFee).toBeCloseTo(0.911, 3);
    expect(createdPayout.instructorShare).toBeCloseTo(3.644, 3);
  });
});
