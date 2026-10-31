const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const { deptSchema, listDepartments, createDepartment, deleteDepartment } = require('../controllers/departments.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listDepartments);
router.post('/', validate(deptSchema), createDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
