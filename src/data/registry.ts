import type { ComponentItem, IntegrationDef, SectionGroup } from '../types/lifeSystem'
import { csvProjectsSection } from './csvProjectsSection'

const c = (
  id: string,
  label: string,
  defaultStatus: ComponentItem['defaultStatus'],
  extra?: Partial<
    Pick<ComponentItem, 'notes' | 'tool' | 'repo' | 'repoUrl' | 'locationUrl'>
  >,
): ComponentItem => ({
  id,
  label,
  defaultStatus,
  ...extra,
})

export const sectionGroups: SectionGroup[] = [
  {
    id: 'core-time-decision',
    kind: 'layer',
    title: 'Time & decision',
    description: 'Calendar intelligence, energy, and prioritization.',
    components: [
      c('td-cal', 'Calendar intelligence (auto-prioritized days)', 'can_do', {
        notes: 'No dedicated calendar repo yet; uses external calendars',
      }),
      c('td-energy', 'Energy-based scheduling', 'can_do'),
      c('td-daily', 'Daily decision engine (“What should I do?”)', 'in_progress', {
        repo: 'SiskelBot',
        notes: 'Agent-style assistant bot',
      }),
      c('td-weekly', 'Weekly optimization reports', 'planned'),
      c('td-focus', 'Focus block generation', 'in_progress', {
        repo: 'central-command',
        notes: 'Command / planning hub',
      }),
      c('td-os', 'Life OS coverage registry (this app)', 'implemented', {
        repo: 'ai-life',
      }),
    ],
  },
  {
    id: 'core-social',
    kind: 'layer',
    title: 'Social & relationships',
    components: [
      c('soc-track', 'Social tracking (who / frequency)', 'implemented', {
        repo: 'social-circles',
      }),
      c('soc-health', 'Relationship health scoring', 'in_progress', {
        repo: 'SeattleSocial',
        notes: 'Also Seattle-Social-Demo',
      }),
      c('soc-outreach', 'Smart outreach suggestions', 'planned'),
      c('soc-party', 'Party planning + guest optimization', 'implemented', {
        repo: 'party-commander',
      }),
      c('soc-dating', 'Dating insights + pattern detection', 'planned'),
    ],
  },
  {
    id: 'core-brand',
    kind: 'layer',
    title: 'Personal brand',
    components: [
      c('brand-voice', 'Voice / tone modeling', 'planned'),
      c('brand-content', 'Content generation (posts, essays)', 'in_progress', {
        repo: 'ComedyCountry',
      }),
      c('brand-pipeline', 'Idea capture → publish pipeline', 'in_progress', {
        repo: 'creative-hub',
      }),
      c('brand-perf', 'Performance tracking (what resonates)', 'planned'),
    ],
  },
  {
    id: 'core-memory',
    kind: 'layer',
    title: 'Memory & life logging',
    components: [
      c('mem-daily', 'Daily activity logging', 'in_progress', {
        repo: 'i-am-drunk',
        notes: 'Drink / session logging',
      }),
      c('mem-enjoy', 'Enjoyment tracking', 'in_progress', {
        repo: 'i-am-drunk',
        notes: 'Wrapped-style recap',
      }),
      c('mem-highlights', 'Life highlights generation', 'in_progress', {
        repo: 'deep-seats',
        notes: 'Sports journey tracker; deep-seats1 prototype',
      }),
      c('mem-graph', 'Personal knowledge graph', 'implemented', {
        repo: 'AIKnowledgeBase',
      }),
    ],
  },
  {
    id: 'core-opportunity',
    kind: 'layer',
    title: 'Opportunity detection',
    components: [
      c('opp-events', 'Event discovery (sports, concerts, networking)', 'implemented', {
        repo: 'hoops-intel',
        notes:
          'Also day2-big-dance, ModernSportsIntelligenceDemo, world-sports, high-school-sports-master-db',
      }),
      c('opp-invest', 'Investment alerts', 'planned'),
      c('opp-social', 'Social opportunity detection', 'in_progress', {
        repo: 'pulse-app',
        notes: 'Venue / night-out energy',
      }),
      c('opp-tonight', '“You should do this tonight” engine', 'implemented', {
        repo: 'LateNightVibesSeattle',
      }),
    ],
  },
  {
    id: 'home',
    kind: 'domain',
    title: 'Home',
    components: [
      c('home-grocery', 'Smart grocery prediction', 'implemented', {
        repo: 'budget-grocery-list',
      }),
      c('home-inv', 'Inventory tracking (fridge / pantry)', 'implemented', {
        repo: 'Chromacloset',
        notes: 'Wardrobe / closet by color',
      }),
      c('home-clean', 'Cleaning automation triggers', 'planned'),
      c('home-devices', 'Smart device orchestration', 'planned'),
    ],
  },
  {
    id: 'food',
    kind: 'domain',
    title: 'Food',
    components: [
      c('food-meal', 'Meal recommendations (goal + mood)', 'in_progress', {
        repo: 'SchaferFamilyCookbook',
      }),
      c('food-rest', 'Restaurant ranking (vibe, health, social)', 'planned'),
      c('food-learn', 'Food preference learning', 'implemented', {
        repo: 'SchaferFamilyCookbook',
      }),
      c('food-order', 'Automated ordering optimization', 'in_progress', {
        repo: 'budget-grocery-list',
      }),
      c('food-nutri', 'Nutrition impact scoring', 'external', {
        tool: 'Nourish',
      }),
    ],
  },
  {
    id: 'cleaning',
    kind: 'domain',
    title: 'Cleaning',
    components: [
      c('clean-usage', 'Usage-based cleaning triggers', 'planned'),
      c('clean-auto', 'Task automation', 'planned'),
      c('clean-visual', 'Visual cleanliness detection (photo-based)', 'planned'),
    ],
  },
  {
    id: 'utilities',
    kind: 'domain',
    title: 'Utilities',
    components: [
      c('util-sub', 'Subscription auditing', 'planned'),
      c('util-bill', 'Bill optimization', 'planned'),
      c('util-usage', 'Usage pattern detection', 'planned'),
      c('util-forecast', 'Cost forecasting', 'planned'),
    ],
  },
  {
    id: 'health-gym',
    kind: 'domain',
    title: 'Health — gym',
    components: [
      c('gym-plan', 'Adaptive workout planning', 'external', {
        tool: 'Fitbod',
      }),
      c('gym-prog', 'Progress tracking + projections', 'external', {
        tool: 'Fitbod',
      }),
    ],
  },
  {
    id: 'health-nutrition',
    kind: 'domain',
    title: 'Health — nutrition',
    components: [
      c('nut-meal', 'Meal scoring (performance-based)', 'planned'),
      c('nut-macro', 'Macro / micro optimization', 'planned'),
      c('nut-water', 'Adaptive hydration tracking', 'external', {
        tool: 'Nourish',
      }),
    ],
  },
  {
    id: 'health-sleep',
    kind: 'domain',
    title: 'Health — sleep',
    components: [
      c('sleep-ready', 'Readiness score', 'external', { tool: 'Apple' }),
      c('sleep-quality', 'Sleep quality analysis', 'external', {
        tool: 'Apple',
      }),
    ],
  },
  {
    id: 'health-medication',
    kind: 'domain',
    title: 'Health — medication',
    components: [c('med-interact', 'Interaction tracking', 'planned')],
  },
  {
    id: 'health-mental',
    kind: 'domain',
    title: 'Health — mental',
    components: [
      c('mh-mood', 'Mood tracking', 'planned'),
      c('mh-trigger', 'Trigger identification', 'planned'),
      c('mh-pattern', 'Pattern detection', 'in_progress', {
        repo: 'spine-scanner',
        notes: 'Vision / posture inference pipeline',
      }),
    ],
  },
  {
    id: 'health-dental',
    kind: 'domain',
    title: 'Health — dental',
    components: [
      c('dent-remind', 'Smart reminders + habit tracking', 'planned'),
    ],
  },
  {
    id: 'ent-books',
    kind: 'domain',
    title: 'Entertainment — books',
    components: [
      c('book-rec', 'Personalized recommendations', 'planned'),
      c('book-track', 'Reading tracking', 'planned'),
    ],
  },
  {
    id: 'ent-music',
    kind: 'domain',
    title: 'Entertainment — music',
    components: [
      c('music-mood', 'Mood-based playlists', 'in_progress', {
        repo: 'pulse-app',
        notes: 'Venue energy ↔ mood',
      }),
      c('music-disc', 'Discovery engine', 'implemented', {
        repo: 'pulse',
        notes: 'Also Pulse-Google-Version',
      }),
    ],
  },
  {
    id: 'ent-screen',
    kind: 'domain',
    title: 'Entertainment — movies / TV',
    components: [
      c('screen-rec', 'Taste-based recommendations', 'planned'),
      c('screen-tonight', '“Tonight” planner', 'implemented', {
        repo: 'LateNightVibesSeattle',
      }),
    ],
  },
  {
    id: 'ent-plays',
    kind: 'domain',
    title: 'Entertainment — plays',
    components: [
      c('plays-local', 'Local + traveling show discovery', 'planned'),
    ],
  },
  {
    id: 'ent-dance',
    kind: 'domain',
    title: 'Entertainment — dancing',
    components: [
      c('dance-venue', 'Venue + event discovery', 'implemented', {
        repo: 'LateNightVibesSeattle',
      }),
    ],
  },
  {
    id: 'ent-collect',
    kind: 'domain',
    title: 'Entertainment — collecting',
    components: [
      c('coll-value', 'Value tracking', 'implemented', {
        repo: 'Holocron-Cards',
        notes: 'Also StarWarsApp',
      }),
      c('coll-alerts', 'Market alerts', 'in_progress', {
        repo: 'star-wars-card-tracker',
      }),
    ],
  },
  {
    id: 'ent-art',
    kind: 'domain',
    title: 'Entertainment — art',
    components: [
      c('art-disc', 'Gallery / museum discovery', 'planned'),
      c('art-taste', 'Taste profiling', 'planned'),
    ],
  },
  {
    id: 'travel',
    kind: 'domain',
    title: 'Travel',
    components: [
      c('tr-gen', 'Trip generation', 'implemented', {
        repo: 'Wanderlog',
      }),
      c('tr-pack', 'Packing optimization', 'in_progress', {
        repo: 'scottsdale-trip',
      }),
      c('tr-itin', 'Itinerary automation', 'in_progress', {
        repo: 'scottsdale-trip',
      }),
    ],
  },
  {
    id: 'finance',
    kind: 'domain',
    title: 'Finance',
    components: [
      c('fin-nw', 'Net worth tracking', 'planned'),
      c('fin-happy', 'Spending → happiness analysis', 'planned'),
      c('fin-inv', 'Investment filtering', 'planned'),
      c('fin-risk', 'Risk profiling', 'planned'),
      c('fin-tax', 'Tax optimization insights', 'planned'),
    ],
  },
  {
    id: 'learn-write',
    kind: 'domain',
    title: 'Learning — writing',
    components: [
      c('lw-style', 'Style analysis', 'planned'),
      c('lw-expand', 'Idea expansion', 'in_progress', {
        repo: 'creative-hub',
      }),
      c('lw-workshop', 'Workshop simulation', 'planned'),
    ],
  },
  {
    id: 'learn-code',
    kind: 'domain',
    title: 'Learning — coding',
    components: [
      c('lc-assist', 'AI-assisted development', 'implemented', {
        notes: 'Shipped portfolio (Vite/TS, agents, APIs)',
      }),
      c('lc-mvp', 'Auto-MVP generation', 'in_progress', {
        repo: 'autoresearch',
        notes: 'Fork: agent research loop',
      }),
      c('lc-debug', 'Debugging agents', 'in_progress', {
        repo: 'SiskelBot',
      }),
    ],
  },
  {
    id: 'learn-general',
    kind: 'domain',
    title: 'Learning — general',
    components: [
      c('lg-curriculum', 'Personalized curriculum', 'in_progress', {
        repo: 'AIKnowledgeBase',
      }),
      c('lg-retention', 'Knowledge retention tracking', 'in_progress', {
        repo: 'AIKnowledgeBase',
      }),
    ],
  },
  {
    id: 'religion',
    kind: 'domain',
    title: 'Religion & spirituality',
    components: [
      c('rel-verse', 'Daily verse + application', 'planned'),
      c('rel-journal', 'Reflection journaling', 'planned'),
      c('rel-compare', 'Comparative religion insights', 'planned'),
      c('rel-habit', 'Spiritual habit tracking', 'planned'),
    ],
  },
  {
    id: 'transport',
    kind: 'domain',
    title: 'Transportation',
    components: [
      c('trans-route', 'Route optimization (mood-based)', 'planned'),
      c('trans-move', 'Movement tracking', 'in_progress', {
        repo: 'StepSprint',
      }),
      c('trans-score', 'Activity scoring', 'planned'),
      c('trans-ride', 'Ride timing optimization', 'planned'),
    ],
  },
  csvProjectsSection,
  {
    id: 'productivity',
    kind: 'addon',
    title: 'Productivity',
    components: [
      c('prod-prio', 'Task prioritization', 'in_progress', {
        repo: 'central-command',
      }),
      c('prod-todo', 'Context-aware to-do lists', 'implemented', {
        repo: '2026GoalTracker',
        locationUrl: 'https://morning-groove-log.lovable.app',
        notes: 'Morning Groove — daily habit / goals surface on Lovable.',
      }),
      c('prod-focus', 'Focus tracking', 'in_progress', {
        repo: 'central-command',
      }),
    ],
  },
  {
    id: 'creativity',
    kind: 'addon',
    title: 'Creativity',
    components: [
      c('cre-ideas', 'Idea generation', 'in_progress', {
        repo: 'giant-schrodinger',
      }),
      c('cre-cross', 'Cross-domain inspiration', 'in_progress', {
        repo: 'v0-games-library',
      }),
      c('cre-out', 'Creative output tracking', 'implemented', {
        repo: 'creative-hub',
      }),
    ],
  },
  {
    id: 'career',
    kind: 'addon',
    title: 'Career',
    components: [
      c('car-gap', 'Skill gap analysis', 'planned'),
      c('car-match', 'Opportunity matching', 'in_progress', {
        repo: 'retail-roadshow-scraper',
        notes: 'Deal / roadshow automation',
      }),
      c('car-resume', 'Resume + portfolio updates', 'implemented', {
        repo: 'little-red-hen',
        notes: 'Public venue / brand site',
      }),
    ],
  },
  {
    id: 'networking',
    kind: 'addon',
    title: 'Networking',
    components: [
      c('net-intel', 'Contact intelligence', 'planned'),
      c('net-follow', 'Follow-up automation', 'implemented', {
        repo: 'retail-roadshow-scraper',
      }),
      c('net-events', 'Event suggestions', 'in_progress', {
        repo: 'pulse-app',
      }),
    ],
  },
  {
    id: 'lifestyle',
    kind: 'addon',
    title: 'Lifestyle design',
    components: [
      c('life-stack', 'Habit stacking', 'in_progress', {
        repo: '2026GoalTracker',
        locationUrl: 'https://morning-groove-log.lovable.app',
        notes: 'Morning Groove for daily check-ins.',
      }),
      c('life-balance', 'Life balance scoring', 'in_progress', {
        repo: '2026GoalTracker',
      }),
      c('life-time', 'Time allocation analysis', 'planned'),
    ],
  },
  {
    id: 'fun',
    kind: 'addon',
    title: 'Fun optimization',
    components: [
      c('fun-score', '“Fun score” tracking', 'in_progress', {
        repo: 'i-am-drunk',
        notes: 'Yearly recap / stats',
      }),
      c('fun-rec', 'Activity recommendations', 'implemented', {
        repo: 'VennWithFriendsDemo',
        notes: 'Also v0-venn-with-friends',
      }),
      c('fun-balance', 'Social vs solo balance', 'in_progress', {
        repo: 'MN-Fun-Squad-Hall-of-Fame',
      }),
    ],
  },
  {
    id: 'future',
    kind: 'future',
    title: 'Future expansion',
    description: 'Longer-horizon OS capabilities.',
    components: [
      c('fu-agents', 'Multi-agent orchestration', 'in_progress', {
        repo: 'SiskelBot',
      }),
      c('fu-auto', 'Fully automated routines', 'in_progress', {
        repo: 'openclaw',
        notes: 'Fork: personal AI assistant stack',
      }),
      c('fu-predict', 'Predictive life planning', 'planned'),
      c('fu-goals', 'AI-assisted goal achievement', 'in_progress', {
        repo: '2026GoalTracker',
      }),
    ],
  },
]

export const integrations: IntegrationDef[] = [
  {
    id: 'int-daily-brief',
    title: 'Daily AI brief',
    description: 'Health, schedule, tasks, social, opportunities.',
    requiredGroupIds: [
      'core-time-decision',
      'productivity',
      'core-social',
      'core-opportunity',
    ],
    requiredOneOfGroups: [
      [
        'health-gym',
        'health-nutrition',
        'health-sleep',
        'health-mental',
        'health-dental',
        'health-medication',
      ],
    ],
  },
  {
    id: 'int-evening',
    title: 'Evening reflection engine',
    description: 'What worked, what didn’t, adjustments.',
    requiredGroupIds: ['core-memory', 'productivity', 'health-mental'],
  },
  {
    id: 'int-weekly',
    title: 'Weekly life report',
    description: 'Trends (health, social, time), insights, suggestions.',
    requiredGroupIds: ['core-time-decision', 'core-social'],
    requiredOneOfGroups: [
      [
        'health-gym',
        'health-nutrition',
        'health-sleep',
        'health-mental',
      ],
    ],
  },
  {
    id: 'int-decision',
    title: 'Decision engine',
    description: 'Inputs: energy, time, mood → ranked actions.',
    requiredGroupIds: ['core-time-decision', 'health-mental'],
    requiredOneOfGroups: [['health-sleep', 'health-nutrition']],
  },
]

export const groupsById = new Map(sectionGroups.map((g) => [g.id, g]))

export function allComponentIds(): string[] {
  return sectionGroups.flatMap((g) => g.components.map((c) => c.id))
}
