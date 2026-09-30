const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const Thread = require('../models/Thread');
const FollowUp = require('../models/FollowUp');

// Helper: Auto-convert any Gmail URL, Hash, Encoded string, or Numeric ID to 16-char Hex ID
const normalizeThreadId = (input) => {
  if (!input) return '';
  let str = String(input).trim();

  // 1. Full Gmail URL carrying "th=" parameter
  if (str.includes('th=')) {
    const match = str.match(/th=([a-fA-F0-9]+)/);
    if (match) return match[1].toLowerCase();
  }

  // 2. Hash / Inbox URL format (e.g. https://mail.google.com/mail/u/0/#inbox/FMfcgz...)
  if (str.includes('#inbox/')) str = str.split('#inbox/')[1];
  if (str.includes('#sent/')) str = str.split('#sent/')[1];
  if (str.includes('#all/')) str = str.split('#all/')[1];
  if (str.includes('#search/')) str = str.split('#search/').pop();

  // 3. Encoded / Message-ID format (%3A1877606... or msg-f:1877606...)
  if (str.includes('%3A')) str = str.split('%3A')[1];
  if (str.includes('msg-f:')) str = str.split('msg-f:')[1];

  // 4. Decimal/Numeric format (e.g. 1877606369615479042 -> 1a0e990b0f10102)
  if (/^\d+$/.test(str)) {
    try {
      return BigInt(str).toString(16).toLowerCase();
    } catch (e) {
      console.error("Failed to convert numeric ID to hex on backend:", e);
    }
  }

  return str.toLowerCase();
};

// Every query below filters by `user: req.user._id` — this is the tenant boundary.

router.get('/', requireAuth, async (req, res) => {
  const threads = await Thread.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ threads });
});

router.post(
  '/',
  requireAuth,
  [
    body('gmailThreadId').notEmpty(),
    body('recipientEmail').isEmail(),
    body('subject').optional().isString(),
    body('delaysDays').optional().isArray({ min: 1 }),
    body('delaysDays.*').optional().isInt({ min: 1 }),
    body('messageTemplate').optional().isString().isLength({ max: 5000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (!req.user.gmail?.connected) {
      return res.status(400).json({ error: 'Connect your Gmail account before creating a follow-up thread' });
    }

    let { gmailThreadId, recipientEmail, subject, delaysDays, messageTemplate } = req.body;

    // Normalize input to standard 16-char Hex format
    gmailThreadId = normalizeThreadId(gmailThreadId);

    const delays = delaysDays?.length ? delaysDays : req.user.followUpDefaults.delaysDays;

    try {
      const thread = await Thread.create({
        user: req.user._id,
        gmailThreadId,
        recipientEmail,
        subject,
        delaysDays: delays,
        messageTemplate: messageTemplate?.trim() || undefined,
        lastMessageSentAt: new Date(),
        nextFollowUpAt: new Date(Date.now() + delays[0] * 24 * 60 * 60 * 1000),
      });
      res.status(201).json({ thread });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'This Gmail thread is already being tracked' });
      }
      throw err;
    }
  }
);

router.get('/:id', requireAuth, async (req, res) => {
  const thread = await Thread.findOne({ _id: req.params.id, user: req.user._id });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const followUps = await FollowUp.find({ thread: thread._id }).sort({ step: 1 });
  res.json({ thread, followUps });
});

router.patch('/:id/pause', requireAuth, async (req, res) => {
  const thread = await Thread.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'ACTIVE' },
    { $set: { status: 'PAUSED' } },
    { new: true }
  );
  if (!thread) return res.status(404).json({ error: 'Active thread not found' });
  res.json({ thread });
});

router.patch('/:id/resume', requireAuth, async (req, res) => {
  const thread = await Thread.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: { $in: ['PAUSED', 'REPLY_RECEIVED'] } },
    { $set: { status: 'ACTIVE' } },
    { new: true }
  );
  if (!thread) return res.status(404).json({ error: 'Paused thread not found' });
  res.json({ thread });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const result = await Thread.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Thread not found' });
  await FollowUp.deleteMany({ thread: req.params.id });
  res.json({ ok: true });
});

module.exports = router;