import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_answers')
export class QuizAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questionId: string;

  // Why: quiz answers are options for a question; deleting the question removes its answer options.
  @ManyToOne(() => QuizQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Column('text')
  text: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  order: number;
}
