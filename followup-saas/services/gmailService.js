const { google } = require('googleapis');
const User = require('../models/User');

// Scopes requested only during the explicit "Connect Gmail" flow, never at login.
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_CALLBACK_URL
  );
}

function getConsentUrl(state) {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // required to get a refresh_token
    prompt: 'consent', // force refresh_token on every connect, not just the first time
    scope: GMAIL_SCOPES,
    state, // carries the userId so the callback knows which tenant to attach tokens to
  });
}

// Returns an OAuth2 client pre-loaded with this user's tokens, auto-refreshing
// and persisting a new access token back to the User document when it expires.
async function getClientForUser(userId) {
  const user = await User.findById(userId).select('+gmail.accessToken +gmail.refreshToken');
  if (!user?.gmail?.connected) {
    throw new Error('Gmail is not connected for this user');
  }

  const client = buildOAuthClient();
  client.setCredentials({
    access_token: user.gmail.accessToken,
    refresh_token: user.gmail.refreshToken,
    expiry_date: user.gmail.tokenExpiryDate,
  });

  client.on('tokens', async (tokens) => {
    const update = {};
    if (tokens.access_token) update['gmail.accessToken'] = tokens.access_token;
    if (tokens.expiry_date) update['gmail.tokenExpiryDate'] = tokens.expiry_date;
    if (tokens.refresh_token) update['gmail.refreshToken'] = tokens.refresh_token;
    if (Object.keys(update).length) {
      await User.findByIdAndUpdate(userId, { $set: update });
    }
  });

  return client;
}

async function exchangeCodeForTokens(code) {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: 'v2' });
  const { data: profile } = await oauth2.userinfo.get();
  return { tokens, emailAddress: profile.email };
}

// Fetch recent sent threads for frontend dropdown selection (Fixes Invalid ID issue)
async function listUserThreads(user) {
  const client = await getClientForUser(user._id);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const response = await gmail.users.threads.list({
    userId: 'me',
    maxResults: 15,
    q: 'in:sent',
  });

  const threads = response.data.threads || [];

  const threadDetails = await Promise.all(
    threads.map(async (t) => {
      try {
        const threadData = await gmail.users.threads.get({
          userId: 'me',
          id: t.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'To'],
        });
        const headers = Object.fromEntries(
          (threadData.data.messages?.[0]?.payload?.headers || []).map((h) => [
            h.name.toLowerCase(),
            h.value,
          ])
        );
        return {
          threadId: t.id,
          subject: headers.subject || 'No Subject',
          to: headers.to || '',
        };
      } catch (e) {
        return { threadId: t.id, subject: 'Could not load subject', to: '' };
      }
    })
  );

  return threadDetails;
}

// Fresh, targeted check: does this Gmail thread contain a message from
// someone OTHER than the connected account, newer than `sinceDate`?
async function isGenuineClientReply(userId, gmailThreadId, ownEmailAddress, sinceDate) {
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const { data } = await gmail.users.threads.get({
    userId: 'me',
    id: gmailThreadId,
    format: 'metadata',
    metadataHeaders: ['From', 'Date', 'Auto-Submitted', 'Precedence'],
  });

  const messages = data.messages || [];

  for (const msg of messages) {
    const headers = Object.fromEntries(
      (msg.payload.headers || []).map((h) => [h.name.toLowerCase(), h.value])
    );

    const from = (headers.from || '').toLowerCase();
    const internalDate = Number(msg.internalDate || 0);

    const isFromOwner = from.includes(ownEmailAddress.toLowerCase());
    const isNewEnough = !sinceDate || internalDate > new Date(sinceDate).getTime();

    const looksAutomated =
      (headers['auto-submitted'] && headers['auto-submitted'] !== 'no') ||
      (headers.precedence || '').toLowerCase() === 'bulk' ||
      from.includes('noreply') ||
      from.includes('no-reply') ||
      from.includes('mailer-daemon');

    if (!isFromOwner && isNewEnough && !looksAutomated) {
      return { found: true, snippet: msg.snippet, messageId: msg.id };
    }
  }

  return { found: false };
}

async function sendFollowUp(userId, { threadId, to, subject, bodyText, ownEmailAddress }) {
  const client = await getClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  // Fetch the original thread to get the last message's Message-ID for proper threading headers
  let messageIdHeader = '';
  let referencesHeader = '';
  try {
    const threadData = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'References', 'Subject'],
    });

    const messages = threadData.data.messages || [];
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const headers = Object.fromEntries(
        (lastMsg.payload.headers || []).map((h) => [h.name.toLowerCase(), h.value])
      );

      const msgId = headers['message-id'];
      const refs = headers['references'] || msgId;

      if (msgId) {
        messageIdHeader = `In-Reply-To: ${msgId}`;
        referencesHeader = `References: ${refs}`;
      }
    }
  } catch (err) {
    console.error('Error fetching thread for headers:', err.message);
  }

  const rawLines = [
    `From: ${ownEmailAddress}`,
    `To: ${to}`,
    `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
    'Content-Type: text/plain; charset=utf-8',
  ];

  if (messageIdHeader) rawLines.push(messageIdHeader);
  if (referencesHeader) rawLines.push(referencesHeader);

  rawLines.push('', bodyText);

  const rawMessage = rawLines.join('\n');

  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded, threadId },
  });

  return data;
}

module.exports = {
  getConsentUrl,
  exchangeCodeForTokens,
  listUserThreads,
  isGenuineClientReply,
  sendFollowUp,
};