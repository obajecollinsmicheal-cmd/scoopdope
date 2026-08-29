import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cohort } from '../cohorts/cohort.entity';
import { User } from '../users/user.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('live_sessions')
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cohortId: string;

  // Why: live sessions are tied to a cohort; deleting the cohort removes its scheduled sessions.
  @ManyToOne(() => Cohort, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cohortId' })
  cohort: Cohort;

  @Column()
  instructorId: string;

  // Why: instructor deletion removes scheduled sessions; consider SET NULL to preserve sessions for enrolled students.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ default: 60 })
  durationMinutes: number;

  /** Maximum number of participants allowed in this session */
  @Column({ default: 100 })
  maxCapacity: number;

  /** Zoom or Google Meet URL */
  @Column({ nullable: true })
  meetingUrl: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  /** Track which reminder intervals have been sent (e.g. ['24h', '1h']) */
  @Column({ type: 'simple-array', nullable: true, default: null })
  remindersSent: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
