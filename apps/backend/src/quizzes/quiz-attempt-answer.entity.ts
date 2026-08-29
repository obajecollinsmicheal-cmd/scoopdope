import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attemptId: string;

  // Why: answers belong to an attempt; deleting the attempt removes all its recorded answers.
  @ManyToOne(() => QuizAttempt, (a) => a.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: QuizAttempt;

  @Column()
  questionId: string;

  // Why: if a question is deleted, the recorded answers to that question are meaningless.
  @ManyToOne(() => QuizQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Column('text')
  answer: string;

  @Column({ type: 'float', nullable: true })
  points: number;
}
