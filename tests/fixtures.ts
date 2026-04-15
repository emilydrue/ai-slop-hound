/**
 * Labeled corpus for scorer regression and accuracy checks.
 *
 * Fixtures are synthetic but modeled after patterns catalogued in memory
 * (`project_detection_notes.md`, `reference_test_posts.md`). Each fixture
 * targets a specific signal category. Replace synthetic bodies with real
 * Reddit text as it becomes available — the harness treats them identically.
 *
 * Labeling:
 *   - `ai`     — should score below 0.50 overall (bark >= 2)
 *   - `human`  — should score above 0.55 overall (bark <= 1)
 *   - `edge`   — known-hard case; record-only, not asserted
 */

import type { AuthorInfo } from '../src/types.js';

export type Label = 'ai' | 'human' | 'edge';

export interface Fixture {
  id: string;
  label: Label;
  title: string | null;
  body: string;
  author: AuthorInfo | null;
  upvotes: number | null;
  rationale: string;
}

const AI_CLASSIC = `I used to think productivity was about working harder — longer hours, more tasks, endless to-do lists. I was wrong.

After years of burnout and frustration, I finally realized something profound. It is not about doing more. It is about doing what matters.

The shift happened one Tuesday morning. I was sitting at my desk, coffee in hand, staring at a list of thirty-seven items. Something shifted. I closed the laptop.

Here is what I learned:

- Focus on the vital few, not the trivial many
- Protect your attention like a precious resource
- Learn to say no, even when it is uncomfortable

That was three years ago. Today, I work fewer hours and accomplish more than I ever did. The irony is not lost on me.

If this resonates with anyone, I would love to hear your experience below.`;

const AI_ENGAGEMENT_BAIT = `This is going to sound crazy, but hear me out.

Last month, I quit my six-figure tech job to become a dog walker. Everyone thought I had lost my mind. My parents were furious. My friends stopped calling. But something deep inside told me this was the right path.

On my first day, a golden retriever named Max changed everything. He looked up at me with those big brown eyes, and I realized something that I had been missing for a decade.

Life is not about the title on your LinkedIn. It is about the small moments that make you feel alive.

I am making less money than I ever have. I am also happier than I have ever been. How did we not question any of this sooner?

Sound familiar? Drop a comment if you have had a similar wake-up call. I read every one.`;

const AI_PET_VOICE = `AITC for stealing the Christmas ham?

Okay so my human left the ham on the counter. Just sitting there. Unguarded. I am a dog. What did she expect? I am a very good boy most of the time but this was an obvious trap.

I waited until she went upstairs. Then I jumped up and grabbed the ham. It was glorious. I took it to my bed and ate the entire thing in what can only be described as a spiritual experience.

When she came back down, she was not pleased. There was yelling. There were threats. There were phone calls to the vet about whether dogs can eat that much ham.

Now she says I am on a diet and I have betrayed her trust. But the ham was right there. And I am a dog. So AITC or was this simply my destiny?`;

const AI_ESL_FAKEOUT = `I wish to share the experience of investment opportunity that has changed my financial situation completely.

Three months ago, I was in difficult position. I had no savings, only debt and anxiety about the future. Then a colleague introduced me to a strategy. It is not about luck. It is about disciplined approach.

The strategy consists of three simple steps. First, one must identify markets that have been consistently undervalued. Second, one should allocate capital across diverse instruments. Third, one is required to maintain patience when volatility arrives.

I would not recommend this approach if I had not witnessed the results myself. My portfolio has grown significantly. My stress has diminished. I sleep through the night.

If you wish to learn more about this strategy, I invite you to reply below. I will share the resources that transformed my perspective.`;

const HUMAN_ESL_APOLOGY = `sorry for my english is not first language. i want to ask about situation at my work.

my boss is telling me i must stay late every day for two weeks, no extra pay. he say it is normal in this country. but my coworker she is from here she say this is not normal? i am confused.

in my country we also work hard but there is law about extra hours. here also there is law i think but my boss say law is different for my visa type. i dont know if he is telling truth or he is taking advantage because i am foreigner.

i dont want to lose job, i need visa for my wife and kid. but also i am so tired every day i am not good father when i come home. what should i do? any advice from people who have been in same situation?

thank you for reading. please be kind i am trying my best.`;

const HUMAN_BROKEN_PET = `AITC for the bath incident????

It happened. The bath. I smelled fine. I smelled LIKE ME. But no. Hooman says I roll in somethign dead. Maybe. Who can say. I am a dog.

She pick me up. Put me in water. WATER. I do the scream. Scream scream scream. Neighbor knock on door ask if everything ok. Hooman says yes just giving dog bath. LIE. Torture.

After, I zoom. Zoom around house. Wet zoom. Knock over lamp. Not sorry. She deserve.

Now I smell like flower. Flower??? I am a dog not flower. AITC or is she the cloaca here because I think she the cloaca.`;

const HUMAN_MESSY_RANT = `ok so my landlord just sent me a 200 dollar bill for "cleaning fees" after i moved out last month and im LOSING it

i left that place spotless. like, spotless. i spent an entire saturday scrubbing the oven. THE OVEN. and she's charging me for "deep clean of kitchen"?? what deep clean??

also she kept the security deposit AND is asking for more money on top of that. is this even legal? i live in MA btw. i tried to call her and she doesnt answer, then her husband texted me saying i need to "respect the process" whatever the hell that means

idk what to do. i dont have 200 bucks laying around. should i just ignore it?? or will they send this to collections?? i've never had to deal with this kind of bs before and i dont know my rights. any help appreciated, i am so tired of this lol`;

const HUMAN_THOUGHTFUL_ESSAY = `Been lurking on this sub for a while but finally made an account to post this.

I've been thinking a lot about why my generation (millennials if it matters) seems to have such a complicated relationship with homeownership. Grew up being told it was the pinnacle of adulthood, the "American dream", blah blah. Now that I can finally afford one, I'm not sure I actually want it.

Part of it is the math. When I run the numbers, buying in my city would cost me almost twice what I pay in rent when you factor in maintenance, property taxes, opportunity cost on the down payment, etc. People forget about that last one.

Part of it is flexibility. My job has me moving every 2-3 years. A house would be an anchor.

But honestly, part of it is that the whole narrative feels like something I was sold, not something I chose. My parents bought their house in 1982 for 48k. That house is now "worth" 650k. Great for them but it's also the reason I can't buy one.

Anyone else feel weird about this? Am I overthinking it?`;

const HUMAN_EDGE_SHORT = `yeah this happened to me too last year. ended up just eating the cost because fighting it wasnt worth the stress. sucks though.`;

export const FIXTURES: Fixture[] = [
  {
    id: 'ai_classic_chatgpt',
    label: 'ai',
    title: 'I quit my 37-item to-do list and my life changed forever',
    body: AI_CLASSIC,
    author: null,
    upvotes: null,
    rationale: 'em dash, parallel structure, bullet list, engagement CTA, empty intensifiers, topic-shift paragraphs',
  },
  {
    id: 'ai_engagement_bait',
    label: 'ai',
    title: 'I quit my six-figure job to walk dogs. Here is what happened.',
    body: AI_ENGAGEMENT_BAIT,
    author: null,
    upvotes: null,
    rationale: 'dramatic pivots, clickbait title, "sound familiar" bait, polished anecdote, second-person narrative',
  },
  {
    id: 'ai_pet_voice',
    label: 'ai',
    title: 'AITC for stealing the Christmas ham',
    body: AI_PET_VOICE,
    author: null,
    upvotes: null,
    rationale: 'pet-voice cover for clean prose — known weak spot per detection notes, 200+ words of polished narrative',
  },
  {
    id: 'ai_esl_fakeout',
    label: 'ai',
    title: 'The investment strategy that changed my life',
    body: AI_ESL_FAKEOUT,
    author: null,
    upvotes: null,
    rationale: 'formal grammar mimicking ESL but no apology, promotional structure, "I wish to" / "one must" patterns',
  },
  {
    id: 'human_esl_apology',
    label: 'human',
    title: 'boss making me work late every day no extra pay help?',
    body: HUMAN_ESL_APOLOGY,
    author: null,
    upvotes: null,
    rationale: 'real ESL apology, consistent article dropping, cultural context (visa, family), humility',
  },
  {
    id: 'human_broken_pet',
    label: 'human',
    title: 'AITC for the bath incident',
    body: HUMAN_BROKEN_PET,
    author: null,
    upvotes: null,
    rationale: 'broken grammar fragments, pet dialect (hooman, zoom), excessive punctuation, caps for emphasis',
  },
  {
    id: 'human_messy_rant',
    label: 'human',
    title: 'landlord charging me $200 after I moved out, is this legal?',
    body: HUMAN_MESSY_RANT,
    author: null,
    upvotes: null,
    rationale: 'typos, profanity, caps, fragments, lowercase "i", no em dash, messy paragraph lengths',
  },
  {
    id: 'human_thoughtful_essay',
    label: 'edge',
    title: 'Am I overthinking the homeownership thing?',
    body: HUMAN_THOUGHTFUL_ESSAY,
    author: null,
    upvotes: null,
    rationale: 'articulate human — coherent paragraphs but contractions, specific numbers, personal detail, self-questioning close. Hardest category.',
  },
  {
    id: 'human_edge_short',
    label: 'edge',
    title: null,
    body: HUMAN_EDGE_SHORT,
    author: null,
    upvotes: null,
    rationale: 'below typical min-length threshold — short human reply. Record-only.',
  },
];
