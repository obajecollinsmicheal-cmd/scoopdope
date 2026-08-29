import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from '../users/user.entity';

@Entity('course_versions')
export class CourseVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  // Why: course versions document course history; deleting the course makes versions meaningless.
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  versionTag: string; // e.g. "v1.0", "v2.0"

  @Column({ default: 1 })
  versionNumber: number;

  @Column('jsonb')
  snapshot: Record<string, any>; // full course + modules + lessons snapshot

  @Column({ nullable: true, type: 'text' })
  changeNote: string;

  @Column({ nullable: true })
  createdById: string;

  // Why: SET NULL preserves version history if creator account is deleted; maintains audit trail.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
