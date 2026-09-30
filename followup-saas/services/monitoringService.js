const cron = require('node-cron');
const User = require('../models/User');
const Thread = require('../models/Thread');
const FollowUp = require('../models/FollowUp');
const gmailService = require('./gmailService');

// Runs on the cron schedule in .env (default every 5 minutes).
async function runFollowUpCheck() {
  console.log('[monitoring] Running follow-up check worker...');

  const users = await User.find({ 'gmail.connected': true });
  console.log(`[monitoring] Found ${users.length} users with Gmail connected.`);

  for (const user of users) {
    const dueThreads = await Thread.find({
      user: user._id,
      status: 'ACTIVE',
      nextFollowUpAt: { $lte: new Date() },
    });

    console.log(`[monitoring] User ${user._id} has ${dueThreads.length} due threads.`);

    for (const thread of dueThreads) {
      try {
        await processThread(user, thread);
      } catch (err) {
        console.error(`[monitoring] Error processing user=${user._id} thread=${thread._id}:`, err.message);
      }
    }
  }
}

async function processThread(user, thread) {
  const delays = thread.delaysDays?.length ? thread.delaysDays : user.followUpDefaults.delaysDays;

  // Safe step check (handles undefined currentStep)
  const currentStep = thread.currentStep || 0;
  const nextStep = currentStep + 1;
  const isFinalStep = nextStep > delays.length;

  console.log(`[monitoring] Processing thread ${thread.gmailThreadId} | Current Step: ${currentStep} -> Next Step: ${nextStep}`);

  // Fresh Gmail reply check
  const replyCheck = await gmailService.isGenuineClientReply(
    user._id,
    thread.gmailThreadId,
    user.gmail.emailAddress,
    thread.lastMessageSentAt
  );

  if (replyCheck.found) {
    console.log(`[monitoring] Reply detected for thread ${thread._id}. Stopping follow-ups.`);
    thread.status = 'REPLY_RECEIVED';
    thread.replyDetectedAt = new Date();
    thread.replySnippet = replyCheck.snippet;
    thread.nextFollowUpAt = null;
    await thread.save();
    return;
  }

  if (isFinalStep) {
    console.log(`[monitoring] Sequence complete for thread ${thread._id}. Marking as COMPLETED.`);
    thread.status = 'COMPLETED';
    thread.nextFollowUpAt = null;
    await thread.save();
    return;
  }

  let sendResult;
  try {
    console.log(`[monitoring] Sending follow-up #${nextStep} to ${thread.recipientEmail}...`);

    sendResult = await gmailService.sendFollowUp(user._id, {
      threadId: thread.gmailThreadId,
      to: thread.recipientEmail,
      subject: thread.subject || '(no subject)',
      bodyText: buildFollowUpBody(nextStep, thread.messageTemplate || user.followUpDefaults.messageTemplate),
      ownEmailAddress: user.gmail.emailAddress,
    });

    await FollowUp.create({
      user: user._id,
      thread: thread._id,
      step: nextStep,
      gmailMessageId: sendResult.id,
      preSendReplyCheckPassed: true,
    });

    console.log(`[monitoring] Follow-up #${nextStep} sent successfully! Message ID: ${sendResult.id}`);
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[monitoring] Step #${nextStep} already processed by another instance. Skipping.`);
      return;
    }
    throw err;
  }

  const delayDays = delays[nextStep - 1];
  thread.currentStep = nextStep;
  thread.lastMessageSentAt = new Date();
  thread.nextFollowUpAt = new Date(Date.now() + delayDays * 24 * 60  * 60 * 1000);
  await thread.save();

  console.log(`[monitoring] Next follow-up scheduled in ${delayDays} days.`);
}

function buildFollowUpBody(step, template) {
  const base =
    template ||
    'Hi,\n\nJust following up on my previous message (follow-up #{{step}}). Let me know if you have any questions.\n\nBest regards';
  return base.replace(/\{\{step\}\}/g, step);
}

function start() {
  const schedule = process.env.FOLLOWUP_CHECK_CRON || '*/5 * * * *';
  cron.schedule(schedule, () => {
    runFollowUpCheck().catch((err) => console.error('[monitoring] fatal loop error', err));
  });
  console.log(`[monitoring] scheduled with cron "${schedule}"`);
}

module.exports = { start, runFollowUpCheck };