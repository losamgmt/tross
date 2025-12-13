// UUID wrapper for Jest compatibility
// The uuid package v9+ uses ES modules which Jest has trouble with
// This wrapper provides a CommonJS interface

let uuidv4;

try {
  // Try the ES module version first (for newer Node.js)
  const uuid = require('uuid');
  uuidv4 = uuid.v4;
} catch (error) {
  // If that fails, try to dynamically import (for very new Node)
  // In Jest, we'll just use a fallback
  if (process.env.NODE_ENV === 'test') {
    // Simple UUID v4 generator for tests
    uuidv4 = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  } else {
    throw error;
  }
}

module.exports = { v4: uuidv4 };
