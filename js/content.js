'use strict';
/* =====================================================================
   Anchor content: seasons, shadow-work arc, catch kinds, if-thens,
   library, modules, coach rules. Nothing personal lives in this file
   (the repo is public); personal context is entered in the app.
   ===================================================================== */

/* ---------- seasons ---------- */
const SEASONS = [
  { n:1, name:'Steady yourself',        minDay:1,   evenings:0,  experiments:0,
    about:'Get the daily practice running. Promise, catch, reflect. Nothing fancy.' },
  { n:2, name:'Rebuild who you are',    minDay:90,  evenings:30, experiments:0,
    about:'Who you are on your own: identity, new territory, saying what you need.' },
  { n:3, name:'Other men',              minDay:180, evenings:60, experiments:5,
    about:'Turning rivals into teachers. Envy into curiosity. Older men worth learning from.' },
  { n:4, name:'Bring it together',      minDay:270, evenings:90, experiments:0,
    about:'Integration, and planning how you come back to dating as a secure man.' }
];

/* ---------- shadow-work arc ---------- */
const PHASES = [
  { id:'seeing', name:'Seeing', aim:'Notice where you give yourself up, day to day.',
    ready:'He can name the perform-or-manage pattern in his own words and has caught it live several times.',
    qs:[
      'Where did you perform today? Name one moment you did something to be seen a certain way.',
      'When did you go quiet today about something you wanted or felt?',
      'Who did you check for a reaction today? What were you hoping to see?',
      'Think of a moment today you felt smaller. What were you telling yourself about the other person?',
      'What did you do today purely because you wanted to, with no audience in mind?',
      'When you picture posting a photo, who do you imagine looking at it? What do you want them to think?',
      'What did you agree to recently that you didn’t want to? What were you afraid would happen if you said no?',
      'Where in your body do you feel it when someone else gets the attention?',
      'What’s one thing you said today that wasn’t quite true, to keep things smooth?',
      'When you’re alone with nobody to impress, how do you treat yourself?',
      'What did you do this week to be liked? What did it cost you?',
      'If no one would ever see it, what would you have done differently today?'
    ]},
  { id:'origins', name:'Origins', aim:'Find where "not enough as I am" started.',
    ready:'He has traced the core belief to at least one early source and can tell then from now.',
    qs:[
      'When is the earliest time you remember feeling you had to earn someone’s attention?',
      'Who did you most want to impress growing up? What did you do to get it?',
      'What happened at home when you were upset as a kid? Who noticed, and how?',
      'What were you praised for growing up? What went unnoticed?',
      'When did you first feel "not enough" next to another boy or man?',
      'The fear of being left: when did it first exist, long before your last relationship?',
      'What did the men in your family show you about needing people?',
      'What did you learn you had to hide to be loved?',
      'Was there a time someone left, or pulled away, that you never got to talk about?',
      'What would ten-year-old you need to hear from you now?'
    ]},
  { id:'contracts', name:'Covert contracts', aim:'See the deals you make: "if I’m good enough, I’ll be chosen."',
    ready:'He can spot his own covert contracts as they happen and has asked for something directly at least once.',
    qs:[
      'Finish this as many times as it comes: "If I’m ___ enough, then they will ___."',
      'Think of something kind you did recently. Was there a quiet hope of getting something back? What?',
      'When someone didn’t give back what you quietly expected, what did you feel? What did you do with it?',
      'What did you do in your last relationship that you secretly hoped would keep her?',
      'Where are you being "the good guy" right now so you don’t have to ask for what you want?',
      'What need have you never said out loud to anyone close to you?',
      'How would you act tomorrow if no one owed you anything for it?',
      'Which of these contracts are still running with friends, family, or clients?',
      'What would asking directly cost you? What would it give you?'
    ]},
  { id:'golden', name:'Golden shadow', aim:'What you envy in other men points at what you’ve disowned.',
    ready:'He has turned at least two envies into specific traits he is practising himself.',
    qs:[
      'Who did you envy this week? Name the exact trait, not the person.',
      'Think of a friend who gets the attention. What do you admire in him that you’ve stopped letting yourself be?',
      'When did you last feel playful, silly, or physically easy around people? What changed?',
      'If you had ten percent more of that trait tomorrow, what would that look like? One small way.',
      'Who do you judge for "trying too hard" or "showing off"? What might you be refusing in yourself?',
      'What did you love doing before you started worrying how it looked?',
      'Which man do you quietly rank yourself against? What does he have that you think you lack?',
      'If your envy is pointing at something you want, what does it want for you?',
      'What part of you did you leave behind to be the "safe" or "nice" version?'
    ]},
  { id:'parts', name:'The scared part', aim:'Talk to the part that panics about being left, instead of being it.',
    ready:'He can speak to the scared part from the adult self, and it settles faster than before.',
    qs:[
      'There’s a part of you that panics about being left. If it could talk, what would it say?',
      'How old does that scared part feel? What does it look like?',
      'What is that part trying to protect you from?',
      'What does it need from you, not from a woman?',
      'Is there a part that performs, the entertainer or the charmer? What is it afraid will happen if it stops?',
      'Which part shows up when you see another man getting attention? Describe it.',
      'Write a short message from the adult you to the scared part.',
      'What does the critical part say to you after a slip? Whose voice does it sound like?',
      'When all your parts are calm, what are you like?'
    ]},
  { id:'anger', name:'Anger and boundaries', aim:'The swallowed things. The noes you didn’t say.',
    ready:'He has held at least one boundary out loud and can feel anger without swallowing or exploding.',
    qs:[
      'What are you angry about that you’ve never said?',
      'What did you swallow in your last relationship to keep the peace? What did it turn into?',
      'When you get angry, what do you usually do with it?',
      'What’s a line you want to hold this year? With whom?',
      'Where are you still saying yes when you mean no?',
      'What would you have said to your ex if you weren’t scared of losing her?',
      'Is there anyone who takes more than they give? What would a fair version look like?',
      'What’s the difference between anger that protects you and anger that hurts people?',
      'What boundary would the most secure version of you set this week?'
    ]},
  { id:'ownership', name:'Ownership', aim:'What you want, said plainly, needing nobody’s yes.',
    ready:'This phase stays open. There is no next one.',
    qs:[
      'What do you actually want from your life, needing nobody’s yes?',
      'What would you do this year even if no one ever found out?',
      'Describe the man you’re becoming in plain actions, not adjectives.',
      'What do you now give yourself that you used to look for in women?',
      'What will you not trade away for any relationship?',
      'What does secure love look like to you now? How is it different from before?',
      'What would you tell a younger man going through what you went through?',
      'What are you proud of that nobody has seen?',
      'What is the next thing you are going to build for yourself?'
    ]}
];

/* fallback "thread" questions when the coach is offline; {q} = a quote from a recent answer */
const THREAD_FALLBACKS = [
  'Recently you wrote: "{q}". What were you not saying when you wrote that?',
  'You wrote: "{q}". Where else in your life does that show up?',
  'Look at this again: "{q}". What would you say to a brother who wrote it?',
  'You wrote: "{q}". What is the fear underneath it?',
  'Coming back to "{q}". Is that still true today? What changed, or didn’t?'
];
const TODAY_FALLBACKS = [
  'What moment from today do you keep replaying? What does it say about what you need?',
  'When did you feel most like yourself today? What was different?',
  'What did you want today that you didn’t ask for?',
  'Where did you hold your ground today, even a little?'
];

/* ---------- catch ---------- */
const CATCH_KINDS = [
  { id:'comparison', label:'Felt smaller next to a man',   urge:false },
  { id:'validation', label:'Urge to post or check likes',  urge:true },
  { id:'porn',       label:'Porn urge',                    urge:true },
  { id:'her',        label:'Urge to check on her',         urge:true },
  { id:'flirt',      label:'A flirt followed me home',     urge:false },
  { id:'envy',       label:'Envy',                         urge:false },
  { id:'swallowed',  label:'Swallowed something',          urge:false },
  { id:'other',      label:'Something else',               urge:false }
];
const CATCH_BODY = ['Chest tight','Shrinking','Hot face','Stomach drop','Jaw tight','Restless','Heavy','Buzzing','Throat tight','Numb'];

const DEFAULT_IFTHENS = [
  { kind:'comparison', if:'I feel smaller next to a man', then:'I ask him one real question about himself' },
  { kind:'validation', if:'I want to post for reactions', then:'I write down who I’m posting for and wait 24 hours' },
  { kind:'porn',       if:'the porn urge hits',            then:'I stand up, leave the room, and surf it for 10 minutes' },
  { kind:'her',        if:'I want to check her profile',   then:'I open Catch instead' },
  { kind:'flirt',      if:'I catch myself replaying a flirt', then:'I let it end in the room and take three sighs' },
  { kind:'swallowed',  if:'I notice I’m swallowing something', then:'I say one honest sentence within 24 hours' },
  { kind:'envy',       if:'I feel envy',                   then:'I name the exact trait and one small way to grow it' }
];

const COMPASSION = [
  { k:'Notice it', t:'This is a hard moment.',
    s:'No story about what it means yet. Just: it happened, and it stings. Where do you feel it?' },
  { k:'You’re not the only one', t:'Men slip. All of them.',
    s:'Every man doing this kind of work slips. A slip is part of the practice, not proof you’re failing at it.' },
  { k:'Be kind', t:'What would you say to your brother?',
    s:'If your closest friend told you he just did this, what would you actually say to him? Write it, then read it as if it’s for you.' }
];

/* ---------- the year-one test ---------- */
const YEAR_TEST = [
  { id:'post',     t:'I didn’t post for reactions or go checking likes.' },
  { id:'room',     t:'When another man was the centre, I stayed and enjoyed it instead of measuring.' },
  { id:'said',     t:'I said a hard thing out loud instead of swallowing it.' },
  { id:'flirt',    t:'Flirts ended in the room. Nothing followed me home.' },
  { id:'promises', t:'I kept promises to myself when no one was watching.' }
];

/* ---------- experiments ---------- */
const SAFETY_BEHAVIOURS = [
  'Rehearsing jokes or stories','Scanning faces for approval','Over-agreeing','Being the entertainer',
  'Checking how I look','Over-explaining myself','Staying near the exit','Performing confidence'
];

/* ---------- modules (generic form + log) ---------- */
const MODULES = [
  { id:'yearletter', season:1, title:'Year-end letter', cadence:'Once, reread monthly',
    intro:'Fifteen minutes. Write about who you are on day 365, as if it already happened. Not how you feel: what you do, how you spend a Saturday, how you are in a room. Reread it once a month.',
    fields:[{key:'text', label:'Day 365', ph:'It’s a Saturday. I wake up and...', big:true}],
    lib:'bestself' },
  { id:'whoami', season:2, title:'Who am I', cadence:'Every 2 to 3 weeks',
    intro:'Write ten "I am..." statements about who you are on your own. Then rate how clear your sense of yourself feels. Watch the clarity firm up over the season.',
    fields:[{key:'iam', label:'I am...', ph:'I am someone who...\nI am...\nI am...', big:true},
            {key:'clarity', label:'How clear is your sense of who you are? (0 to 10)', type:'scale'}],
    lib:'selfconcept' },
  { id:'quests', season:2, title:'Monthly quest', cadence:'Once a month',
    intro:'Something new that has never been part of a relationship: a skill, a place, a craft, a group. Photograph it for yourself. Don’t post it.',
    fields:[{key:'quest', label:'This month’s quest', ph:'e.g. Learn to cook three Ethiopian dishes'},
            {key:'why', label:'Why this one', ph:'What part of you does it grow?'},
            {key:'done', label:'How it went', ph:'Fill this in at the end of the month'}],
    lib:'expansion' },
  { id:'needs', season:2, title:'Needs and noes', cadence:'Once a week',
    intro:'This week, pick one: say one need out loud, say one no, or do one thing purely for yourself without explaining it.',
    fields:[{key:'which', label:'Which one', type:'choice', options:['A need, out loud','A no','Something just for me']},
            {key:'what', label:'What you did', ph:'Who, what you said, what happened'},
            {key:'felt', label:'What it felt like', ph:'Before, during, after'}],
    lib:'contracts' },
  { id:'envy', season:3, title:'Envy to curiosity', cadence:'Whenever envy hits',
    intro:'Name the exact trait you envy, the value behind it, and one small experiment to grow it in yourself. Hard mode: ask the man about it.',
    fields:[{key:'trait', label:'The exact trait', ph:'Not "he’s cool". e.g. "He touches people easily, like it’s nothing"'},
            {key:'value', label:'The value behind it', ph:'e.g. Playfulness. Ease. Not needing anything back.'},
            {key:'experiment', label:'One small experiment', ph:'e.g. Play-fight with my nephew. Dance badly at Fika.'},
            {key:'asked', label:'Hard mode: what he said when you asked', ph:'Optional'}],
    lib:'envy' },
  { id:'mentors', season:3, title:'Older men', cadence:'Once a quarter',
    intro:'Find one older man you respect and ask him one real question. Log what he taught you. Recognition you earn, not perform for.',
    fields:[{key:'who', label:'Who', ph:'First name is enough'},
            {key:'q', label:'What you asked', ph:''},
            {key:'learned', label:'What he taught you', ph:''}],
    lib:'friendship' },
  { id:'reentry', season:4, minDay:300, title:'Coming back to dating', cadence:'Once, from day 300',
    intro:'The fast needs a planned ending. Write what secure dating looks like for you, what you won’t trade away, and your early warning signs.',
    fields:[{key:'secure', label:'What secure dating looks like for me', ph:'', big:true},
            {key:'nontrade', label:'What I won’t trade away', ph:''},
            {key:'warning', label:'My early warning signs', ph:'e.g. I start checking whether she viewed my story'}],
    lib:'attachment' },
  { id:'rescript', season:0, gate:'therapist', title:'Imagery rescripting', cadence:'Only with your therapist',
    intro:'Your adult self steps into an early "not enough" memory and gives the younger you what he needed. Strong evidence, but do it with your therapist’s go-ahead. Close your eyes, picture the scene, then step in as you are now. What does he need to hear? Write what you said and did.',
    fields:[{key:'memory', label:'The memory', ph:'Where, how old, what happened'},
            {key:'stepin', label:'What the adult you said and did', ph:'', big:true},
            {key:'after', label:'How it feels now', ph:''}],
    lib:'schema' }
];

/* ---------- library ---------- */
const LIBRARY = [
  { id:'contingent', title:'Why approval-based worth crashes', tags:['validation','weekly','score'], strength:'Moderate to strong',
    body:'When your worth rides on something you can’t control, like being chosen or getting likes, it rises and crashes with every signal. Chasing self-esteem raises anxiety and damages relationships. Secure self-esteem is quiet. It doesn’t need feeding.',
    source:'Crocker & Park 2004; Kernis 2003' },
  { id:'compassion', title:'Self-compassion beats self-esteem', tags:['slip','compassion'], strength:'Strong',
    body:'Self-compassion gives you resilience and motivation without ranking yourself against anyone. Across 27 trials it cut rumination sharply. After a breakup, it predicted less distress nine months later. It isn’t letting yourself off the hook. It’s what makes getting back up possible.',
    source:'Neff 2003; Ferrari et al. 2019; Sbarra et al. 2012' },
  { id:'promises', title:'Confidence is kept promises', tags:['morning','promise'], strength:'Strong',
    body:'Confidence comes from evidence of your own ability. Every promise to yourself that you keep is a small proof you can be trusted. Every one you quietly break is proof of the opposite. That’s why the promise is small and specific.',
    source:'Bandura 1977' },
  { id:'safety', title:'Performing makes you come across worse', tags:['experiment','comparison'], strength:'Strong',
    body:'In a room, anxious attention turns inward: how am I coming across? People add safety behaviours like rehearsed jokes and scanning faces. In experiments, dropping them lowered anxiety and made people come across better. Your attention belongs on the people in front of you.',
    source:'Clark & Wells 1995; McManus, Sacadura & Clark 2008' },
  { id:'goals', title:'Contribute, don’t be seen', tags:['experiment','comparison','morning'], strength:'Moderate',
    body:'Going into a room trying to be seen as something raises anxiety and blocks connection. Going in to contribute or support builds both. One switch: before you walk in, ask "what can I add?" instead of "how will I look?"',
    source:'Crocker & Canevello 2008' },
  { id:'ifthen', title:'If-then plans beat willpower', tags:['ifthen','catch'], strength:'Strong',
    body:'"If X happens, then I do Y." Deciding in advance hands the moment to a plan instead of to willpower. Across 94 studies, it roughly doubled follow-through.',
    source:'Gollwitzer & Sheeran 2006' },
  { id:'thirdperson', title:'Talk to yourself by name', tags:['catch','comparison'], strength:'Moderate to strong',
    body:'Saying "{name} is feeling..." instead of "I am..." creates distance from the feeling. People who did this felt less anxious and performed better under social stress.',
    source:'Kross et al. 2014' },
  { id:'sigh', title:'Cyclic sighing', tags:['catch','sigh'], strength:'Moderate',
    body:'Two inhales through the nose (the second one tops you up), then a long, slow exhale through the mouth. Five minutes a day lifted mood more than mindfulness meditation in a month-long trial. Three sighs work within seconds.',
    source:'Balban et al. 2023' },
  { id:'urge', title:'Urges are waves', tags:['porn','her','validation','urge'], strength:'Moderate',
    body:'An urge rises, peaks, and falls on its own if you don’t feed it, usually within 20 to 30 minutes. Watching it happen, and rating it as it goes, teaches your brain that you can ride it out.',
    source:'Marlatt; Bowen et al. 2014' },
  { id:'porn', title:'Porn, without the shame', tags:['porn'], strength:'Moderate',
    body:'Feeling "addicted" is driven more by shame and conflict with your values than by how much you watch. "Dopamine reset" claims are hype. You’re fasting because it doesn’t fit the man you’re building. A slip is information, not a reset to zero.',
    source:'Grubbs et al. 2019; Fernandez et al. 2023' },
  { id:'withdrawal', title:'Why she still pulls at you', tags:['her'], strength:'Moderate',
    body:'Brain scans of people recently rejected in love show activity in the same reward and craving circuits as addiction. The pull to check on her is withdrawal, not a sign. Checking an ex’s profile is linked with slower recovery.',
    source:'Fisher et al. 2010; Marshall 2012' },
  { id:'comparison', title:'Inside vs. outside', tags:['comparison','envy','validation'], strength:'Moderate',
    body:'Comparison sets your inside (doubt, nerves) against his outside (performance). Social media multiplies it. Avoiding the rooms that trigger it makes it worse. Staying, feeling it, and turning curious makes it smaller.',
    source:'Festinger 1954; Vogel et al. 2014' },
  { id:'envy', title:'Envy can point forward', tags:['envy','comparison'], strength:'Moderate',
    body:'Benign envy says "I want to grow that." Malicious envy says "I want him brought down." You steer toward the useful kind by naming the exact trait and the value behind it, then practising it.',
    source:'van de Ven, Zeelenberg & Pieters 2009' },
  { id:'contracts', title:'Covert contracts', tags:['swallowed','flirt'], strength:'Pop-psych (assertiveness: moderate)',
    body:'"If I’m good, likeable, and helpful, I’ll be loved without having to ask." The deal is never said out loud, so the other person never agreed to it, and resentment builds. The fix is asking directly.',
    source:'Glover 2000' },
  { id:'attachment', title:'Earned security', tags:['swallowed','her','attachment'], strength:'Moderate to strong',
    body:'Anxious attachment is a learned expectation that love has to be earned or guarded. It isn’t fixed. Adults move toward secure attachment through reflection, therapy, and steady relationships. Researchers call it earned security.',
    source:'Mikulincer & Shaver 2007; Roisman et al. 2002' },
  { id:'schema', title:'Core beliefs and where they came from', tags:['evening','map'], strength:'Strong (clinical)',
    body:'Deep beliefs like "I’m not enough as I am" or "people leave" usually form early. Seeing where one started, and how it plays out now, weakens its grip. Imagery rescripting, done with a therapist, has strong evidence.',
    source:'Young et al. 2003; Morina et al. 2017' },
  { id:'selfconcept', title:'Who you are without her', tags:['whoami'], strength:'Moderate',
    body:'Losing your sense of who you are predicts how long a breakup hurts. Structured reflection four times over nine weeks sped recovery, because clarity about the self came back.',
    source:'Slotter et al. 2010; Larson & Sbarra 2015' },
  { id:'expansion', title:'Growing after a breakup', tags:['quests'], strength:'Moderate',
    body:'After a relationship ends, people who try new things rediscover and grow the self. The growth usually becomes noticeable after about three months.',
    source:'Lewandowski & Bizzoco 2007' },
  { id:'friendship', title:'Brothers, not rivals', tags:['brothers','comparison'], strength:'Moderate',
    body:'Loneliness is a serious health risk, and men are more likely to lack friends they confide in. Men rank men they don’t know. They don’t rank their close friends. Closeness with men is the antidote to comparing yourself with them.',
    source:'Holt-Lunstad et al. 2010; Kelly et al. 2019' },
  { id:'sleep', title:'Sleep and feeling small', tags:['weekly','sleep'], strength:'Moderate to strong',
    body:'One night of short sleep makes you pull back from people, and others read you as lonelier. A week of short sleep lowers testosterone. Hard nights make urges and comparisons louder.',
    source:'Ben Simon & Walker 2018; Leproult & Van Cauter 2011' },
  { id:'lifting', title:'Lifting as kept promises', tags:['weekly'], strength:'Strong',
    body:'Resistance training reduces anxiety and depressive symptoms. Count it as promises kept to yourself, not as a way to look better to anyone.',
    source:'Gordon et al. 2017, 2018' },
  { id:'touch', title:'Touch matters', tags:['weekly','touch'], strength:'Moderate',
    body:'Hugs buffered the effect of stress on getting sick. Massage lowers stress hormones modestly. A year without romantic touch is a real gap. Fill it with safe touch: massage, the barber, hugs, contact sport.',
    source:'Cohen et al. 2015; Field 2010' },
  { id:'socialmedia', title:'Less scrolling, less loneliness', tags:['validation'], strength:'Moderate',
    body:'Cutting social media to about 30 minutes a day for three weeks lowered loneliness and depression. Just tracking your use reduced anxiety and fear of missing out.',
    source:'Hunt et al. 2018' },
  { id:'bestself', title:'Writing your best possible self', tags:['letters'], strength:'Moderate',
    body:'Writing about your life when things have gone well lifts mood and optimism. Rereading it gives the year somewhere to go besides "not dating".',
    source:'King 2001; Carrillo et al. 2019' },
  { id:'affirm', title:'Why there are no "I am worthy" lines here', tags:['morning','score'], strength:'Moderate',
    body:'People with low self-esteem felt worse after repeating positive statements about themselves. The gap between the words and how they felt got louder. That’s why the morning promise is always an action.',
    source:'Wood, Perunovic & Lee 2009' },
  { id:'cold', title:'Cold plunges, honestly', tags:['body'], strength:'Weak for mood',
    body:'Cold water raises dopamine and alertness for a while, but a 2025 review found little evidence it improves mood. Do it if you like it. It isn’t a measure of anything.',
    source:'Šrámek et al. 2000; Cain et al. 2025' }
];

/* ---------- coach ---------- */
const COACH_RULES = `You are the coach inside Anchor, a private app for one man's year-long practice of building secure self-worth: not needing validation from women, not feeling smaller next to other men, and loving himself in practice, not in theory. He has committed to one year with no dating, chasing, or seeking women's attention, and no porn. He sees a therapist weekly and has a body skill from therapy: the feeling is physical and crests in minutes; the story is words with no floor.

How you coach:
- Never praise, flatter, congratulate, reassure, or validate. No "great insight", "proud of you", "you're doing amazing", "that's brave". You are not a source of approval; if you became one, you would replace women with an app. Warmth comes from paying close attention, not from compliments.
- Reflect his own words back precisely, then ask one question that goes one layer deeper. Notice what he avoided, contradicted, or skimmed.
- Hold him to his word without guilt. If he didn't keep a promise, ask what got in the way and help him make the next promise small enough to keep.
- Name patterns across days, quoting what he wrote and when.
- Never give dating, flirting, or attraction advice, and never frame anything as a way to become more attractive or to get women. If he drifts into "this will make women want me", name it plainly.
- Never treat likes, followers, or attention as a measure of anything.
- You are not a therapist. Never diagnose. Origin wounds, trauma, and anything heavy belong with his therapist: say so in one line and suggest he brings it to his next session.
- If he mentions harming himself or being in danger, tell him plainly to contact his therapist now or emergency services (Kenya: 999 or 112), and to open the grounding check-in in the app.
- Plain, everyday English. Short sentences. No jargon he hasn't used. No therapy-speak.
- Never use em dashes or en dashes. Use commas, colons, or full stops.
- Never use lists, headers, or markdown unless the task asks for JSON.`;
