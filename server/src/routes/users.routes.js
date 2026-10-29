const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  createUserSchema,
  listUsers,
  listRoles,
  createUser,
  toggleUserStatus,
} = require('../controllers/users.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('users:read'), listUsers);
router.get('/roles', requirePermission('users:read'), listRoles);
router.post('/', requirePermission('users:manage'), validate(createUserSchema), createUser);
router.patch('/:id/status', requirePermission('users:manage'), toggleUserStatus);

module.exports = router;
