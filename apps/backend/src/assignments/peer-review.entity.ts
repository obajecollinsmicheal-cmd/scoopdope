import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { AssignmentSubmission } from './submission.entity';

export interface RubricScore {
  criterionId: string;
  score: number;
  feedback: string;
}

@Entity('peer_reviews')
@Unique(['submissionId', 'reviewerId'])
export class PeerReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  submissionId!: string;

  // Why: peer reviews are dependent on a submission; deleting the submission removes reviews that have no context.
  @ManyToOne(() => AssignmentSubmission, (submission) => submission.peerReviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission!: AssignmentSubmission;

  @Column()
  reviewerId!: string;

  // Why: removes the reviewer's review records when their account is deleted (GDPR-compliant).
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer!: User;

  @Column('jsonb', { default: [] })
  scores!: RubricScore[];

  @Column('text', { nullable: true })
  overallFeedback!: string;

  @Column('boolean', { default: false })
  isSubmitted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
