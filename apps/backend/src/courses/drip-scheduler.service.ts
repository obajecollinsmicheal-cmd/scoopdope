import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributedLockService } from '../common/distributed-lock.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModulesService } from './modules.service';
import { Enrollment } from '../enrollments/enrollment.entity';
import { User } from '../users/user.entity';
import { Course } from './course.entity';

@Injectable()
export class DripSchedulerService {
  private readonly logger = new Logger(DripSchedulerService.name);

  constructor(
    private modulesService: ModulesService,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    private eventEmitter: EventEmitter2,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUnlockedModules() {
    const lockKey = 'lock:cron:courses:checkUnlockedModules';
    const result = await this.distributedLockService.withLock(lockKey, async () => {
      const justUnlocked = await this.modulesService.findJustUnlocked();
      if (!justUnlocked.length) return;

      for (const mod of justUnlocked) {
        const enrollments = await this.enrollmentRepo.find({
          where: { courseId: mod.courseId },
        });
        if (!enrollments.length) continue;

        const [course, users] = await Promise.all([
          this.courseRepo.findOne({ where: { id: mod.courseId } }),
          this.userRepo.findByIds(enrollments.map((e) => e.userId)),
        ]);

        for (const user of users) {
          this.eventEmitter.emit('module.unlocked', {
            userId: user.id,
            userEmail: user.email,
            userName: user.username ?? user.email,
            courseId: mod.courseId,
            courseTitle: course?.title ?? mod.courseId,
            moduleTitle: mod.title,
          });
        }

        this.logger.log(`Emitted module.unlocked for module "${mod.title}" to ${users.length} learner(s)`);
      }
    }, 60);

    if (result === null) {
      this.logger.debug('Skipping drip module unlock scheduler because another instance holds the lock');
    }
  }
}
