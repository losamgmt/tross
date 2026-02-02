/**
 * Sub-Entity Middleware - Unit Tests
 *
 * Tests for the generic sub-entity middleware.
 */

const {
  attachParentMetadata,
  requireParentPermission,
  requireServiceConfigured,
  requireParentExists,
  getActionVerb,
} = require('../../../middleware/sub-entity');

describe('Sub-Entity Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      permissions: {
        hasPermission: jest.fn(),
      },
      params: { id: '123' },
    };
    res = {};
    next = jest.fn();
  });

  describe('attachParentMetadata', () => {
    it('should attach metadata to request and call next', () => {
      const metadata = { entityKey: 'work_order', rlsResource: 'work_order' };

      attachParentMetadata(metadata)(req, res, next);

      expect(req.parentMetadata).toBe(metadata);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireParentPermission', () => {
    beforeEach(() => {
      req.parentMetadata = { entityKey: 'work_order', rlsResource: 'work_order' };
    });

    it('should call next() when user has permission', () => {
      req.permissions.hasPermission.mockReturnValue(true);

      requireParentPermission('update')(req, res, next);

      expect(req.permissions.hasPermission).toHaveBeenCalledWith('work_order', 'update');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with 403 error when user lacks permission', () => {
      req.permissions.hasPermission.mockReturnValue(false);

      requireParentPermission('update')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("don't have permission");
    });

    it('should call next with 500 error when metadata is missing', () => {
      req.parentMetadata = null;
      req.entityMetadata = null;

      requireParentPermission('read')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(500);
    });

    it('should fall back to entityMetadata if parentMetadata is missing', () => {
      req.parentMetadata = null;
      req.entityMetadata = { entityKey: 'contract', rlsResource: 'contract' };
      req.permissions.hasPermission.mockReturnValue(true);

      requireParentPermission('read')(req, res, next);

      expect(req.permissions.hasPermission).toHaveBeenCalledWith('contract', 'read');
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle missing permissions object gracefully', () => {
      req.permissions = null;

      requireParentPermission('read')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe('getActionVerb', () => {
    it('should return "view" for read', () => {
      expect(getActionVerb('read')).toBe('view');
    });

    it('should return "add to" for create', () => {
      expect(getActionVerb('create')).toBe('add to');
    });

    it('should return "modify" for update', () => {
      expect(getActionVerb('update')).toBe('modify');
    });

    it('should return "delete from" for delete', () => {
      expect(getActionVerb('delete')).toBe('delete from');
    });

    it('should return operation name for unknown operations', () => {
      expect(getActionVerb('archive')).toBe('archive');
    });
  });

  describe('requireServiceConfigured', () => {
    it('should call next() when service is configured', () => {
      const checkFn = jest.fn().mockReturnValue(true);

      requireServiceConfigured(checkFn, 'File storage')(req, res, next);

      expect(checkFn).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with 503 error when service is not configured', () => {
      const checkFn = jest.fn().mockReturnValue(false);

      requireServiceConfigured(checkFn, 'File storage')(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(503);
      expect(error.message).toContain('File storage');
      expect(error.message).toContain('not configured');
    });
  });

  describe('requireParentExists', () => {
    beforeEach(() => {
      req.parentMetadata = { entityKey: 'work_order', rlsResource: 'work_order' };
    });

    it('should call next() and set parentId when entity exists', async () => {
      const existsFn = jest.fn().mockResolvedValue(true);

      await requireParentExists(existsFn)(req, res, next);

      expect(existsFn).toHaveBeenCalledWith('work_order', 123);
      expect(req.parentId).toBe(123);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with 404 error when entity does not exist', async () => {
      const existsFn = jest.fn().mockResolvedValue(false);

      await requireParentExists(existsFn)(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('work_order');
      expect(error.message).toContain('123');
    });

    it('should propagate errors from existsFn', async () => {
      const dbError = new Error('Database connection failed');
      const existsFn = jest.fn().mockRejectedValue(dbError);

      await requireParentExists(existsFn)(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
