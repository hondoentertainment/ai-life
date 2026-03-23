import type { ComponentItem, IntegrationDef, SectionGroup } from '../types/lifeSystem'

const c = (
  id: string,
  label: string,
  defaultStatus: ComponentItem['defaultStatus'],
  extra?: Partial<Pick<ComponentItem, 'notes' | 'tool'>>,
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
      c('td-cal', 'Calendar intelligence (auto-prioritized days)', 'implemented'),
      c('td-energy', 'Energy-based scheduling', 'can_do'),
      c('td-daily', 'Daily decision engine (“What should I do?”)', 'planned'),
      c('td-weekly', 'Weekly optimization reports', 'planned'),
      c('td-focus', 'Focus block generation', 'in_progress', {
        notes: 'On calendar',
      }),
    ],
  },
  {
    id: 'core-social',
    kind: 'layer',
    title: 'Social & relationships',
    components: [
      c('soc-track', 'Social tracking (who / frequency)', 'planned'),
      c('soc-health', 'Relationship health scoring', 'planned'),
      c('soc-outreach', 'Smart outreach suggestions', 'planned'),
      c('soc-party', 'Party planning + guest optimization', 'planned'),
      c('soc-dating', 'Dating insights + pattern detection', 'planned'),
    ],
  },
  {
    id: 'core-brand',
    kind: 'layer',
    title: 'Personal brand',
    components: [
      c('brand-voice', 'Voice / tone modeling', 'planned'),
      c('brand-content', 'Content generation (posts, essays)', 'planned'),
      c('brand-pipeline', 'Idea capture → publish pipeline', 'planned'),
      c('brand-perf', 'Performance tracking (what resonates)', 'planned'),
    ],
  },
  {
    id: 'core-memory',
    kind: 'layer',
    title: 'Memory & life logging',
    components: [
      c('mem-daily', 'Daily activity logging', 'planned'),
      c('mem-enjoy', 'Enjoyment tracking', 'planned'),
      c('mem-highlights', 'Life highlights generation', 'planned'),
      c('mem-graph', 'Personal knowledge graph', 'planned'),
    ],
  },
  {
    id: 'core-opportunity',
    kind: 'layer',
    title: 'Opportunity detection',
    components: [
      c('opp-events', 'Event discovery (sports, concerts, networking)', 'planned'),
      c('opp-invest', 'Investment alerts', 'planned'),
      c('opp-social', 'Social opportunity detection', 'planned'),
      c('opp-tonight', '“You should do this tonight” engine', 'planned'),
    ],
  },
  {
    id: 'home',
    kind: 'domain',
    title: 'Home',
    components: [
      c('home-grocery', 'Smart grocery prediction', 'planned'),
      c('home-inv', 'Inventory tracking (fridge / pantry)', 'planned'),
      c('home-clean', 'Cleaning automation triggers', 'planned'),
      c('home-devices', 'Smart device orchestration', 'planned'),
    ],
  },
  {
    id: 'food',
    kind: 'domain',
    title: 'Food',
    components: [
      c('food-meal', 'Meal recommendations (goal + mood)', 'planned'),
      c('food-rest', 'Restaurant ranking (vibe, health, social)', 'planned'),
      c('food-learn', 'Food preference learning', 'planned'),
      c('food-order', 'Automated ordering optimization', 'planned'),
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
      c('mh-pattern', 'Pattern detection', 'planned'),
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
      c('music-mood', 'Mood-based playlists', 'planned'),
      c('music-disc', 'Discovery engine', 'planned'),
    ],
  },
  {
    id: 'ent-screen',
    kind: 'domain',
    title: 'Entertainment — movies / TV',
    components: [
      c('screen-rec', 'Taste-based recommendations', 'planned'),
      c('screen-tonight', '“Tonight” planner', 'planned'),
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
    components: [c('dance-venue', 'Venue + event discovery', 'planned')],
  },
  {
    id: 'ent-collect',
    kind: 'domain',
    title: 'Entertainment — collecting',
    components: [
      c('coll-value', 'Value tracking', 'planned'),
      c('coll-alerts', 'Market alerts', 'planned'),
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
      c('tr-gen', 'Trip generation', 'planned'),
      c('tr-pack', 'Packing optimization', 'planned'),
      c('tr-itin', 'Itinerary automation', 'planned'),
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
      c('lw-expand', 'Idea expansion', 'planned'),
      c('lw-workshop', 'Workshop simulation', 'planned'),
    ],
  },
  {
    id: 'learn-code',
    kind: 'domain',
    title: 'Learning — coding',
    components: [
      c('lc-assist', 'AI-assisted development', 'can_do'),
      c('lc-mvp', 'Auto-MVP generation', 'planned'),
      c('lc-debug', 'Debugging agents', 'planned'),
    ],
  },
  {
    id: 'learn-general',
    kind: 'domain',
    title: 'Learning — general',
    components: [
      c('lg-curriculum', 'Personalized curriculum', 'planned'),
      c('lg-retention', 'Knowledge retention tracking', 'planned'),
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
      c('trans-move', 'Movement tracking', 'planned'),
      c('trans-score', 'Activity scoring', 'planned'),
      c('trans-ride', 'Ride timing optimization', 'planned'),
    ],
  },
  {
    id: 'productivity',
    kind: 'addon',
    title: 'Productivity',
    components: [
      c('prod-prio', 'Task prioritization', 'planned'),
      c('prod-todo', 'Context-aware to-do lists', 'planned'),
      c('prod-focus', 'Focus tracking', 'planned'),
    ],
  },
  {
    id: 'creativity',
    kind: 'addon',
    title: 'Creativity',
    components: [
      c('cre-ideas', 'Idea generation', 'planned'),
      c('cre-cross', 'Cross-domain inspiration', 'planned'),
      c('cre-out', 'Creative output tracking', 'planned'),
    ],
  },
  {
    id: 'career',
    kind: 'addon',
    title: 'Career',
    components: [
      c('car-gap', 'Skill gap analysis', 'planned'),
      c('car-match', 'Opportunity matching', 'planned'),
      c('car-resume', 'Resume + portfolio updates', 'planned'),
    ],
  },
  {
    id: 'networking',
    kind: 'addon',
    title: 'Networking',
    components: [
      c('net-intel', 'Contact intelligence', 'planned'),
      c('net-follow', 'Follow-up automation', 'planned'),
      c('net-events', 'Event suggestions', 'planned'),
    ],
  },
  {
    id: 'lifestyle',
    kind: 'addon',
    title: 'Lifestyle design',
    components: [
      c('life-stack', 'Habit stacking', 'planned'),
      c('life-balance', 'Life balance scoring', 'planned'),
      c('life-time', 'Time allocation analysis', 'planned'),
    ],
  },
  {
    id: 'fun',
    kind: 'addon',
    title: 'Fun optimization',
    components: [
      c('fun-score', '“Fun score” tracking', 'planned'),
      c('fun-rec', 'Activity recommendations', 'planned'),
      c('fun-balance', 'Social vs solo balance', 'planned'),
    ],
  },
  {
    id: 'future',
    kind: 'future',
    title: 'Future expansion',
    description: 'Longer-horizon OS capabilities.',
    components: [
      c('fu-agents', 'Multi-agent orchestration', 'planned'),
      c('fu-auto', 'Fully automated routines', 'planned'),
      c('fu-predict', 'Predictive life planning', 'planned'),
      c('fu-goals', 'AI-assisted goal achievement', 'planned'),
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
