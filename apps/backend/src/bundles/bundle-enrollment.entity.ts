import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Bundle } from './bundle.entity';

@Entity('bundle_enrollments')
@Unique(['userId', 'bundleId'])
export class BundleEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Why: enrollment records belong to the user; account deletion should clean them up.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  bundleId: string;

  // Why: if a bundle is removed, its enrollment records have no parent and should be removed too.
  @ManyToOne(() => Bundle, (bundle) => bundle.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bundleId' })
  bundle: Bundle;

  @CreateDateColumn()
  enrolledAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date | null;
}
