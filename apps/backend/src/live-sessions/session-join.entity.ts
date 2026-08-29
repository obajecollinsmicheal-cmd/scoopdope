import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LiveSession } from './live-session.entity';
import { User } from '../users/user.entity';

@Entity('session_joins')
@Unique(['sessionId', 'userId'])
export class SessionJoin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => LiveSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: LiveSession;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** JWT token issued to the user for joining this session */
  @Column({ nullable: true })
  joinToken: string;

  @CreateDateColumn()
  joinedAt: Date;
}
