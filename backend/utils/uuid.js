// UUID wrapper for compatibility with both CommonJS and ESM
// The uuid package v10+ is ESM-only, but we can use v9's CommonJS dist
// This wrapper provides a stable interface regardless of uuid version

const { v4: uuidv4 } = require("uuid");

module.exports = { v4: uuidv4 };
