import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ unique: true })
  keyHash!: string;

  @Column({ default: true })
  isActive!: boolean;

  // Why: API keys belong to a user; deleting the user removes their API access (GDPR-compliant).
  @ManyToOne(() => User)
  user!: User;

  @Column()
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastUsedAt!: Date | null;
}
