const express = require('express');
const Blog = require('../models/Blog');
const Product = require('../models/Product');
const { subAdminAuth } = require('../middleware/auth');
const upload = require('../utils/upload').blogsOptimized;
const cloudinary = require('../config/cloudinary');
const cache = require('../utils/cache');
const { logActivity } = require('../utils/activityLog');
const { broadcastToAllUsers } = require('../utils/notification');
const { uploadErrorHandler, runUpload } = require('../utils/uploadError');

const router = express.Router();

// ─── PUBLIC ROUTES ───

// GET /api/blogs - List published blogs with search, category filter, pagination
router.get('/', async (req, res, next) => {
  try {
    const { search, category, featured, page = 1, limit = 9 } = req.query;

    const cacheKey = `blogs:${search || ''}:${category || ''}:${featured || ''}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const filter = { status: 'published' };

    if (category) {
      filter.category = { $regex: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }
    if (featured === 'true') filter.isFeatured = true;
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { shortDescription: searchRegex },
        { tags: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(30, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-content -metaKeywords')
        .sort({ isFeatured: -1, sortOrder: 1, publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const result = {
      blogs,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    };

    cache.set(cacheKey, result, 180); // 3 min cache
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs/categories - List all blog categories
router.get('/categories', async (req, res, next) => {
  try {
    const cached = cache.get('blog:categories');
    if (cached) return res.json(cached);

    const categories = await Blog.distinct('category', { status: 'published' });
    cache.set('blog:categories', categories, 300);
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs/:slug - Get single blog by slug
router.get('/:slug', async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' })
      .populate('relatedProducts', 'name slug price comparePrice images averageRating numReviews sizes')
      .lean();

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Increment view count (fire-and-forget)
    Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({ blog });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ROUTES ───

// GET /api/blogs/admin/all - Admin: list all blogs (including drafts)
router.get('/admin/all', subAdminAuth, async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && ['draft', 'published'].includes(status)) filter.status = status;
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { shortDescription: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-content')
        .sort({ sortOrder: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    res.json({
      blogs,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs/admin/:id - Admin: get single blog by ID (for editing)
router.get('/admin/:id', subAdminAuth, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json({ blog });
  } catch (error) {
    next(error);
  }
});

// POST /api/blogs/admin - Admin: create blog
router.post('/admin', subAdminAuth, runUpload(upload.single('featuredImage')), async (req, res, next) => {
  try {
    const {
      title, slug, shortDescription, content, category, tags,
      author, status, isFeatured, sortOrder,
      metaTitle, metaDescription, metaKeywords, relatedProducts,
    } = req.body;

    const blog = new Blog({
      title,
      shortDescription,
      content,
      category: category || 'General',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [],
      author: author || 'Rupalsha',
      status: status || 'published',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      metaTitle,
      metaDescription,
      metaKeywords,
      relatedProducts: relatedProducts ? (typeof relatedProducts === 'string' ? JSON.parse(relatedProducts) : relatedProducts) : [],
    });

    // Allow custom slug
    if (slug) blog.slug = slug;

    if (req.file) {
      blog.featuredImage = {
        url: req.file.path,
        public_id: req.file.filename,
        alt: title,
      };
    }

    await blog.save();
    cache.clear();
    logActivity({ action: 'create', section: 'blog', description: `Created blog: ${blog.title}`, user: req.user });

    // Broadcast — only when initially published
    if (blog.status === 'published') {
      broadcastToAllUsers({
        category: 'alert',
        type: 'blog.published',
        title: `New blog: ${blog.title}`,
        message: blog.shortDescription || 'A new article has been published on Rupalsha. Tap to read.',
        link: `/blog/${blog.slug}`,
        meta: { blogId: blog._id, slug: blog.slug, category: blog.category },
      });
    }

    res.status(201).json({ blog });
  } catch (error) {
    next(error);
  }
});

// PUT /api/blogs/admin/:id - Admin: update blog
router.put('/admin/:id', subAdminAuth, runUpload(upload.single('featuredImage')), async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    const previousStatus = blog.status;

    const {
      title, slug, shortDescription, content, category, tags,
      author, status, isFeatured, sortOrder,
      metaTitle, metaDescription, metaKeywords, relatedProducts,
    } = req.body;

    if (title !== undefined) blog.title = title;
    if (slug !== undefined) blog.slug = slug;
    if (shortDescription !== undefined) blog.shortDescription = shortDescription;
    if (content !== undefined) blog.content = content;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags;
    if (author !== undefined) blog.author = author;
    if (status !== undefined) blog.status = status;
    if (isFeatured !== undefined) blog.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (sortOrder !== undefined) blog.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (metaKeywords !== undefined) blog.metaKeywords = metaKeywords;
    if (relatedProducts !== undefined) {
      blog.relatedProducts = typeof relatedProducts === 'string' ? JSON.parse(relatedProducts) : relatedProducts;
    }

    if (req.file) {
      // Delete old image
      if (blog.featuredImage?.public_id) {
        await cloudinary.uploader.destroy(blog.featuredImage.public_id);
      }
      blog.featuredImage = {
        url: req.file.path,
        public_id: req.file.filename,
        alt: title || blog.title,
      };
    }

    await blog.save();
    cache.clear();
    logActivity({ action: 'update', section: 'blog', description: `Updated blog: ${blog.title}`, user: req.user });

    // Broadcast only on draft -> published transition (not on edits to already-published posts)
    if (previousStatus !== 'published' && blog.status === 'published') {
      broadcastToAllUsers({
        category: 'alert',
        type: 'blog.published',
        title: `New blog: ${blog.title}`,
        message: blog.shortDescription || 'A new article has been published on Rupalsha. Tap to read.',
        link: `/blog/${blog.slug}`,
        meta: { blogId: blog._id, slug: blog.slug, category: blog.category },
      });
    }

    res.json({ blog });
  } catch (error) {
    next(error);
  }
});

// PUT /api/blogs/admin/:id/toggle - Admin: toggle publish status
router.put('/admin/:id/toggle', subAdminAuth, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    blog.status = blog.status === 'published' ? 'draft' : 'published';
    if (blog.status === 'published') blog.publishedAt = new Date();
    await blog.save();
    cache.clear();
    logActivity({ action: 'toggle', section: 'blog', description: `${blog.status === 'published' ? 'Published' : 'Unpublished'} blog: ${blog.title}`, user: req.user });
    res.json({ blog, message: `Blog ${blog.status === 'published' ? 'published' : 'unpublished'} successfully` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/blogs/admin/:id - Admin: delete blog
router.delete('/admin/:id', subAdminAuth, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    // Delete image from Cloudinary
    if (blog.featuredImage?.public_id) {
      await cloudinary.uploader.destroy(blog.featuredImage.public_id);
    }

    await blog.deleteOne();
    cache.clear();
    logActivity({ action: 'delete', section: 'blog', description: `Deleted blog: ${blog.title}`, user: req.user });
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.use(uploadErrorHandler('blogs'));

module.exports = router;
