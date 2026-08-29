import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surveyId: string;

  // Why: survey questions are part of a survey; deleting the survey removes its questions to prevent orphan content.
  @ManyToOne(() => Survey, (s) => s.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  @Column()
  text: string;

  @Column({ type: 'enum', enum: ['rating', 'text', 'mcq'] })
  type: 'rating' | 'text' | 'mcq';

  @Column({ type: 'simple-array', nullable: true })
  options: string[];

  @Column({ type: 'int' })
  order: number;

  @Column({ default: true })
  required: boolean;
}
