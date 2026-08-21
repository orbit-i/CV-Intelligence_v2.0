const express = require('express');
const { listCandidates, getCandidateById, createCandidate, updateCandidate, deleteCandidate } = require('../controllers/candidatesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/',     requireAuth, listCandidates);
router.post('/',    requireAuth, createCandidate);
router.get('/:id',  requireAuth, getCandidateById);
router.put('/:id',  requireAuth, updateCandidate);
router.delete('/:id', requireAuth, deleteCandidate);

module.exports = router;
