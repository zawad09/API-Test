const express = require('express');

const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { updateProfileSchema } = require('../validators/user.validator');

const router = express.Router();

router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, validate({ body: updateProfileSchema }), userController.updateProfile);

module.exports = router;
