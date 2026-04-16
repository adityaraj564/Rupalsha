const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

// GET /api/categories - Get all categories as a tree
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Build tree structure
    const tree = buildTree(categories);
    res.json({ categories: tree });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/flat - Get all categories flat (for admin dropdowns)
router.get('/flat', async (req, res, next) => {
  try {
    const { level, parent } = req.query;
    const filter = { isActive: true };
    if (level !== undefined) filter.level = Number(level);
    if (parent) filter.parent = parent;
    if (parent === 'null') filter.parent = null;

    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/:slug - Get category by slug with ancestors & children
router.get('/:slug', async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get all descendants
    const allCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const descendants = getDescendants(allCategories, category._id);

    // Get ancestors
    const ancestors = [];
    let current = category;
    while (current.parent) {
      const parent = allCategories.find(c => c._id.toString() === current.parent.toString());
      if (parent) {
        ancestors.unshift(parent);
        current = parent;
      } else break;
    }

    // Build children tree
    const children = buildTree(allCategories, category._id);

    res.json({
      category,
      ancestors,
      children,
      descendantIds: [category._id, ...descendants.map(d => d._id)],
    });
  } catch (error) {
    next(error);
  }
});

function buildTree(categories, parentId = null) {
  return categories
    .filter(c => {
      if (parentId === null) return c.parent === null;
      return c.parent && c.parent.toString() === parentId.toString();
    })
    .map(c => ({
      ...c,
      children: buildTree(categories, c._id),
    }));
}

function getDescendants(allCategories, parentId) {
  const children = allCategories.filter(c => c.parent && c.parent.toString() === parentId.toString());
  let result = [...children];
  for (const child of children) {
    result = result.concat(getDescendants(allCategories, child._id));
  }
  return result;
}

module.exports = router;
