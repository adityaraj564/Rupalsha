const express = require('express');
const About = require('../models/About');
const { adminAuth } = require('../middleware/auth');
const upload = require('../utils/upload');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// GET /api/about - Public: get about info
router.get('/', async (req, res, next) => {
  try {
    let about = await About.findOne().lean();
    if (!about) {
      // Seed default data
      about = await About.create({
        companyName: 'Rupalsha',
        tagline: 'Celebrating Indian heritage through modern fashion',
        story: 'Rupalsha was born from a passion for Indian craftsmanship and a desire to make elegant ethnic fashion accessible to every woman. What started as a small dream has grown into a brand that celebrates the rich heritage of Indian textiles while embracing contemporary styles.',
        mission: 'To empower women through fashion that bridges tradition and modernity, offering handpicked ethnic wear that celebrates Indian craftsmanship.',
        vision: 'To become India\'s most loved ethnic fashion destination, where every woman finds pieces that make her feel confident and beautiful.',
        foundedYear: 2025,
        team: [
          { name: 'Ishika Kumari', role: 'Founder', title: 'Founder & CDO', bio: 'Ishika\'s love for Indian textiles and design drives the creative vision of Rupalsha. As Chief Design Officer, she curates every collection with an eye for detail and a passion for celebrating Indian heritage.' },
          { name: 'Aditya Raj', role: 'Co-Founder', title: 'Co-Founder & CEO', bio: 'Aditya brings strategic vision and business acumen to Rupalsha. As CEO, he leads the company\'s growth while ensuring the brand stays true to its mission of making ethnic fashion accessible to all.' },
        ],
      });
    }
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// PUT /api/about - Admin: update about info
router.put('/', adminAuth, async (req, res, next) => {
  try {
    const { companyName, tagline, story, mission, vision, foundedYear } = req.body;
    let about = await About.findOne();
    if (!about) {
      about = new About();
    }
    if (companyName !== undefined) about.companyName = companyName;
    if (tagline !== undefined) about.tagline = tagline;
    if (story !== undefined) about.story = story;
    if (mission !== undefined) about.mission = mission;
    if (vision !== undefined) about.vision = vision;
    if (foundedYear !== undefined) about.foundedYear = Number(foundedYear);

    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// PUT /api/about/cover - Admin: upload cover image
router.put('/cover', adminAuth, upload.single('image'), async (req, res, next) => {
  try {
    let about = await About.findOne();
    if (!about) about = new About();

    // Delete old image if exists
    if (about.coverImage?.public_id) {
      await cloudinary.uploader.destroy(about.coverImage.public_id);
    }

    about.coverImage = {
      url: req.file.path,
      public_id: req.file.filename,
    };
    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// PUT /api/about/team/:index - Admin: update team member
router.put('/team/:index', adminAuth, async (req, res, next) => {
  try {
    const { name, role, title, bio } = req.body;
    const index = Number(req.params.index);
    let about = await About.findOne();
    if (!about) return res.status(404).json({ error: 'About not found' });

    if (index < 0 || index >= about.team.length) {
      return res.status(400).json({ error: 'Invalid team member index' });
    }

    if (name !== undefined) about.team[index].name = name;
    if (role !== undefined) about.team[index].role = role;
    if (title !== undefined) about.team[index].title = title;
    if (bio !== undefined) about.team[index].bio = bio;

    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// PUT /api/about/team/:index/image - Admin: upload team member image
router.put('/team/:index/image', adminAuth, upload.single('image'), async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    let about = await About.findOne();
    if (!about) return res.status(404).json({ error: 'About not found' });

    if (index < 0 || index >= about.team.length) {
      return res.status(400).json({ error: 'Invalid team member index' });
    }

    // Delete old image
    if (about.team[index].image?.public_id) {
      await cloudinary.uploader.destroy(about.team[index].image.public_id);
    }

    about.team[index].image = {
      url: req.file.path,
      public_id: req.file.filename,
    };
    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// POST /api/about/team - Admin: add team member
router.post('/team', adminAuth, async (req, res, next) => {
  try {
    const { name, role, title, bio } = req.body;
    let about = await About.findOne();
    if (!about) about = new About();

    about.team.push({ name, role, title, bio });
    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/about/team/:index - Admin: remove team member
router.delete('/team/:index', adminAuth, async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    let about = await About.findOne();
    if (!about) return res.status(404).json({ error: 'About not found' });

    if (index < 0 || index >= about.team.length) {
      return res.status(400).json({ error: 'Invalid team member index' });
    }

    // Delete image if exists
    if (about.team[index].image?.public_id) {
      await cloudinary.uploader.destroy(about.team[index].image.public_id);
    }

    about.team.splice(index, 1);
    await about.save();
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
