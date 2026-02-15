const fs = require('fs')
const path = require('path')

const apps = [
  {
    id: 'vapefree',
    name: 'VapeFree',
    appUrl: 'https://vapefree-app.vercel.app',
    tagline: 'Ditch the vape. Reclaim your lungs.',
    description: 'Free private streak tracker for quitting vaping. No account, no data collection. Track your nicotine-free journey with live timer, milestones, and recovery phases.',
    keywords: 'quit vaping app, stop vaping tracker, vape free counter, nicotine free app, quit juul app, vaping streak tracker, quit nicotine app free, days without vaping, vape quit counter, stop vaping free app',
    heroTitle: 'Quit Vaping.<br><span class="gradient">Reclaim Your Lungs.</span>',
    heroSub: 'The free vaping streak tracker that keeps your data private. No account, no ads. Watch your body heal day by day.',
    emotionalLine: "You're here because you want your lungs back. That decision already matters.",
    accentColor: '#06b6d4',
    accentGlow: '#67e8f9',
    streakLabel: 'days vape-free',
    features: [
      { icon: '&#9201;', title: 'Live Ticking Timer', desc: 'Watch every nicotine-free second count. Days, hours, minutes — always ticking forward.' },
      { icon: '&#127793;', title: 'Growing Tree Visual', desc: 'A seed that grows into a golden tree as your lungs heal and body recovers.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrations when nicotine leaves your body, lungs clear, circulation improves, and more.' },
      { icon: '&#129729;', title: 'Recovery Phases', desc: 'Track your body healing: Withdrawal, Detoxing, Clearing, Healing, Restoring, Renewed, Free.' },
      { icon: '&#128202;', title: 'Streak History', desc: 'Track every attempt. See your longest streak, total vape-free days, and progress over time.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Generate a beautiful progress image for accountability or social media. No personal info shown.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Withdrawal', desc: 'Nicotine is leaving your system. Cravings peak around 72 hours.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Detoxing', desc: 'Nicotine is gone. Your body is flushing out toxins.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Clearing', desc: 'Lungs start clearing. Breathing gets easier. Cilia begin regrowing.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Healing', desc: 'Circulation improves. Taste and smell sharpen. Energy stabilizes.', color: '#67e8f9' },
      { days: 'Day 30-60', label: 'Restoring', desc: 'Lung function measurably improves. Exercise capacity increases.', color: '#67e8f9' },
      { days: 'Day 60-90', label: 'Renewing', desc: 'Cardiovascular health improving. Respiratory infections decrease.', color: '#34d399' },
      { days: 'Day 90+', label: 'Free', desc: 'Your lungs have significantly healed. You are vape-free.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is VapeFree really free?', a: 'Yes, completely free. No premium tier, no paywall, no upsells. Every feature is available to everyone.' },
      { q: 'How do I install it on my phone?', a: 'Open the app in your browser. On iOS, tap Share then "Add to Home Screen." On Android, tap the menu and "Install App." It works like a native app.' },
      { q: 'Can anyone see my vaping data?', a: 'No. All data stays in your browser\'s local storage on your device. Nothing is sent to any server. We have zero access to your information.' },
      { q: 'What happens when I get a craving?', a: 'Open VapeFree and look at your streak. See how far you\'ve come. Read the daily quote. The craving typically passes in 3-5 minutes.' },
      { q: 'I vaped again. Is my progress lost?', a: 'No. VapeFree saves your previous streak and counts total vape-free days across all attempts. Every day counts.' },
    ],
  },
  {
    id: 'fasttrack',
    name: 'FastTrack',
    appUrl: 'https://fasttrack-app-three.vercel.app',
    tagline: 'Master your fasting. Transform your body.',
    description: 'Free private intermittent fasting streak tracker. No account, no data collection. Track your fasting consistency with live timer, milestones, and metabolic phases.',
    keywords: 'intermittent fasting tracker free, fasting app no subscription, IF tracker, fasting streak counter, 16:8 fasting app, intermittent fasting app free, fasting timer free, autophagy tracker, fasting day counter',
    heroTitle: 'Master Fasting.<br><span class="gradient">Transform Your Body.</span>',
    heroSub: 'The free fasting streak tracker. No account, no subscription. Track your consistency and watch your metabolism transform.',
    emotionalLine: "Your body already knows how to heal. This just helps you stay consistent.",
    accentColor: '#f59e0b',
    accentGlow: '#fcd34d',
    streakLabel: 'days fasting',
    features: [
      { icon: '&#9201;', title: 'Live Fasting Timer', desc: 'Track every hour of your fasting streak. Days, hours, minutes of metabolic transformation.' },
      { icon: '&#127793;', title: 'Growing Tree Visual', desc: 'Watch your discipline grow from a seed into a golden tree as you stay consistent.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate fat adaptation, autophagy activation, metabolic flexibility, and more.' },
      { icon: '&#129504;', title: 'Metabolic Phases', desc: 'Track your body\'s changes: Adapting, Fat-Adapting, Metabolic Shift, Deep Ketosis.' },
      { icon: '&#128202;', title: 'Streak History', desc: 'See your consistency over time. Longest streak, total fasting days, and trends.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Generate a progress image showing your fasting consistency for accountability.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Adapting', desc: 'Your body is adjusting to the new eating pattern. Hunger hormones are recalibrating.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Adjusting', desc: 'Insulin levels are dropping. Your body is learning to access fat stores.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Fat-Adapting', desc: 'Metabolic switch is happening. Your body efficiently burns fat for fuel.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Metabolic Shift', desc: 'Autophagy increases. Cellular cleanup accelerates. Energy stabilizes.', color: '#fcd34d' },
      { days: 'Day 30-60', label: 'Autophagy', desc: 'Deep cellular repair. Body composition is changing. Inflammation drops.', color: '#fcd34d' },
      { days: 'Day 60-90', label: 'Deep Ketosis', desc: 'Metabolic flexibility is high. Your body efficiently switches between fuel sources.', color: '#34d399' },
      { days: 'Day 90+', label: 'Metabolically Flexible', desc: 'Fasting is second nature. Your metabolism is optimized.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is FastTrack really free?', a: 'Yes. No subscription, no premium tier. Every feature is free. Unlike Simple or DoFasting, we will never charge you.' },
      { q: 'How is this different from other fasting apps?', a: 'Most fasting apps charge $10-20/month and require accounts. FastTrack is 100% free, requires no account, and stores data only on your device.' },
      { q: 'Does it track my fasting window?', a: 'FastTrack tracks your consecutive days of successful fasting. It\'s a consistency tracker — count each day you complete your fasting protocol.' },
      { q: 'I broke my fast early. What do I do?', a: 'If you completed most of your fasting window, keep the streak. If you fully broke protocol, use the reset — your history is preserved.' },
      { q: 'What is autophagy?', a: 'Autophagy is your body\'s cellular cleanup process, activated during fasting. Damaged cells are recycled and repaired. It typically increases significantly after 16-24 hours of fasting.' },
    ],
  },
  {
    id: 'greenday',
    name: 'GreenDay',
    appUrl: 'https://greenday-app.vercel.app',
    tagline: 'Clear your mind. Live sharper.',
    description: 'Free private streak tracker for quitting weed. No account, no data collection. Track your cannabis-free journey with recovery phases and milestones.',
    keywords: 'quit weed app, stop smoking weed tracker, cannabis free counter, quit marijuana app, weed sobriety tracker, days without weed, quit weed free app, marijuana detox tracker, THC detox app, r/leaves tracker',
    heroTitle: 'Quit Weed.<br><span class="gradient">Think Clearly Again.</span>',
    heroSub: 'The free weed sobriety tracker. No account, no judgment. Watch your brain fog lift and clarity return day by day.',
    emotionalLine: "You already know the fog isn't serving you. Clarity is closer than you think.",
    accentColor: '#22c55e',
    accentGlow: '#86efac',
    streakLabel: 'days clear',
    features: [
      { icon: '&#9201;', title: 'Live Sobriety Timer', desc: 'Every sober second counted. Watch your THC-free time grow in real-time.' },
      { icon: '&#127793;', title: 'Growing Tree Visual', desc: 'Your clarity grows like a tree — from seed to golden canopy as your brain heals.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate when REM sleep returns, fog lifts, motivation surges, and THC clears.' },
      { icon: '&#129504;', title: 'Recovery Phases', desc: 'Withdrawal, Detoxing, Clearing, Recovering, Sharpening, Resetting, Clear.' },
      { icon: '&#128202;', title: 'Streak History', desc: 'Track attempts, longest streak, and total sober days. Every day counts.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Generate a progress card for accountability partners or r/leaves community.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Withdrawal', desc: 'Irritability, insomnia, loss of appetite. THC is starting to leave fat cells.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Detoxing', desc: 'Sleep disruption peaks. Vivid dreams return as REM sleep restores.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Clearing', desc: 'Brain fog begins lifting. Appetite normalizes. Short-term memory improves.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Recovering', desc: 'Motivation returns. Focus sharpens. Emotional regulation improves.', color: '#86efac' },
      { days: 'Day 30-60', label: 'Sharpening', desc: 'THC mostly cleared from system. Cognitive function significantly improved.', color: '#86efac' },
      { days: 'Day 60-90', label: 'Resetting', desc: 'Dopamine system recalibrated. Natural motivation and drive restored.', color: '#34d399' },
      { days: 'Day 90+', label: 'Clear', desc: 'Brain fully reset. Psychological dependence broken. Living with clarity.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is GreenDay really free?', a: 'Yes. Free forever. No subscription, no premium features behind a paywall.' },
      { q: 'How long does THC stay in your system?', a: 'THC stores in fat cells and can take 30-90 days to fully clear, depending on usage frequency and body composition. GreenDay tracks your progress through this entire timeline.' },
      { q: 'Is this app private?', a: 'Completely. No account, no server, no data collection. Everything stays on your device in local storage.' },
      { q: 'I smoked again. Is my progress gone?', a: 'No. GreenDay saves your previous streak and counts total sober days. Setbacks are normal — what matters is the overall trend.' },
      { q: 'Why are my dreams so vivid?', a: 'Cannabis suppresses REM sleep. When you quit, REM rebounds intensely, causing extremely vivid dreams. This is normal and actually a sign of healing.' },
    ],
  },
  {
    id: 'sugarfree',
    name: 'SugarFree',
    appUrl: 'https://sugarfree-app.vercel.app',
    tagline: 'Break the sugar cycle. Feel alive.',
    description: 'Free private streak tracker for quitting sugar. No account needed. Track your sugar-free journey with milestones and recovery phases.',
    keywords: 'quit sugar app, no sugar challenge tracker, sugar free counter, sugar detox app, quit sugar tracker free, days without sugar app, sugar addiction app, no sugar streak tracker, sugar free challenge app',
    heroTitle: 'Quit Sugar.<br><span class="gradient">Feel Alive Again.</span>',
    heroSub: 'The free sugar-free streak tracker. No account, no ads. Watch your energy stabilize and cravings disappear.',
    emotionalLine: "The cravings are loud, but your body is asking you for something better.",
    accentColor: '#ec4899',
    accentGlow: '#f9a8d4',
    streakLabel: 'days sugar-free',
    features: [
      { icon: '&#9201;', title: 'Live Timer', desc: 'Track every sugar-free hour. Watch your streak grow in real-time.' },
      { icon: '&#127793;', title: 'Growing Tree', desc: 'A visual metaphor for your healing — growing stronger every sugar-free day.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate blood sugar stabilization, taste bud reset, gut healing, and more.' },
      { icon: '&#129504;', title: 'Detox Phases', desc: 'Withdrawal, Detoxing, Resensitizing, Stabilizing, Healing, Renewed, Sugar-Free.' },
      { icon: '&#128202;', title: 'Streak Stats', desc: 'Track your longest sugar-free streak, total clean days, and progress trends.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your sugar-free milestone for accountability or the #NoSugarChallenge.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Withdrawal', desc: 'Headaches, irritability, intense cravings. Your blood sugar is recalibrating.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Detoxing', desc: 'Cravings start easing. Energy crashes becoming less severe.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Resensitizing', desc: 'Taste buds reset. Natural foods start tasting sweeter and more satisfying.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Stabilizing', desc: 'Blood sugar stable. Energy consistent throughout the day. Skin clearing.', color: '#f9a8d4' },
      { days: 'Day 30-60', label: 'Healing', desc: 'Gut microbiome shifting. Inflammation dropping. Weight normalizing.', color: '#f9a8d4' },
      { days: 'Day 60-90', label: 'Renewed', desc: 'Metabolic health transformed. Sugar cravings feel distant.', color: '#34d399' },
      { days: 'Day 90+', label: 'Sugar-Free', desc: 'New relationship with food. Sugar no longer controls you.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is SugarFree really free?', a: 'Yes. No subscription, no ads, no premium tier. Every feature is free forever.' },
      { q: 'Does this mean no fruit?', a: 'That\'s up to you. Many people quit added/refined sugar while keeping whole fruits. SugarFree tracks whatever protocol you choose.' },
      { q: 'How long until cravings stop?', a: 'Most people report cravings peaking at day 3-5 and significantly decreasing by day 14-21. Everyone is different.' },
      { q: 'I ate sugar. What now?', a: 'Reset your streak — your previous days are saved. Many people need several attempts. The trend matters more than any single day.' },
      { q: 'Is sugar really addictive?', a: 'Research shows sugar activates the same brain reward pathways as addictive substances. It triggers dopamine release and can create dependency patterns.' },
    ],
  },
  {
    id: 'decaf',
    name: 'Decaf',
    appUrl: 'https://decaf-app-black.vercel.app',
    tagline: 'Find your natural energy.',
    description: 'Free private streak tracker for quitting caffeine. No account needed. Track your caffeine-free journey with recovery phases.',
    keywords: 'quit caffeine app, caffeine free tracker, quit coffee app, caffeine detox tracker, days without coffee app, quit caffeine free app, caffeine withdrawal tracker, decaf challenge app, stop caffeine app',
    heroTitle: 'Quit Caffeine.<br><span class="gradient">Find Natural Energy.</span>',
    heroSub: 'The free caffeine-free streak tracker. No account, no data collection. Watch your natural energy return.',
    emotionalLine: "What if the energy you've been chasing was already inside you?",
    accentColor: '#d97706',
    accentGlow: '#fbbf24',
    streakLabel: 'days caffeine-free',
    features: [
      { icon: '&#9201;', title: 'Live Timer', desc: 'Every caffeine-free second counted. Watch your natural energy timeline grow.' },
      { icon: '&#127793;', title: 'Growing Tree', desc: 'Your energy grows naturally — visualized as a tree that grows with your streak.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate when headaches end, sleep improves, natural energy returns, and more.' },
      { icon: '&#129504;', title: 'Recovery Phases', desc: 'Withdrawal, Detoxing, Stabilizing, Resetting, Balancing, Natural Energy, Caffeine-Free.' },
      { icon: '&#128202;', title: 'Streak Stats', desc: 'Track your longest caffeine-free streak and total days without stimulants.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your caffeine-free progress for accountability.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Withdrawal', desc: 'Headaches, fatigue, brain fog. Adenosine receptors are overwhelmed.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Detoxing', desc: 'Headaches fading. Sleep quality starting to improve.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Stabilizing', desc: 'Adenosine receptors resetting. Natural tiredness cues returning.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Resetting', desc: 'Sleep architecture normalizing. Afternoon crashes disappearing.', color: '#fbbf24' },
      { days: 'Day 30-60', label: 'Balancing', desc: 'Cortisol rhythm normalizing. Steady energy throughout the day.', color: '#fbbf24' },
      { days: 'Day 60-90', label: 'Natural Energy', desc: 'Adrenals recovered. Natural wakefulness stronger than caffeine ever was.', color: '#34d399' },
      { days: 'Day 90+', label: 'Caffeine-Free', desc: 'Running on your own energy. No stimulants needed.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is Decaf really free?', a: 'Yes. Completely free. No subscription, no ads, no premium features.' },
      { q: 'How long do withdrawal headaches last?', a: 'Typically 2-9 days, with peak intensity around day 1-2. Stay hydrated — it helps significantly.' },
      { q: 'Will I have energy without caffeine?', a: 'Yes. After 2-4 weeks, most people report more stable, consistent energy than they had with caffeine. The spikes and crashes disappear.' },
      { q: 'Does this include tea?', a: 'That\'s your choice. Some people quit all caffeine (coffee, tea, energy drinks), others just reduce. Decaf tracks whatever protocol you follow.' },
      { q: 'I had a coffee. Is my progress lost?', a: 'Reset your streak if you want to start fresh — previous days are always saved. Or keep going if it was a one-time slip.' },
    ],
  },
  {
    id: 'primal',
    name: 'Primal',
    appUrl: 'https://primal-app.vercel.app',
    tagline: 'Optimize your testosterone. Naturally.',
    description: 'Free private testosterone optimization streak tracker. Track your daily habits for naturally boosting T levels. No account needed.',
    keywords: 'testosterone tracker app, boost testosterone naturally app, testosterone optimization, T level tracker, mens health tracker, testosterone habits app, natural testosterone app, hormone optimization tracker',
    heroTitle: 'Optimize Your T.<br><span class="gradient">Naturally.</span>',
    heroSub: 'The free testosterone optimization tracker. Track your daily habits — sleep, exercise, nutrition, cold exposure — and watch your levels rise.',
    emotionalLine: "Your body was built for strength. Give it the right inputs and watch what happens.",
    accentColor: '#ef4444',
    accentGlow: '#fca5a5',
    streakLabel: 'days optimizing',
    features: [
      { icon: '&#9201;', title: 'Daily Streak', desc: 'Track consecutive days of optimizing: sleep, exercise, diet, and recovery.' },
      { icon: '&#127793;', title: 'Growing Visual', desc: 'Watch your optimization grow from a seed into full primal strength.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate as sleep improves, strength rises, body composition changes, and energy peaks.' },
      { icon: '&#129504;', title: 'Optimization Phases', desc: 'Starting, Building, Adapting, Optimizing, Elevating, Peak, Primal.' },
      { icon: '&#128202;', title: 'Progress Stats', desc: 'Track your longest optimization streak and consistency over time.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your optimization streak for accountability and motivation.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Starting', desc: 'Committing to the fundamentals: sleep, compound lifts, real food.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Building', desc: 'Habits forming. Sleep quality is the first marker to improve.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Adapting', desc: 'Body responding to new inputs. Recovery improving.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Optimizing', desc: 'Hormonal pathways adapting. Strength and energy noticeably rising.', color: '#fca5a5' },
      { days: 'Day 30-60', label: 'Elevating', desc: 'Deep changes. Body composition shifting. Confidence building.', color: '#fca5a5' },
      { days: 'Day 60-90', label: 'Peak', desc: 'Operating at a new level. Strength, drive, and focus are transformed.', color: '#34d399' },
      { days: 'Day 90+', label: 'Primal', desc: 'This is your new operating system. Optimized naturally.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is Primal really free?', a: 'Yes. No subscription, no supplements to buy, no upsells. Just a free tracker.' },
      { q: 'What should I track?', a: 'Count each day you hit your core habits: 7+ hours sleep, exercise (especially compound lifts), whole foods diet, and stress management. Mark days you follow through.' },
      { q: 'Does this replace blood work?', a: 'No. Primal tracks your habits, not your hormone levels. Get blood work done separately to measure actual T levels.' },
      { q: 'How long until I see results?', a: 'Most men notice improved energy and sleep within 2 weeks. Body composition and strength changes typically become visible at 4-8 weeks.' },
      { q: 'I missed a day. What do I do?', a: 'Be honest — reset if you want clean tracking, or keep going if it was a minor slip. Consistency over perfection.' },
    ],
  },
  {
    id: 'iceplunge',
    name: 'IcePlunge',
    appUrl: 'https://iceplunge-app.vercel.app',
    tagline: 'Embrace the cold. Build resilience.',
    description: 'Free private cold plunge streak tracker. Track your daily cold exposure habit. No account, no data collection.',
    keywords: 'cold plunge tracker app, cold exposure app, cold shower streak, wim hof tracker, ice bath tracker, cold therapy app, cold plunge counter, daily cold shower app, cold exposure streak',
    heroTitle: 'Cold Plunge.<br><span class="gradient">Build Resilience.</span>',
    heroSub: 'The free cold exposure streak tracker. Track your daily plunge habit and build unshakeable mental toughness.',
    emotionalLine: "The resistance you feel before getting in is the exact thing you need to overcome.",
    accentColor: '#3b82f6',
    accentGlow: '#93c5fd',
    streakLabel: 'days plunging',
    features: [
      { icon: '&#9201;', title: 'Streak Timer', desc: 'Track consecutive days of cold exposure. Every plunge counted.' },
      { icon: '&#127793;', title: 'Growing Visual', desc: 'Watch your resilience grow from a seed into ice-forged strength.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate norepinephrine spikes, brown fat activation, deep adaptation, and more.' },
      { icon: '&#129504;', title: 'Adaptation Phases', desc: 'Shocking, Adapting, Building, Hardening, Resilient, Ice-Forged, Unbreakable.' },
      { icon: '&#128202;', title: 'Plunge Stats', desc: 'Track your longest streak of daily cold exposure and total plunge days.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your cold plunge streak. Ice-forged bragging rights.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Shocking', desc: 'Cold shock response is intense. Learning to breathe through the initial gasp.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Adapting', desc: 'Norepinephrine spiking. Natural energy and mood elevation after each plunge.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Building', desc: 'Cold shock response diminishing. Brown fat beginning to activate.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Hardening', desc: 'Thermoregulation improving. Recovery from workouts is faster.', color: '#93c5fd' },
      { days: 'Day 30-60', label: 'Resilient', desc: 'Baseline dopamine elevated. Inflammation markers lower.', color: '#93c5fd' },
      { days: 'Day 60-90', label: 'Ice-Forged', desc: 'Deep adaptation. Cold feels different — you welcome it.', color: '#34d399' },
      { days: 'Day 90+', label: 'Unbreakable', desc: 'Mind and body are forged. The cold is your ally.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is IcePlunge really free?', a: 'Yes. No subscription, no equipment sales, no upsells. Just a free tracker.' },
      { q: 'Do cold showers count?', a: 'Absolutely. Any deliberate cold exposure counts — cold showers, ice baths, cold plunge tubs, lake swims. Track whatever you do.' },
      { q: 'How long should I plunge?', a: 'Start with 30 seconds to 1 minute. Work up to 2-5 minutes over weeks. Even 30 seconds triggers beneficial norepinephrine release.' },
      { q: 'What does cold exposure actually do?', a: 'Research shows cold exposure increases norepinephrine (2-3x), elevates dopamine (250%+), activates brown fat, reduces inflammation, and improves recovery.' },
      { q: 'I skipped a day. Reset?', a: 'Your choice. Some people track consecutive daily plunges strictly, others allow rest days. IcePlunge saves your history either way.' },
    ],
  },
  {
    id: 'sober',
    name: 'Sober',
    appUrl: 'https://sober-app-theta.vercel.app',
    tagline: 'Choose clarity. Every single day.',
    description: 'Free private sobriety tracker for quitting alcohol. No account, no data collection. Track your sober journey with milestones and health recovery phases.',
    keywords: 'sobriety tracker app free, quit drinking app, sober counter, alcohol free tracker, days sober counter, quit alcohol app free, sobriety day counter, sober streak app, stop drinking tracker, alcohol free app',
    heroTitle: 'Get Sober.<br><span class="gradient">Choose Clarity.</span>',
    heroSub: 'The free sobriety tracker. No account, no judgment. Watch your body and mind heal day by day.',
    emotionalLine: "You're here because you want something better. That takes real courage.",
    accentColor: '#6366f1',
    accentGlow: '#a5b4fc',
    streakLabel: 'days sober',
    features: [
      { icon: '&#9201;', title: 'Live Sober Timer', desc: 'Every sober second counted. Days, hours, minutes of clarity.' },
      { icon: '&#127793;', title: 'Growing Tree', desc: 'Your recovery grows like a tree — from seed to golden strength.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate liver healing, sleep improvement, blood pressure normalization, and more.' },
      { icon: '&#129504;', title: 'Recovery Phases', desc: 'Detox, Stabilizing, Clearing, Healing, Recovering, Renewing, Sober.' },
      { icon: '&#128202;', title: 'Sobriety Stats', desc: 'Track your longest sober streak, total alcohol-free days, and patterns.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your sobriety milestone for accountability.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Detox', desc: 'Alcohol leaving your system. Sleep disruption, anxiety, and cravings are normal.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Stabilizing', desc: 'Worst withdrawal symptoms passing. Blood sugar beginning to stabilize.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Clearing', desc: 'Sleep quality improving. Mental clarity increasing. Skin clearing up.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Healing', desc: 'Liver fat reducing. Blood pressure normalizing. Energy improving.', color: '#a5b4fc' },
      { days: 'Day 30-60', label: 'Recovering', desc: 'Brain chemistry stabilizing. Emotional regulation improving.', color: '#a5b4fc' },
      { days: 'Day 60-90', label: 'Renewing', desc: 'Liver significantly healed. Immune system strengthening.', color: '#34d399' },
      { days: 'Day 90+', label: 'Sober', desc: 'Brain and body profoundly healed. Living with clarity and purpose.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is Sober really free?', a: 'Yes. No subscription, no paywall. Unlike I Am Sober, every feature is free with no upsells.' },
      { q: 'Is this app private?', a: 'Completely. No account, no email, no server. All data stays on your device. Nobody can see your sobriety status.' },
      { q: 'Should I see a doctor before quitting?', a: 'If you drink heavily, yes. Alcohol withdrawal can be medically serious. This app is a tracking tool, not medical advice.' },
      { q: 'I drank. Is my progress gone?', a: 'No. Sober saves your previous streak and tracks total sober days. Relapse is part of recovery for many people.' },
      { q: 'How does this compare to I Am Sober?', a: 'I Am Sober requires an account and charges for premium features. Sober is completely free, requires no account, and keeps all data on your device.' },
    ],
  },
  {
    id: 'clearlungs',
    name: 'ClearLungs',
    appUrl: 'https://clearlungs-app.vercel.app',
    tagline: 'Quit smoking. Breathe free.',
    description: 'Free private streak tracker for quitting smoking. No account, no data collection. Track your smoke-free journey with health recovery milestones.',
    keywords: 'quit smoking app free, stop smoking tracker, smoke free counter, cigarette quit tracker, days without smoking app, quit smoking app no subscription, smoke free app, quit cigarettes app, smoking cessation tracker',
    heroTitle: 'Quit Smoking.<br><span class="gradient">Breathe Free.</span>',
    heroSub: 'The free smoke-free streak tracker. No account, no ads. Watch your lungs heal and heart strengthen.',
    emotionalLine: "Your lungs are already healing. Every smoke-free minute counts.",
    accentColor: '#10b981',
    accentGlow: '#6ee7b7',
    streakLabel: 'days smoke-free',
    features: [
      { icon: '&#9201;', title: 'Live Timer', desc: 'Every smoke-free second counted. Your lungs are healing right now.' },
      { icon: '&#127793;', title: 'Growing Tree', desc: 'Like your lungs regrowing cilia, watch your progress grow into a golden tree.' },
      { icon: '&#127942;', title: '12 Milestones', desc: 'Celebrate nicotine clearance, lung clearing, circulation improvement, and more.' },
      { icon: '&#129504;', title: 'Recovery Phases', desc: 'Withdrawal, Detoxing, Clearing, Healing, Restoring, Renewed, Smoke-Free.' },
      { icon: '&#128202;', title: 'Smoke-Free Stats', desc: 'Track your longest streak, total smoke-free days, and quit attempts.' },
      { icon: '&#128247;', title: 'Share Card', desc: 'Share your smoke-free progress for accountability and motivation.' },
    ],
    phases: [
      { days: 'Day 0-3', label: 'Withdrawal', desc: 'Nicotine leaving your body. Heart rate already dropping within 20 minutes of last cigarette.', color: '#f87171' },
      { days: 'Day 3-7', label: 'Detoxing', desc: 'Nicotine is out of your system. Chemical addiction is broken. Habit triggers remain.', color: '#fbbf24' },
      { days: 'Day 7-14', label: 'Clearing', desc: 'Lungs starting to clear. Breathing gets easier. Coughing may increase temporarily.', color: '#fbbf24' },
      { days: 'Day 14-30', label: 'Healing', desc: 'Circulation improving. Walking and exercise feel easier. Lung function increasing.', color: '#6ee7b7' },
      { days: 'Day 30-60', label: 'Restoring', desc: 'Lung cilia regrowing. Body\'s natural defenses restoring. Infection risk dropping.', color: '#6ee7b7' },
      { days: 'Day 60-90', label: 'Renewed', desc: 'Lung capacity improved up to 30%. Heart disease risk already dropping.', color: '#34d399' },
      { days: 'Day 90+', label: 'Smoke-Free', desc: 'Lungs significantly healed. At 1 year, heart disease risk is halved.', color: '#34d399' },
    ],
    faqs: [
      { q: 'Is ClearLungs really free?', a: 'Yes. No subscription, no premium tier, no ads. Unlike Smoke Free or QuitNow, everything is free.' },
      { q: 'How quickly do lungs heal?', a: 'Within 72 hours, breathing improves. Within 1-9 months, cilia regrow and lung function increases up to 30%. Within 1 year, heart disease risk is halved.' },
      { q: 'Is this app private?', a: 'Completely. No account, no data sent anywhere. Everything stays on your device.' },
      { q: 'I smoked one cigarette. Reset?', a: 'Your choice. One slip doesn\'t erase the healing. But if you want a clean count, reset — your previous streak is saved.' },
      { q: 'Does this work for cigars/pipes?', a: 'Yes. ClearLungs tracks your smoke-free streak regardless of what you were smoking.' },
    ],
  },
]

function generateHTML(app) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free ${app.name} App — ${app.tagline} | Private Streak Tracker</title>
  <meta name="description" content="${app.description}">
  <meta name="keywords" content="${app.keywords}">
  <link rel="canonical" href="https://${app.id}-landing.vercel.app">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta property="og:title" content="Free ${app.name} App — ${app.tagline}">
  <meta property="og:description" content="${app.description}">
  <meta property="og:image" content="https://${app.id}-landing.vercel.app/og-image.svg">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${app.id}-landing.vercel.app">
  <meta property="og:site_name" content="${app.name}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Free ${app.name} App — ${app.tagline}">
  <meta name="twitter:description" content="${app.description}">
  <meta name="twitter:image" content="https://${app.id}-landing.vercel.app/og-image.svg">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"SoftwareApplication","name":"${app.name}","applicationCategory":"HealthApplication","operatingSystem":"Any (Web Browser)","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":"${app.description}","url":"${app.appUrl}"}
  </script>
  <!-- Google Analytics 4 — Replace G-XXXXXXXXXX with your actual GA4 Measurement ID -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-XXXXXXXXXX');</script>
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#06060b;--accent:${app.accentColor};--accent-glow:${app.accentGlow};--success:#34d399;--text:#f4f4f8;--text-sec:#c0c0d0;--text-dim:#7a7a95;--text-muted:#44445a;--border:rgba(255,255,255,0.06);--card:rgba(255,255,255,0.04)}
    html{scroll-behavior:smooth}
    body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.6;overflow-x:hidden}

    /* Sticky header */
    .sticky-header{position:fixed;top:0;left:0;right:0;z-index:90;padding:.625rem 1.5rem;display:flex;justify-content:space-between;align-items:center;background:rgba(6,6,11,0.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--border);transform:translateY(-100%);transition:transform .3s ease}
    .sticky-header.show{transform:translateY(0)}
    .sticky-header .logo{font-weight:700;font-size:1rem;color:var(--text)}
    .sticky-header .hdr-cta{background:var(--accent);color:#fff;font-size:.85rem;font-weight:600;padding:.5rem 1.25rem;border-radius:.75rem;text-decoration:none;transition:all .2s}
    .sticky-header .hdr-cta:hover{background:var(--accent-glow)}

    /* Hero */
    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem 1.5rem 6rem;position:relative;background-image:radial-gradient(ellipse at 20% 0%,${app.accentColor}1f 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(52,211,153,0.12) 0%,transparent 50%)}
    .badge{display:inline-flex;align-items:center;gap:.5rem;background:${app.accentColor}1a;border:1px solid ${app.accentColor}33;border-radius:100px;padding:.4rem 1rem;font-size:.8rem;color:${app.accentGlow};font-weight:600;margin-bottom:2rem;letter-spacing:.02em}
    h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.25rem;max-width:700px}
    h1 .gradient{background:linear-gradient(135deg,${app.accentGlow},${app.accentColor});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero-sub{font-size:clamp(1rem,2.5vw,1.25rem);color:var(--text-dim);max-width:500px;margin-bottom:1.5rem;line-height:1.6}
    .emotional{font-size:.9rem;color:var(--text-sec);font-style:italic;max-width:400px;margin-bottom:2.5rem;line-height:1.6}
    .cta{display:inline-flex;align-items:center;gap:.5rem;background:var(--accent);color:#fff;font-size:1.1rem;font-weight:600;padding:1rem 2.5rem;border-radius:1rem;border:none;cursor:pointer;text-decoration:none;transition:all .2s;box-shadow:0 0 30px ${app.accentColor}33,0 0 60px ${app.accentColor}14}
    .cta:hover{background:var(--accent-glow);transform:translateY(-1px)}
    .cta-sub{display:block;margin-top:.75rem;font-size:.8rem;color:var(--text-muted)}
    .trust-row{display:flex;gap:1.5rem;justify-content:center;margin-top:2rem;flex-wrap:wrap}
    .trust-item{display:flex;align-items:center;gap:.4rem;font-size:.78rem;color:var(--text-dim)}
    .trust-item svg{width:14px;height:14px;stroke:var(--accent-glow);fill:none;stroke-width:2}

    /* Phone mockup */
    .phone-wrap{margin:2.5rem auto 0;perspective:800px}
    .phone{width:220px;height:440px;background:#0d0d14;border:2px solid rgba(255,255,255,0.1);border-radius:2rem;padding:1rem .75rem;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px ${app.accentColor}1a;transform:rotateY(-4deg) rotateX(2deg)}
    .phone-notch{position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:60px;height:6px;background:rgba(255,255,255,0.08);border-radius:100px}
    .phone-ring{position:relative;width:120px;height:120px;margin-bottom:.75rem}
    .phone-ring svg{width:100%;height:100%}
    .phone-days{font-size:2rem;font-weight:800;color:var(--text);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
    .phone-label{font-size:.65rem;color:var(--text-dim);margin-top:-.25rem}
    .phone-phase{font-size:.6rem;font-weight:600;color:${app.accentGlow};letter-spacing:.06em;text-transform:uppercase;margin-top:.75rem}
    .phone-tree{margin-top:.5rem;font-size:1.5rem}
    .phone-bottom{position:absolute;bottom:.75rem;left:0;right:0;display:flex;justify-content:center;gap:1.25rem}
    .phone-dot{width:6px;height:6px;border-radius:50%;background:var(--text-muted)}
    .phone-dot.active{background:${app.accentGlow}}

    /* Scroll animations */
    .reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
    .reveal.visible{opacity:1;transform:translateY(0)}

    /* Sections */
    section{padding:5rem 1.5rem;max-width:900px;margin:0 auto}
    h2{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;letter-spacing:-.02em;margin-bottom:1rem;text-align:center}
    .sub{text-align:center;color:var(--text-dim);max-width:500px;margin:0 auto 3rem;font-size:1rem}

    /* How it works */
    .steps{display:flex;gap:1.5rem;max-width:700px;margin:0 auto;flex-wrap:wrap;justify-content:center}
    .step{flex:1;min-width:180px;text-align:center;padding:1.5rem}
    .step-num{width:40px;height:40px;border-radius:50%;background:${app.accentColor}1a;border:1px solid ${app.accentColor}33;color:${app.accentGlow};font-weight:700;font-size:1.1rem;display:flex;align-items:center;justify-content:center;margin:0 auto .75rem}
    .step h3{font-size:.95rem;font-weight:600;margin-bottom:.35rem}
    .step p{font-size:.82rem;color:var(--text-dim);line-height:1.5}

    /* Feature grid */
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem}
    .card{background:var(--card);border:1px solid var(--border);border-radius:1.25rem;padding:1.75rem;backdrop-filter:blur(20px);transition:border-color .2s,transform .2s}
    .card:hover{border-color:${app.accentColor}33;transform:translateY(-2px)}
    .card .icon{font-size:1.75rem;margin-bottom:.75rem}
    .card h3{font-size:1.05rem;font-weight:600;margin-bottom:.5rem}
    .card p{font-size:.88rem;color:var(--text-dim);line-height:1.6}

    /* Phases */
    .phases{display:flex;flex-direction:column;gap:1rem;max-width:600px;margin:0 auto}
    .phase{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;border-radius:1rem;background:var(--card);border:1px solid var(--border)}
    .phase-day{font-size:.75rem;font-weight:700;min-width:70px;letter-spacing:.04em;text-transform:uppercase}
    .phase-label{font-weight:600;font-size:.95rem}
    .phase-desc{font-size:.82rem;color:var(--text-dim)}

    /* Privacy */
    .privacy{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.25rem;max-width:700px;margin:0 auto}
    .priv-item{text-align:center;padding:1.5rem;background:var(--card);border:1px solid var(--border);border-radius:1.25rem}
    .priv-item .pi{font-size:2rem;margin-bottom:.75rem}
    .priv-item h3{font-size:.95rem;margin-bottom:.35rem}
    .priv-item p{font-size:.82rem;color:var(--text-dim)}

    /* FAQ */
    .faq{max-width:650px;margin:0 auto}
    .faq-item{border-bottom:1px solid var(--border);overflow:hidden}
    .faq-q{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 0;cursor:pointer;font-size:1rem;font-weight:600}
    .faq-q svg{width:18px;height:18px;stroke:var(--text-dim);fill:none;transition:transform .2s}
    .faq-item.open .faq-q svg{transform:rotate(180deg)}
    .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;font-size:.9rem;color:var(--text-dim);line-height:1.7}
    .faq-item.open .faq-a{max-height:200px;padding-bottom:1.25rem}

    /* Final CTA */
    .final{text-align:center;padding:6rem 1.5rem;background-image:radial-gradient(ellipse at 50% 50%,${app.accentColor}14 0%,transparent 60%)}
    .final p{color:var(--text-dim);margin-bottom:2rem;font-size:1.05rem}

    /* Sticky bottom CTA */
    .bottom-cta{position:fixed;bottom:0;left:0;right:0;z-index:80;padding:.75rem 1.5rem;padding-bottom:max(.75rem,env(safe-area-inset-bottom));background:rgba(6,6,11,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--border);display:flex;align-items:center;justify-content:center;gap:.75rem;transform:translateY(100%);transition:transform .3s ease}
    .bottom-cta.show{transform:translateY(0)}
    .bottom-cta a{background:var(--accent);color:#fff;font-size:.95rem;font-weight:600;padding:.75rem 2rem;border-radius:.75rem;text-decoration:none;transition:all .2s;flex-shrink:0}
    .bottom-cta a:hover{background:var(--accent-glow)}
    .bottom-cta-text{font-size:.78rem;color:var(--text-dim);display:none}
    @media(min-width:500px){.bottom-cta-text{display:block}}

    /* Footer */
    footer{text-align:center;padding:2rem 1.5rem 5rem;border-top:1px solid var(--border);font-size:.8rem;color:var(--text-muted)}

    .div{height:1px;background:var(--border);max-width:900px;margin:0 auto}

    @media(max-width:600px){
      .grid,.privacy{grid-template-columns:1fr}
      section{padding:3.5rem 1.25rem}
      .phone{width:180px;height:360px}
      .phone-days{font-size:1.5rem}
      .phone-ring{width:90px;height:90px}
      .steps{flex-direction:column;align-items:center}
      .step{min-width:unset;max-width:280px}
    }
  </style>
</head>
<body>

  <!-- Sticky Header (shows on scroll) -->
  <div class="sticky-header" id="stickyHeader">
    <span class="logo">${app.name}</span>
    <a href="${app.appUrl}" class="hdr-cta">Open App</a>
  </div>

  <!-- Hero -->
  <header class="hero" id="hero">
    <div class="badge">100% Free &amp; Private</div>
    <h1>${app.heroTitle}</h1>
    <p class="hero-sub">${app.heroSub}</p>
    <p class="emotional">${app.emotionalLine}</p>
    <a href="${app.appUrl}" class="cta" id="heroCta">Start Your Streak — Free <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <span class="cta-sub">No signup. No download. Just open and start.</span>

    <div class="trust-row">
      <span class="trust-item"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> 100% Private</span>
      <span class="trust-item"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 3 4-6"/></svg> No Account Needed</span>
      <span class="trust-item"><svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Works Offline</span>
    </div>

    <!-- Phone Mockup -->
    <div class="phone-wrap">
      <div class="phone">
        <div class="phone-notch"></div>
        <div class="phone-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="5"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="${app.accentColor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="94" transform="rotate(-90 60 60)" style="filter:drop-shadow(0 0 8px ${app.accentColor})"/>
          </svg>
          <span class="phone-days">47</span>
        </div>
        <span class="phone-label">${app.streakLabel}</span>
        <span class="phone-phase">${app.phases[4]?.label || app.phases[3]?.label}</span>
        <div class="phone-tree">&#127793;</div>
        <div class="phone-bottom">
          <div class="phone-dot active"></div>
          <div class="phone-dot"></div>
          <div class="phone-dot"></div>
          <div class="phone-dot"></div>
        </div>
      </div>
    </div>
  </header>

  <div class="div"></div>

  <!-- How it works -->
  <section class="reveal">
    <h2>Start in 3 Seconds</h2>
    <p class="sub">No account. No app store. No friction.</p>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <h3>Open the Link</h3>
        <p>Tap the button. ${app.name} opens instantly in your browser.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <h3>Tap "Start"</h3>
        <p>One tap to begin. Your streak starts counting immediately.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <h3>Watch Progress</h3>
        <p>Track milestones, see your tree grow, and celebrate every day.</p>
      </div>
    </div>
  </section>

  <div class="div"></div>

  <!-- Features -->
  <section class="reveal">
    <h2>Everything You Need</h2>
    <p class="sub">Built for people who want to change. Every feature exists because it actually helps.</p>
    <div class="grid">${app.features.map(f => `
      <div class="card"><div class="icon">${f.icon}</div><h3>${f.title}</h3><p>${f.desc}</p></div>`).join('')}
    </div>
  </section>

  <div class="div"></div>

  <!-- Recovery Phases -->
  <section class="reveal">
    <h2>Science-Backed Recovery Phases</h2>
    <p class="sub">Your body goes through real changes. ${app.name} shows you exactly where you are.</p>
    <div class="phases">${app.phases.map(p => `
      <div class="phase"><span class="phase-day" style="color:${p.color}">${p.days}</span><div><div class="phase-label">${p.label}</div><div class="phase-desc">${p.desc}</div></div></div>`).join('')}
    </div>
  </section>

  <div class="div"></div>

  <!-- Privacy -->
  <section class="reveal">
    <h2>Your Privacy is Non-Negotiable</h2>
    <p class="sub">Your journey is personal. Your data should be yours alone.</p>
    <div class="privacy">
      <div class="priv-item"><div class="pi">&#128274;</div><h3>No Account</h3><p>No email, no password, no signup. Just open and start.</p></div>
      <div class="priv-item"><div class="pi">&#128241;</div><h3>On-Device Only</h3><p>All data stays in your browser. Nothing sent to any server.</p></div>
      <div class="priv-item"><div class="pi">&#128683;</div><h3>No Tracking</h3><p>No analytics, no cookies, no telemetry. Zero data collection.</p></div>
      <div class="priv-item"><div class="pi">&#128268;</div><h3>Works Offline</h3><p>Install as an app. Works without internet once loaded.</p></div>
    </div>
  </section>

  <div class="div"></div>

  <!-- FAQ -->
  <section class="reveal">
    <h2>Frequently Asked Questions</h2>
    <div class="faq">${app.faqs.map(f => `
      <div class="faq-item" onclick="this.classList.toggle('open')">
        <div class="faq-q">${f.q}<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
        <div class="faq-a">${f.a}</div>
      </div>`).join('')}
    </div>
  </section>

  <!-- Final CTA -->
  <div class="final reveal">
    <h2>Start Today</h2>
    <p>Every journey begins with a single day. Make today Day 1.</p>
    <a href="${app.appUrl}" class="cta">Start Your Streak — Free <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
    <span class="cta-sub">No signup. No download. Just open and start.</span>
  </div>

  <!-- Sticky Bottom CTA -->
  <div class="bottom-cta" id="bottomCta">
    <span class="bottom-cta-text">100% free &amp; private</span>
    <a href="${app.appUrl}">Start Your Streak</a>
  </div>

  <footer><p>${app.name} is a free, open tool for anyone ready to change.</p><p style="margin-top:.5rem">Your data never leaves your device.</p></footer>

  <!-- FAQ Schema -->
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${app.faqs.map(f => `{"@type":"Question","name":"${f.q}","acceptedAnswer":{"@type":"Answer","text":"${f.a.replace(/"/g, '\\"')}"}}`).join(',')}]}
  </script>

  <script>
    // Sticky header: show after scrolling past hero CTA
    const heroCta = document.getElementById('heroCta');
    const stickyHeader = document.getElementById('stickyHeader');
    const bottomCta = document.getElementById('bottomCta');
    const observer = new IntersectionObserver(([e]) => {
      stickyHeader.classList.toggle('show', !e.isIntersecting);
      bottomCta.classList.toggle('show', !e.isIntersecting);
    }, { threshold: 0 });
    observer.observe(heroCta);

    // Scroll reveal animations
    const reveals = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }});
    }, { threshold: 0.1 });
    reveals.forEach(el => revealObs.observe(el));
  </script>
</body>
</html>`
}

// Generate all landing pages
const today = new Date().toISOString().split('T')[0]
apps.forEach(app => {
  const dir = path.join(__dirname, `landing-${app.id}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), generateHTML(app))

  // Generate robots.txt
  fs.writeFileSync(path.join(dir, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: https://${app.id}-landing.vercel.app/sitemap.xml\n`)

  // Generate sitemap.xml
  fs.writeFileSync(path.join(dir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://${app.id}-landing.vercel.app/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`)

  console.log(`Generated: landing-${app.id}/ (index.html, robots.txt, sitemap.xml)`)
})

console.log('\nAll 9 landing pages generated!')
