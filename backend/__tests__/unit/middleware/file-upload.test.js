/**
 * File Upload Middleware - Unit Tests
 *
 * Tests for file-specific validation middleware.
 */

const { validateFileHeaders, validateFileBody } = require('../../../middleware/file-upload');
const { FILE_ATTACHMENTS } = require('../../../config/constants');

describe('File Upload Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: null,
    };
    res = {};
    next = jest.fn();
  });

  describe('validateFileHeaders', () => {
    it('should call next() and set req.fileUpload for valid headers', () => {
      req.headers = {
        'content-type': 'application/pdf',
        'x-filename': 'test.pdf',
        'x-category': 'document',
        'x-description': 'A test file',
      };

      validateFileHeaders(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.fileUpload).toEqual({
        mimeType: 'application/pdf',
        originalFilename: 'test.pdf',
        category: 'document',
        description: 'A test file',
      });
    });

    it('should use default values for optional headers', () => {
      req.headers = {
        'content-type': 'image/png',
      };

      validateFileHeaders(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.fileUpload).toEqual({
        mimeType: 'image/png',
        originalFilename: 'unnamed',
        category: 'attachment',
        description: null,
      });
    });

    it('should call next with 400 error for disallowed MIME type', () => {
      req.headers = {
        'content-type': 'application/x-executable',
      };

      validateFileHeaders(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('not allowed');
    });

    it('should call next with 400 error for missing content-type', () => {
      req.headers = {};

      validateFileHeaders(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('unknown');
    });

    it('should accept all allowed MIME types', () => {
      FILE_ATTACHMENTS.ALLOWED_MIME_TYPES.forEach((mimeType) => {
        req.headers = { 'content-type': mimeType };
        next.mockClear();

        validateFileHeaders(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.fileUpload.mimeType).toBe(mimeType);
      });
    });
  });

  describe('validateFileBody', () => {
    it('should call next() for valid buffer', () => {
      req.body = Buffer.from('test file content');

      validateFileBody(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with 400 error when body is not a buffer', () => {
      req.body = 'not a buffer';

      validateFileBody(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('No file data');
    });

    it('should call next with 400 error when body is null', () => {
      req.body = null;

      validateFileBody(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it('should call next with 400 error when buffer is empty', () => {
      req.body = Buffer.from('');

      validateFileBody(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('No file data');
    });

    it('should call next with 400 error when buffer exceeds max size', () => {
      const oversizedBuffer = Buffer.alloc(FILE_ATTACHMENTS.MAX_FILE_SIZE + 1);
      req.body = oversizedBuffer;

      validateFileBody(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('too large');
    });

    it('should accept buffer at exactly max size', () => {
      const maxSizeBuffer = Buffer.alloc(FILE_ATTACHMENTS.MAX_FILE_SIZE);
      req.body = maxSizeBuffer;

      validateFileBody(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
