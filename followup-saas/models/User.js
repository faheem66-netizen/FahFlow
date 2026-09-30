const mongoose = require('mongoose');

// Each User document is one tenant. Every other collection (Thread, FollowUp)
// stores a `user` reference and every query in the app is scoped by it —
// that scoping is what makes this multi-tenant rather than a shared pool.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Firebase Auth is the source of truth for login/signup (email/password
    // and Google sign-in both flow through it on the client). This is the
    // link back to that identity -- no passwords or Google ids are stored here.
    firebaseUid: { type: String, required: true, unique: true, index: true },
    avatarUrl: { type: String },

    // Separate from login: this is the Gmail account the automation is allowed
    // to read/send from. A user can log in with email/password and still
    // connect a Gmail account (or connect the same Google account used to log in).
    gmail: {
      connected: { type: Boolean, default: false },
      emailAddress: { type: String },
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      tokenExpiryDate: { type: Number }, // epoch ms, from Google's expiry_date
    },

    // Per-tenant follow-up defaults (used by monitoringService, overridable per thread)
    followUpDefaults: {
      delaysDays: { type: [Number], default: [3, 5, 7, 15, 20] },
      // The user's own wording for follow-ups. {{step}} is replaced with the
      // follow-up number (1, 2, 3...) when a message is actually sent.
      messageTemplate: {
        type: String,
        default:
          'Hi,\n\nJust following up on my previous message (follow-up #{{step}}). Let me know if you have any questions.\n\nBest regards',
      },
    },

    plan: { type: String, enum: ['free', 'pro'], default: 'free' }, // ready for billing later
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
