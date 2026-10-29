const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const { deptSchema, listDepartments, createDepartment } = require('../controllers/departments.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listDepartments);
router.post('/', requirePermission('settings:manage'), validate(deptSchema), createDepartment);

module.exports = router;
