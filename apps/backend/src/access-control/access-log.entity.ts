import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from '../courses/course.entity';
import { User } from '../users/user.entity';

export enum AccessAttemptType {
  PAYMENT = 'payment',
  TOKEN = 'token',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

@Entity('access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  // Why: access logs are security audit records; deleting a course removes its history (consider SET NULL to retain audit trail).
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  userId: string;

  // Why: security audit logs are removed with user account deletion (consider SET NULL to retain audit trail for compliance).
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  action: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ default: true })
  isAllowed: boolean;

  @Column({ nullable: true })
  denialReason: string;

  @Column({ type: 'enum', enum: AccessAttemptType, nullable: true })
  attemptType: AccessAttemptType | null;

  @Column({ nullable: true })
  contentId: string | null;

  @CreateDateColumn()
  timestamp: Date;
}
