import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { User } from '../users/user.entity';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surveyId: string;

  // Why: responses only exist in context of a survey; deleting the survey removes all its responses.
  @ManyToOne(() => Survey, (s) => s.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  @Column()
  userId: string;

  // Why: removes user survey submissions on account deletion; isAnonymous flag preserves aggregate intent.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb')
  answers: Record<string, string | number>;

  @Column({ default: false })
  isAnonymous: boolean;

  @CreateDateColumn()
  submittedAt: Date;
}
