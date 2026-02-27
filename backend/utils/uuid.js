// UUID wrapper using Node.js native crypto.randomUUID()
// No external dependency needed - Node 14.17+ has native UUID v4 support

const crypto = require('crypto');

module.exports = { v4: () => crypto.randomUUID() };
