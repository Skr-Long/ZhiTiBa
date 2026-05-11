const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  setDefaultAgent,
  testAgentConnection
} = require('../controllers/aiAgentController');

const router = express.Router();

router.route('/')
  .get(protect, getAgents)
  .post(protect, createAgent);

router.get('/:id', protect, getAgentById);
router.put('/:id', protect, updateAgent);
router.delete('/:id', protect, deleteAgent);
router.post('/:id/default', protect, setDefaultAgent);
router.post('/:id/test', protect, testAgentConnection);

module.exports = router;