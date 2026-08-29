import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_RESET_REQUEST = 'auth.password_reset.request',
  PASSWORD_RESET_COMPLETE = 'auth.password_reset.complete',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  API_KEY_CREATED = 'apikey.created',
  API_KEY_REVOKED = 'apikey.revoked',
  API_KEY_ROTATED = 'apikey.rotated',
  API_KEY_USED = 'apikey.used',
  ADMIN_ACTION = 'admin.action',
  ROLE_CHANGED = 'admin.role_changed',
  USER_BANNED = 'admin.user_banned',
  USER_DELETED = 'admin.user_deleted',
  USER_BULK_DELETED = 'admin.user_bulk_deleted',
  SECRET_ROTATED = 'secret.rotated',
  GDPR_DATA_EXPORT = 'gdpr.data_export',
  GDPR_ACCOUNT_DELETION = 'gdpr.account_deletion',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string | null;

  @Column()
  action: string;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ default: true })
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
