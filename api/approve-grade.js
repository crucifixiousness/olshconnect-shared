const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Deprecated: per-student approval is no longer supported. Use class-level endpoints.
module.exports = async (req, res) => {
  return res.status(410).json({
    error: 'Per-student grade approval has been retired. Use /api/approve-class-grades instead.'
  });
};
