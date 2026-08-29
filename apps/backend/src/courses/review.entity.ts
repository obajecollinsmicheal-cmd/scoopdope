import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from './course.entity';

@Entity('reviews')
@Unique(['userId', 'courseId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Why: reviews belong to a user; deleting the user removes their reviews (GDPR-compliant).
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  courseId: string;

  // Why: if a course is deleted, reviews about it are removed to prevent orphan reviews.
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ default: false })
  flagged: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
