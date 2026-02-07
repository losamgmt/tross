/**
 * Database Error Handler Tests
 *
 * Focus: Branch coverage for all PostgreSQL error code paths
 * Tests every switch case and conditional branch
 */

// Mock logger BEFORE imports
jest.mock("../../../config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock response-formatter BEFORE imports
jest.mock("../../../utils/response-formatter", () => ({
  badRequest: jest.fn(),
  conflict: jest.fn(),
}));

// Now import after mocks are set up
const {
  handleDbError,
  buildDbErrorConfig,
  PG_ERROR_CODES,
} = require("../../../utils/db-error-handler");
const ResponseFormatter = require("../../../utils/response-formatter");

// Get ImmutableFieldError - needs actual import since we test instanceof
const { ImmutableFieldError } = require("../../../db/helpers/update-helper");

// Mock response object
const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("db-error-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PG_ERROR_CODES", () => {
    it("exports all expected PostgreSQL error codes", () => {
      expect(PG_ERROR_CODES.FOREIGN_KEY_VIOLATION).toBe("23503");
      expect(PG_ERROR_CODES.UNIQUE_VIOLATION).toBe("23505");
      expect(PG_ERROR_CODES.CHECK_VIOLATION).toBe("23514");
      expect(PG_ERROR_CODES.NOT_NULL_VIOLATION).toBe("23502");
      expect(PG_ERROR_CODES.INVALID_DATETIME_FORMAT).toBe("22007");
      expect(PG_ERROR_CODES.DATETIME_FIELD_OVERFLOW).toBe("22008");
      expect(PG_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE).toBe("22003");
      expect(PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION).toBe("22P02");
    });

    it("is frozen (immutable)", () => {
      expect(Object.isFrozen(PG_ERROR_CODES)).toBe(true);
    });
  });

  describe("buildDbErrorConfig", () => {
    it("builds config from metadata with tableName", () => {
      const metadata = {
        tableName: "contracts",
        identityField: "contract_number",
        foreignKeys: {
          customer_id: { table: "customers", displayName: "Customer" },
          technician_id: { table: "technicians" },
        },
      };

      const config = buildDbErrorConfig(metadata);

      expect(config.entityName).toBe("Contract");
      expect(config.uniqueFields.contract_number).toBe("Contract Number");
      expect(config.foreignKeys.customer_id).toBe("Customer");
      expect(config.foreignKeys.technician_id).toBe("technicians");
    });

    it("handles metadata without tableName", () => {
      const metadata = {};
      const config = buildDbErrorConfig(metadata);

      expect(config.entityName).toBe("Resource");
    });

    it("handles metadata without identityField", () => {
      const metadata = { tableName: "items" };
      const config = buildDbErrorConfig(metadata);

      expect(config.uniqueFields).toEqual({});
    });

    it("handles metadata without foreignKeys", () => {
      const metadata = { tableName: "items" };
      const config = buildDbErrorConfig(metadata);

      expect(config.foreignKeys).toEqual({});
    });

    it("converts snake_case identityField to Title Case", () => {
      const metadata = {
        tableName: "users",
        identityField: "email_address",
      };

      const config = buildDbErrorConfig(metadata);
      expect(config.uniqueFields.email_address).toBe("Email Address");
    });
  });

  describe("handleDbError", () => {
    describe("non-database errors", () => {
      it("returns false for errors without code", () => {
        const res = createMockRes();
        const error = new Error("Generic error");

        const handled = handleDbError(error, res);

        expect(handled).toBe(false);
        expect(res.status).not.toHaveBeenCalled();
      });

      it("returns false for errors with non-string code", () => {
        const res = createMockRes();
        const error = new Error("Generic error");
        error.code = 12345; // number, not string

        const handled = handleDbError(error, res);

        expect(handled).toBe(false);
      });

      it("returns false for errors with invalid code format", () => {
        const res = createMockRes();
        const error = new Error("Generic error");
        error.code = "ECONNREFUSED"; // Not a 5-digit PG code

        const handled = handleDbError(error, res);

        expect(handled).toBe(false);
      });

      it("returns false for unknown 5-digit error codes", () => {
        const res = createMockRes();
        const error = new Error("Unknown error");
        error.code = "99999";

        const handled = handleDbError(error, res);

        expect(handled).toBe(false);
      });
    });

    describe("ImmutableFieldError", () => {
      it("handles ImmutableFieldError with 400 response", () => {
        const res = createMockRes();
        const error = new ImmutableFieldError(["id", "created_at"]);

        const handled = handleDbError(error, res, { entityName: "User" });

        expect(handled).toBeTruthy();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: "Bad Request",
            violations: ["id", "created_at"],
          }),
        );
      });
    });

    describe("FOREIGN_KEY_VIOLATION (23503)", () => {
      it("handles FK violation - referenced record not found", () => {
        const res = createMockRes();
        const error = new Error("Foreign key violation");
        error.code = "23503";
        error.detail =
          'Key (customer_id)=(999) is not present in table "customers"';

        const handled = handleDbError(error, res, {
          entityName: "Contract",
          foreignKeys: { customer_id: "Customer" },
        });

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("Customer not found"),
        );
      });

      it("handles FK violation - delete blocked by references", () => {
        const res = createMockRes();
        const error = new Error("Foreign key violation");
        error.code = "23503";
        error.detail = 'Key (id)=(5) is still referenced from table "users"';

        const handled = handleDbError(error, res, {
          entityName: "Role",
        });

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("still referenced by users"),
        );
      });

      it("handles FK violation without detail", () => {
        const res = createMockRes();
        const error = new Error("Foreign key violation");
        error.code = "23503";
        // No error.detail

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
      });

      it("handles FK violation with unknown foreign key field", () => {
        const res = createMockRes();
        const error = new Error("Foreign key violation");
        error.code = "23503";
        error.detail = "Key (unknown_id)=(999) is not present";

        const handled = handleDbError(error, res, {
          foreignKeys: {}, // unknown_id not in config
        });

        expect(handled).toBe(true);
      });
    });

    describe("UNIQUE_VIOLATION (23505)", () => {
      it("handles unique violation with known field", () => {
        const res = createMockRes();
        const error = new Error("Unique violation");
        error.code = "23505";
        // The regex extracts the field name from constraint: "users_email_key" -> "email"
        error.message =
          'duplicate key value violates unique constraint "users_email_key"';

        const handled = handleDbError(error, res, {
          uniqueFields: { email: "Email" },
        });

        expect(handled).toBe(true);
        expect(ResponseFormatter.conflict).toHaveBeenCalledWith(
          res,
          expect.stringContaining("Email already exists"),
        );
      });

      it("handles unique violation with unknown field", () => {
        const res = createMockRes();
        const error = new Error("Unique violation");
        error.code = "23505";
        error.message = "unique constraint violation";

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.conflict).toHaveBeenCalled();
      });
    });

    describe("CHECK_VIOLATION (23514)", () => {
      it("handles check constraint violation", () => {
        const res = createMockRes();
        const error = new Error("Check violation");
        error.code = "23514";
        error.detail = "Failing row contains (invalid_status)";

        const handled = handleDbError(error, res, { entityName: "Order" });

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("Invalid value"),
        );
      });
    });

    describe("NOT_NULL_VIOLATION (23502)", () => {
      it("handles not null violation", () => {
        const res = createMockRes();
        const error = new Error("Not null violation");
        error.code = "23502";
        error.detail = 'Failing row contains (null) for column "name"';

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("cannot be empty"),
        );
      });
    });

    describe("DATETIME errors (22007, 22008)", () => {
      it("handles invalid datetime format (22007)", () => {
        const res = createMockRes();
        const error = new Error("Invalid datetime");
        error.code = "22007";

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("date"),
        );
      });

      it("handles datetime field overflow (22008)", () => {
        const res = createMockRes();
        const error = new Error("Datetime overflow");
        error.code = "22008";

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalled();
      });
    });

    describe("NUMERIC errors (22003, 22P02)", () => {
      it("handles numeric value out of range (22003)", () => {
        const res = createMockRes();
        const error = new Error("Numeric out of range");
        error.code = "22003";

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("out of allowed range"),
        );
      });

      it("handles invalid text representation (22P02)", () => {
        const res = createMockRes();
        const error = new Error("Invalid text");
        error.code = "22P02";

        const handled = handleDbError(error, res);

        expect(handled).toBe(true);
        expect(ResponseFormatter.badRequest).toHaveBeenCalled();
      });
    });

    describe("field extraction", () => {
      it("extracts field from FK detail pattern", () => {
        const res = createMockRes();
        const error = new Error("FK error");
        error.code = "23503";
        error.detail = "Key (role_id)=(99) is not present";

        handleDbError(error, res, {
          foreignKeys: { role_id: "Role" },
        });

        expect(ResponseFormatter.badRequest).toHaveBeenCalledWith(
          res,
          expect.stringContaining("Role not found"),
        );
      });

      it("extracts field from unique constraint name", () => {
        const res = createMockRes();
        const error = new Error("Unique error");
        error.code = "23505";
        error.message = 'violates unique constraint "users_email_key"';

        handleDbError(error, res, {
          uniqueFields: { email: "Email address" },
        });

        expect(ResponseFormatter.conflict).toHaveBeenCalledWith(
          res,
          expect.stringContaining("Email address already exists"),
        );
      });
    });
  });
});
