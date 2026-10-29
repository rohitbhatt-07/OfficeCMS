const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  recordSchema,
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} = require('../controllers/records.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('records:read'), listRecords);
router.get('/:id', requirePermission('records:read'), getRecordById);
router.post('/', requirePermission('records:write'), validate(recordSchema), createRecord);
router.put('/:id', requirePermission('records:write'), validate(recordSchema), updateRecord);
router.delete('/:id', requirePermission('records:delete'), deleteRecord);

module.exports = router;
