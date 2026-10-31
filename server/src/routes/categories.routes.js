const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, requirePermission } = require('../middleware/auth');
const { categorySchema, listCategories, createCategory, deleteCategory } = require('../controllers/categories.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listCategories);
router.post('/', validate(categorySchema), createCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
