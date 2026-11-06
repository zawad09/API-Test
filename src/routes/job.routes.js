const express = require('express');

const jobController = require('../controllers/job.controller');
const validate = require('../middleware/validate.middleware');
const { jobQuerySchema } = require('../validators/job.validator');
const { objectIdSchema } = require('../validators/analysis.validator');
const z = require('zod');

const router = express.Router();

const idParamSchema = z.object({ id: objectIdSchema('id') });

router.get('/', validate({ query: jobQuerySchema }), jobController.listJobs);
router.get('/:id', validate({ params: idParamSchema }), jobController.getJob);

module.exports = router;
