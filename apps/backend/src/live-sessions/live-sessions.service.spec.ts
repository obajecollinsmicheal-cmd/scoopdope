import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LiveSessionsService } from './live-sessions.service';
import { LiveSession, SessionStatus } from './live-session.entity';
import { SessionJoin } from './session-join.entity';
import { CohortMember } from '../cohorts/cohort-member.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { UpdateLiveSessionDto } from './live-session.dto';

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNER_ID = 'instructor-owner-uuid';
const OTHER_ID = 'instructor-other-uuid';
const SESSION_ID = 'session-uuid-1';
const COHORT_ID = 'cohort-uuid-1';
const USER_ID = 'user-student-uuid-1';
const USER_ID_2 = 'user-student-uuid-2';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<LiveSession> = {}): LiveSession {
  return {
    id: SESSION_ID,
    cohortId: COHORT_ID,
    instructorId: OWNER_ID,
    title: 'Intro to Soroban',
    description: null,
    scheduledAt: new Date('2026-09-01T10:00:00Z'),
    durationMinutes: 60,
    maxCapacity: 2,
    meetingUrl: 'https://zoom.us/j/123456789',
    status: SessionStatus.SCHEDULED,
    remindersSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cohort: null as any,
    instructor: null as any,
    ...overrides,
  };
}

function makeSessionJoin(sessionId: string, userId: string): SessionJoin {
  return {
    id: `join-${sessionId}-${userId}`,
    sessionId,
    userId,
    joinToken: `token-${sessionId}-${userId}`,
    joinedAt: new Date(),
    session: null as any,
    user: null as any,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('LiveSessionsService — ownership enforcement', () => {
  let service: LiveSessionsService;

  const sessionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        { provide: getRepositoryToken(LiveSession), useValue: sessionRepo },
        { provide: getRepositoryToken(CohortMember), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findByIds: jest.fn() } },
        { provide: getRepositoryToken(SessionJoin), useValue: { findOne: jest.fn(), count: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: EmailService, useValue: { enqueue: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3001') },
        },
      ],
    }).compile();

    service = module.get(LiveSessionsService);
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('allows the owning instructor to update their own session', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);
      sessionRepo.save.mockResolvedValue({ ...session, title: 'Updated Title' });

      const dto: UpdateLiveSessionDto = { title: 'Updated Title' };
      const result = await service.update(SESSION_ID, OWNER_ID, dto);

      expect(result.title).toBe('Updated Title');
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ForbiddenException when a different instructor tries to update the session', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ instructorId: OWNER_ID }));

      const dto: UpdateLiveSessionDto = { title: 'Hijacked Title' };

      await expect(service.update(SESSION_ID, OTHER_ID, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      // The session must not be persisted
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the session does not exist', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', OWNER_ID, { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('allows the owning instructor to cancel their own session', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);
      sessionRepo.save.mockResolvedValue({ ...session, status: SessionStatus.CANCELLED });

      const result = await service.cancel(SESSION_ID, OWNER_ID);

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ForbiddenException when a different instructor tries to cancel the session', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ instructorId: OWNER_ID }));

      await expect(service.cancel(SESSION_ID, OTHER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the session does not exist', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('nonexistent-id', OWNER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

// ── joinSession Tests ──────────────────────────────────────────────────────

describe('LiveSessionsService.joinSession', () => {
  let service: LiveSessionsService;

  const sessionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const memberRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const userRepo = {
    find: jest.fn(),
    findByIds: jest.fn(),
  };

  const joinRepo = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        { provide: getRepositoryToken(LiveSession), useValue: sessionRepo },
        { provide: getRepositoryToken(CohortMember), useValue: memberRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SessionJoin), useValue: joinRepo },
        { provide: EmailService, useValue: { enqueue: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3001') },
        },
      ],
    }).compile();

    service = module.get(LiveSessionsService);
  });

  describe('successful join', () => {
    it('allows an enrolled user to join an available session', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      // User is a member of the cohort
      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      // Session has room (1 attendee, capacity 2)
      joinRepo.count.mockResolvedValue(1);

      // User hasn't joined yet
      joinRepo.findOne.mockResolvedValue(null);

      const newJoin = makeSessionJoin(SESSION_ID, USER_ID);
      joinRepo.create.mockReturnValue(newJoin);
      joinRepo.save.mockResolvedValue(newJoin);

      const result = await service.joinSession(SESSION_ID, USER_ID);

      expect(result.sessionId).toBe(SESSION_ID);
      expect(result.userId).toBe(USER_ID);
      expect(joinRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('capacity exceeded', () => {
    it('throws ForbiddenException when session is at full capacity', async () => {
      const session = makeSession({ maxCapacity: 2 });
      sessionRepo.findOne.mockResolvedValue(session);

      // User is a member of the cohort
      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      // Session is at capacity (2 attendees, capacity 2)
      joinRepo.count.mockResolvedValue(2);

      await expect(service.joinSession(SESSION_ID, USER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(joinRepo.create).not.toHaveBeenCalled();
      expect(joinRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException with correct capacity message', async () => {
      const session = makeSession({ maxCapacity: 5 });
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      joinRepo.count.mockResolvedValue(5);

      try {
        await service.joinSession(SESSION_ID, USER_ID);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('at full capacity');
      }
    });
  });

  describe('unenrolled user rejection', () => {
    it('throws ForbiddenException when user is not enrolled in the cohort', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      // User is NOT a member of the cohort
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.joinSession(SESSION_ID, USER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(joinRepo.count).not.toHaveBeenCalled();
      expect(joinRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException with correct unenrolled message', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue(null);

      try {
        await service.joinSession(SESSION_ID, USER_ID);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('not enrolled');
      }
    });
  });

  describe('cancelled session rejection', () => {
    it('throws ForbiddenException when trying to join a cancelled session', async () => {
      const cancelledSession = makeSession({ status: SessionStatus.CANCELLED });
      sessionRepo.findOne.mockResolvedValue(cancelledSession);

      await expect(service.joinSession(SESSION_ID, USER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('returns existing join record if user has already joined', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      joinRepo.count.mockResolvedValue(1);

      const existingJoin = makeSessionJoin(SESSION_ID, USER_ID);
      joinRepo.findOne.mockResolvedValue(existingJoin);

      const result = await service.joinSession(SESSION_ID, USER_ID);

      expect(result).toEqual(existingJoin);
      expect(joinRepo.create).not.toHaveBeenCalled();
      expect(joinRepo.save).not.toHaveBeenCalled();
    });

    it('allows multiple calls without error when user joins again', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      joinRepo.count.mockResolvedValue(1);

      const existingJoin = makeSessionJoin(SESSION_ID, USER_ID);
      joinRepo.findOne.mockResolvedValue(existingJoin);

      // First call
      const result1 = await service.joinSession(SESSION_ID, USER_ID);
      // Second call (idempotent)
      const result2 = await service.joinSession(SESSION_ID, USER_ID);

      expect(result1).toEqual(existingJoin);
      expect(result2).toEqual(existingJoin);
    });
  });

  describe('capacity boundary conditions', () => {
    it('allows join when session has exactly one spot remaining', async () => {
      const session = makeSession({ maxCapacity: 3 });
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      // 2 attendees, 1 spot remaining
      joinRepo.count.mockResolvedValue(2);

      joinRepo.findOne.mockResolvedValue(null);

      const newJoin = makeSessionJoin(SESSION_ID, USER_ID);
      joinRepo.create.mockReturnValue(newJoin);
      joinRepo.save.mockResolvedValue(newJoin);

      const result = await service.joinSession(SESSION_ID, USER_ID);

      expect(result).toBeDefined();
      expect(joinRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects join when session is exactly at capacity', async () => {
      const session = makeSession({ maxCapacity: 2 });
      sessionRepo.findOne.mockResolvedValue(session);

      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);

      // Exactly at capacity
      joinRepo.count.mockResolvedValue(2);

      await expect(service.joinSession(SESSION_ID, USER_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('session not found', () => {
    it('throws NotFoundException when session does not exist', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.joinSession(SESSION_ID, USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('multiple users joining', () => {
    it('allows multiple different users to join up to capacity', async () => {
      const session = makeSession({ maxCapacity: 2 });

      // First user joins
      sessionRepo.findOne.mockResolvedValue(session);
      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID } as any);
      joinRepo.count.mockResolvedValue(0);
      joinRepo.findOne.mockResolvedValue(null);

      const join1 = makeSessionJoin(SESSION_ID, USER_ID);
      joinRepo.create.mockReturnValue(join1);
      joinRepo.save.mockResolvedValue(join1);

      const result1 = await service.joinSession(SESSION_ID, USER_ID);
      expect(result1).toBeDefined();

      // Second user joins
      sessionRepo.findOne.mockResolvedValue(session);
      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: USER_ID_2 } as any);
      joinRepo.count.mockResolvedValue(1); // Now 1 attendee
      joinRepo.findOne.mockResolvedValue(null);

      const join2 = makeSessionJoin(SESSION_ID, USER_ID_2);
      joinRepo.create.mockReturnValue(join2);
      joinRepo.save.mockResolvedValue(join2);

      const result2 = await service.joinSession(SESSION_ID, USER_ID_2);
      expect(result2).toBeDefined();

      // Third user cannot join (capacity reached)
      sessionRepo.findOne.mockResolvedValue(session);
      memberRepo.findOne.mockResolvedValue({ cohortId: COHORT_ID, userId: 'user-3' } as any);
      joinRepo.count.mockResolvedValue(2); // Now 2 attendees, at capacity

      await expect(service.joinSession(SESSION_ID, 'user-3')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
