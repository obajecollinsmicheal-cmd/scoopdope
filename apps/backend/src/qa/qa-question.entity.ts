import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

@Entity('qa_questions')
export class QaQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  // Why: Q&A questions are scoped to a course; deleting the course removes the entire discussion thread.
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  userId: string;

  // Why: removes a user's Q&A contributions on account deletion; consider SET NULL to preserve course discussions.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text')
  body: string;

  @Column({ nullable: true })
  timestampSeconds: number;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ nullable: true, type: 'text' })
  answer: string;

  @Column({ nullable: true })
  answeredByUserId: string;

  @Column({ nullable: true, type: 'timestamptz' })
  answeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
