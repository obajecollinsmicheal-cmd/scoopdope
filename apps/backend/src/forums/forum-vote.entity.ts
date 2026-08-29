import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type VoteDirection = 'up' | 'down';
export type VoteTarget = 'post' | 'reply';

@Entity('forum_votes')
@Index(['userId', 'targetType', 'targetId'], { unique: true })
export class ForumVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Why: votes belong to a user; deleting the user removes their voting history.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 10 })
  targetType: VoteTarget;

  @Column()
  targetId: string;

  @Column({ type: 'varchar', length: 4 })
  direction: VoteDirection;

  @CreateDateColumn()
  createdAt: Date;
}
