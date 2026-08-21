const express = require('express');
const { listRecruiters, addRecruiter, getRecruiterById, updateRecruiter, deleteRecruiter } = require('../controllers/recruitersController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/',     requireAuth, listRecruiters);
router.post('/',    requireAuth, requireRole('ORG_ADMIN'), addRecruiter);
router.get('/:id',  requireAuth, getRecruiterById);
router.put('/:id',  requireAuth, requireRole('ORG_ADMIN'), updateRecruiter);
router.delete('/:id', requireAuth, requireRole('ORG_ADMIN'), deleteRecruiter);

module.exports = router;
