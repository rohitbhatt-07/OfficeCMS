const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { listAuditLogs } = require('../controllers/audit.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', requirePermission('audit:read'), listAuditLogs);

module.exports = router;
