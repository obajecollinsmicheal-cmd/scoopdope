import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from './post.entity';

@Entity('replies')
export class Reply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  postId: string;

  // Why: replies are children of a post; deleting the post removes all its replies to prevent orphan content.
  @ManyToOne(() => Post, (post) => post.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  userId: string;

  // Why: removes a user's replies on account deletion; consider SET NULL to keep forum threads intact.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isAnswer: boolean;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @CreateDateColumn()
  createdAt: Date;
}
