const express = require('express');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');

const router = express.Router();

// POST /api/contact
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().isLength({ max: 5000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;
    await Contact.create({ name, email, subject, message });
    res.status(201).json({ message: 'Message sent successfully. We will get back to you soon.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
