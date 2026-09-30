const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    gmailThreadId: { type: String, required: true },
    subject: { type: String },
    recipientEmail: { type: String, required: true },

    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'REPLY_RECEIVED', 'COMPLETED'],
      default: 'ACTIVE',
      index: true,
    },

    // Which step of the follow-up sequence we're on (0 = initial email sent, waiting for follow-up 1)
    currentStep: { type: Number, default: 0 },

    // Overrides the user's followUpDefaults.delaysDays if set
    delaysDays: { type: [Number] },

    // Overrides the user's followUpDefaults.messageTemplate if set --
    // written when the thread is created, from the "New thread" form.
    messageTemplate: { type: String },

    lastMessageSentAt: { type: Date, default: Date.now },
    nextFollowUpAt: { type: Date },

    replyDetectedAt: { type: Date },
    replySnippet: { type: String },
  },
  { timestamps: true }
);

// A tenant can never see another tenant's thread — every route enforces
// { user: req.user.id } on top of this, this index just makes it fast.
threadSchema.index({ user: 1, gmailThreadId: 1 }, { unique: true });

module.exports = mongoose.model('Thread', threadSchema);
