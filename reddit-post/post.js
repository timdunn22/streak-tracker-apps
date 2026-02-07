const snoowrap = require('snoowrap');
const config = require('./config.json');

if (config.clientId.includes('PASTE')) {
  console.error('\n  You need to fill in config.json first.\n');
  console.error('  1. Go to: https://www.reddit.com/prefs/apps');
  console.error('  2. Click "create another app" at the bottom');
  console.error('  3. Name: anything  |  Type: script  |  Redirect URI: http://localhost:8080');
  console.error('  4. Copy client_id (string under app name) and client_secret into config.json');
  console.error('  5. Add your Reddit username and password to config.json\n');
  process.exit(1);
}

const reddit = new snoowrap({
  userAgent: 'rewire-poster/1.0 by u/' + config.username,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  username: config.username,
  password: config.password,
});

const SUBREDDIT = process.argv[2] || 'NoFap';

const title = `I built a free, private streak tracker that runs in your browser — no account, no ads, no data collection`;

const body = `Hey everyone. I've been on this journey myself and got frustrated that every tracker app either wants $5/month, makes you create an account, or collects your data. For something this personal, that felt wrong.

So I built **Rewire** — a free streak tracker that runs entirely in your browser.

**What it does:**
- Live ticking timer (days, hours, minutes, seconds)
- Recovery phases (Withdrawal → Adjusting → Recovering → Resetting → Rewiring → Rewired)
- Visual progress — a tree that grows from a seed to a golden tree as you heal
- Milestone celebrations with sound at Day 1, 3, 7, 14, 21, 30, 60, 90, 120, 180, 365
- Weekly recaps and motivational quotes
- Shareable progress card (if you want accountability)
- Works offline once loaded

**What it doesn't do:**
- No account needed
- No data leaves your device (everything stays in your browser's local storage)
- No ads, no paywall, no upsells
- No tracking or analytics

It's a PWA so you can add it to your home screen and it works like a native app.

**Link:** https://rewire-psi.vercel.app

I built this for myself first but figured others might find it useful. Open to feedback — what features would actually help you stay on track?`;

console.log(`\nPosting to r/${SUBREDDIT}...`);
console.log(`Title: ${title.slice(0, 60)}...`);
console.log('');

reddit.getSubreddit(SUBREDDIT).submitSelfpost({
  title: title,
  text: body,
}).then(submission => {
  console.log('Posted successfully!');
  console.log(`URL: https://reddit.com${submission.permalink || '/r/' + SUBREDDIT}`);
  console.log('\nIMPORTANT: Open the URL in an incognito/private window to verify');
  console.log('the post is actually visible (not silently removed by AutoMod).\n');
}).catch(err => {
  console.error('Failed to post:', err.message);
  if (err.message.includes('RATELIMIT')) {
    console.error('\nYou are being rate-limited. Wait a few minutes and try again.');
  }
  if (err.message.includes('403') || err.message.includes('401')) {
    console.error('\nCheck your credentials in config.json. Make sure username/password are correct.');
    console.error('If you have 2FA enabled, append your 2FA code to password like: yourpassword:123456');
  }
});
