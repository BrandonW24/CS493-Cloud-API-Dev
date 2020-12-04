const router = module.exports = require('express').Router();

router.use('/boats', require('./boats'));
router.use('/loads', require('./load'));
router.use('/login', require('./login'));
router.use('/users',require('./users'));