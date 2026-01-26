/**
 * Sessions Service - Unit Tests
 *
 * Comprehensive tests covering all branches of sessions-service.
 */

// Mock dependencies
jest.mock('../../../db/connection');
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const SessionsService = require('../../../services/sessions-service');
const db = require('../../../db/connection');

describe('SessionsService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient = jest.fn().mockResolvedValue(mockClient);
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions with user info', async () => {
      db.query.mockResolvedValue({
        rows: [{
          session_id: 1,
          user_id: 10,
          login_time: new Date(),
          last_used_at: new Date(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          expires_at: new Date(),
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          user_status: 'active',
          role_name: 'admin',
        }],
      });

      const result = await SessionsService.getActiveSessions();

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(1);
      expect(result[0].user.email).toBe('test@example.com');
      expect(result[0].user.fullName).toBe('Test User');
      expect(result[0].user.role).toBe('admin');
    });

    it('should return empty array when no active sessions', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await SessionsService.getActiveSessions();

      expect(result).toEqual([]);
    });

    it('should handle user with no name (use email)', async () => {
      db.query.mockResolvedValue({
        rows: [{
          session_id: 1,
          user_id: 10,
          login_time: new Date(),
          last_used_at: new Date(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          expires_at: new Date(),
          email: 'test@example.com',
          first_name: null,
          last_name: null,
          user_status: 'active',
          role_name: 'admin',
        }],
      });

      const result = await SessionsService.getActiveSessions();

      expect(result[0].user.fullName).toBe('test@example.com');
    });
  });

  describe('getUserSessions', () => {
    it('should return sessions for specific user', async () => {
      db.query.mockResolvedValue({
        rows: [{
          session_id: 1,
          login_time: new Date(),
          last_used_at: new Date(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          expires_at: new Date(),
        }],
      });

      const result = await SessionsService.getUserSessions(5);

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(1);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    it('should return empty array when user has no sessions', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await SessionsService.getUserSessions(999);

      expect(result).toEqual([]);
    });
  });

  describe('forceLogoutUser', () => {
    it('should suspend user and revoke all tokens', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Get user
          rows: [{ id: 10, email: 'test@example.com', first_name: 'Test', last_name: 'User', status: 'active' }],
        })
        .mockResolvedValueOnce({ rows: [{ status: 'suspended' }] }) // Update user
        .mockResolvedValueOnce({ rowCount: 3, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }) // Revoke tokens
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await SessionsService.forceLogoutUser(10, 1, 'Security concern');

      expect(result.success).toBe(true);
      expect(result.user.previousStatus).toBe('active');
      expect(result.user.newStatus).toBe('suspended');
      expect(result.revokedSessionCount).toBe(3);
      expect(result.reason).toBe('Security concern');
    });

    it('should throw when trying to logout self', async () => {
      await expect(SessionsService.forceLogoutUser(1, 1))
        .rejects.toThrow('Cannot force logout yourself');
    });

    it('should throw when user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(SessionsService.forceLogoutUser(999, 1))
        .rejects.toThrow('User with ID 999 not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Error on user query

      await expect(SessionsService.forceLogoutUser(10, 1))
        .rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle user with only first name', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          rows: [{ id: 10, email: 'test@example.com', first_name: 'Test', last_name: null, status: 'active' }],
        })
        .mockResolvedValueOnce({ rows: [{ status: 'suspended' }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce(undefined);

      const result = await SessionsService.forceLogoutUser(10, 1);

      expect(result.user.fullName).toBe('Test');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      db.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 5, user_id: 10 }],
      });

      const result = await SessionsService.revokeSession(5, 1);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(5);
      expect(result.userId).toBe(10);
    });

    it('should throw when session not found', async () => {
      db.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await expect(SessionsService.revokeSession(999, 1))
        .rejects.toThrow('Session 999 not found or already revoked');
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate a suspended user', async () => {
      db.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 10, email: 'test@example.com', first_name: 'Test', last_name: 'User', status: 'active' }],
      });

      const result = await SessionsService.reactivateUser(10, 1);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(10);
      expect(result.user.status).toBe('active');
    });

    it('should throw when user not found or not suspended', async () => {
      db.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await expect(SessionsService.reactivateUser(999, 1))
        .rejects.toThrow('User 999 not found or not suspended');
    });

    it('should handle user with no name', async () => {
      db.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 10, email: 'test@example.com', first_name: null, last_name: null, status: 'active' }],
      });

      const result = await SessionsService.reactivateUser(10, 1);

      expect(result.user.fullName).toBe('test@example.com');
    });
  });
});
