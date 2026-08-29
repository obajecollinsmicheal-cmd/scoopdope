import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

export enum DownloadStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('download_items')
export class DownloadItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Why: download records belong to a user; deleting the user removes their download history.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  courseId: string;

  // Why: if a course is deleted, the download records for it have no context and should be cleaned up.
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  lessonId: string;

  @Column({ nullable: true })
  lessonTitle: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ type: 'enum', enum: DownloadStatus, default: DownloadStatus.PENDING })
  status: DownloadStatus;

  @CreateDateColumn()
  createdAt: Date;
}
