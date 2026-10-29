const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const { categorySchema, listCategories, createCategory } = require('../controllers/categories.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listCategories);
router.post('/', requirePermission('settings:manage'), validate(categorySchema), createCategory);

module.exports = router;
