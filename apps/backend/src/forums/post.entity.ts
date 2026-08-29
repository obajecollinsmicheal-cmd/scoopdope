import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from '../courses/course.entity';
import { User } from '../users/user.entity';
import { Reply } from './reply.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  // Why: forum posts belong to a course; deleting the course removes its entire forum.
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  userId: string;

  // Why: removes a user's forum posts on account deletion; consider SET NULL to preserve course discussion content.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ nullable: true })
  answerReplyId: string | null;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @OneToMany(() => Reply, (reply) => reply.post)
  replies: Reply[];

  @CreateDateColumn()
  createdAt: Date;
}
