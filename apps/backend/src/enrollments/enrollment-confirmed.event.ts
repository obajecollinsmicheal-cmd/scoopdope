/**
 * Emitted after a course enrollment has been confirmed on-chain.
 * Downstream analytics modules listen for this event via @OnEvent('enrollment.confirmed').
 */
export class EnrollmentConfirmedEvent {
  /** UUID of the saved enrollment record */
  readonly enrollmentId: string;

  /** UUID of the enrolled user */
  readonly userId: string;

  /** UUID of the course */
  readonly courseId: string;

  /** Soroban transaction hash from the on-chain enrollment recording */
  readonly transactionHash: string;

  /** Timestamp at which the enrollment was saved */
  readonly enrolledAt: Date;

  constructor(params: {
    enrollmentId: string;
    userId: string;
    courseId: string;
    transactionHash: string;
    enrolledAt: Date;
  }) {
    this.enrollmentId = params.enrollmentId;
    this.userId = params.userId;
    this.courseId = params.courseId;
    this.transactionHash = params.transactionHash;
    this.enrolledAt = params.enrolledAt;
  }
}
