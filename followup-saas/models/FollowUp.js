const mongoose = require('mongoose');

// One row per follow-up actually sent. This is the duplicate-prevention +
// audit trail: before sending step N for a thread, monitoringService checks
// whether a FollowUp with (thread, step) already exists.
const followUpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },

    step: { type: Number, required: true }, // 1, 2, 3...
    gmailMessageId: { type: String },
    sentAt: { type: Date, default: Date.now },
    preSendReplyCheckPassed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

followUpSchema.index({ thread: 1, step: 1 }, { unique: true });

module.exports = mongoose.model('FollowUp', followUpSchema);
