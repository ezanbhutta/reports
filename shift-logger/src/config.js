// ════════════════════════════════════════════════════════════════
// CSR Shift Logger — configuration (drives the whole UI)
// ════════════════════════════════════════════════════════════════

// Brand theme (HaseebMadeIt violet · light)
// HaseebMadeIt brand tokens — aligned with the CSR Pulse design system.
// Neutrals resolve from CSS variables defined in index.css (:root).
export const C = {
  bg: 'var(--bg)', raised: 'var(--raised)', card: 'var(--card)', ink: 'var(--ink)',
  muted: 'var(--muted)', dim: 'var(--dim)', border: 'var(--border)', line: 'var(--line)',
  surface: 'var(--surface)', surfaceLine: 'var(--surface-line)', violetDim: 'var(--violet-dim)',
  violet: '#7229FF', glow: '#9F66FF', violetBg: '#F1EBFF', violetLine: '#E2D6FF',
  mint: '#10B981', mintBg: '#E7F8F1', amber: '#F59E0B', amberBg: '#FEF4DE',
  coral: '#EF4444', coralBg: '#FDE9E9', cyan: '#0EA5E9', cyanBg: '#E5F4FE', ink2: '#0E1330',
};

// Shifts — Pakistan time
export const SHIFTS = [
  { key: 'Morning', label: 'Morning', time: '9am–5pm' },
  { key: 'Evening', label: 'Evening', time: '5pm–1am' },
  { key: 'Night',   label: 'Night',   time: '1am–9am' },
];

export const PROFILES = [
  'Abdul Haseeb', 'Brand Identity Co', 'Eikon Designs', 'Alee Studioz', 'Carpicon',
  'Dygram Designs', 'WeDesignz', 'Grid Designs', 'X Studioz',
];

// Default roster (editable in-app by managers). profile optional — picked at login.
export const DEFAULT_ROSTER = [
  { id: 'tanzeel', name: 'Tanzeel', shift: 'Morning', profile: '', role: 'CSR', active: true },
  { id: 'iqra',    name: 'Iqra',    shift: 'Morning', profile: '', role: 'CSR', active: true },
  { id: 'hassan',  name: 'Hassan',  shift: 'Morning', profile: '', role: 'CSR', active: true },
  { id: 'amrah',   name: 'Amrah',   shift: 'Morning', profile: '', role: 'CSR', active: true },
  { id: 'tayyab',  name: 'Tayyab',  shift: 'Evening', profile: '', role: 'CSR', active: true },
  { id: 'hasnain', name: 'Hasnain Gillani', shift: 'Evening', profile: '', role: 'CSR', active: true },
  { id: 'alishakeel', name: 'Ali Shakeel', shift: 'Evening', profile: '', role: 'CSR', active: true },
  { id: 'basit',   name: 'Abdul Basit', shift: 'Evening', profile: '', role: 'CSR', active: true },
  { id: 'hadi',    name: 'Hadi',    shift: 'Evening', profile: '', role: 'CSR', active: true },
  { id: 'salman',  name: 'Salman',  shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'swaid',   name: 'Swaid',   shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'samama',  name: 'Samama',  shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'ahmad',   name: 'Ahmad',   shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'nadir',   name: 'Nadir',   shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'zubair',  name: 'Zubair',  shift: 'Night', profile: '', role: 'CSR', active: true },
  { id: 'ezan',    name: 'Ezan',    shift: 'Night', profile: '', role: 'CSR', active: true },
  // ── Design Team (role = specialty; anything that isn't CSR/Manager is a designer) ──
  { id: 'd-owais-nadeem',  name: 'Owais Nadeem',     shift: '', profile: '', role: 'Branding', active: true },
  { id: 'd-khubaib',       name: 'Khubaib',          shift: '', profile: '', role: 'Branding', active: true },
  { id: 'd-hamid',         name: 'Hamid',            shift: '', profile: '', role: 'Branding', active: true },
  { id: 'd-owais-rehan',   name: 'Owais Rehan',      shift: '', profile: '', role: 'Branding', active: true },
  { id: 'd-afjal-hussain', name: 'Afjal Hussain',    shift: '', profile: '', role: 'Branding', active: true },
  { id: 'd-amin-ullah',    name: 'Amin Ullah',       shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-rejaul-karim',  name: 'Rejaul Karim',     shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-abiha-imran',   name: 'Abiha Imran',      shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-nimeazad',      name: 'Nimeazad',         shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-m-tariq',       name: 'M. Tariq',         shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-md-dulal',      name: 'Md Dulal',         shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-md-rashadul',   name: 'Md Rashadul Haque', shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-md-zahid',      name: 'Md Zahid Hasan',   shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-md-rezaul',     name: 'Md Rezaul',        shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-atta-razaq',    name: 'Atta Razaq',       shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-shaoor-haider', name: 'Shaoor Haider',    shift: '', profile: '', role: 'Logo', active: true },
  { id: 'd-syed-mubahat',  name: 'Syed Mubahat',     shift: '', profile: '', role: 'Animation', active: true },
  { id: 'd-aqeel',         name: 'Aqeel',            shift: '', profile: '', role: 'PPT Designer', active: true },
  { id: 'd-shahmeer',      name: 'Shahmeer',         shift: '', profile: '', role: 'Canva Designer', active: true },
];

// A roster entry is a designer when its role isn't a CSR/Manager role.
export const isDesigner = r => !!r && r.role !== 'CSR' && r.role !== 'Manager';

// Services we offer (dropdown on the "New order" action)
export const SERVICES = [
  'Logo Design', 'Social Media Kit', 'Stationery Design Kit', 'Brand Guideline',
  'Logo Animation', 'PowerPoint Deck', 'Packaging', 'Website Design',
  'Post Design', 'Marketing Materials', 'Canva', 'Other',
];

// What can be shared to a client in chat (multi-select on the "Shared to client" action)
export const SHARE_ELEMENTS = [
  'Initial draft', 'Revision', 'Final files', 'Brand guidelines',
  'Social media kit', 'Stationery', 'Animation', 'PowerPoint', 'Website contents', 'Other',
];

// Action groups (order + colour)
export const GROUPS = [
  { key: 'inquiries',  label: 'Inquiries',            color: '#7229FF' },
  { key: 'orders',     label: 'Orders & projects',    color: '#9F66FF' },
  { key: 'revisions',  label: 'Revisions',            color: '#6D5BD6' },
  { key: 'deliveries', label: 'Sharing & deliveries', color: '#0EA5E9' },
  { key: 'followups',  label: 'Follow-ups & sales',   color: '#F59E0B' },
  { key: 'meetings',   label: 'Meetings',             color: '#10B981' },
  { key: 'problems',   label: 'Problems & other',     color: '#EF4444' },
];

// Field types: text | select | segment | multiselect | date
// The action catalog — each entry is one "+" button and drives its pop-up form.
export const ACTIONS = [
  { key: 'inquiry', label: 'New inquiry', group: 'inquiries',
    fields: [ { name: 'client', label: 'Username', type: 'text', required: true },
              { name: 'agenda', label: 'What they want', type: 'text' } ] },
  { key: 'lead_followup', label: 'Lead follow-up', group: 'inquiries',
    fields: [ { name: 'client', label: 'Name', type: 'text', required: true },
              { name: 'attempt', label: 'Which follow-up?', type: 'segment', options: ['1st', '2nd', '3rd', '4th+'], required: true } ] },
  { key: 'client_conversation', label: 'Client conversation', group: 'inquiries',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'kind', label: 'New or existing client', type: 'segment', options: ['New', 'Existing'], required: true },
              { name: 'note', label: 'What was discussed / how you guided them', type: 'text' } ] },

  { key: 'new_order', label: 'New order', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' },
              { name: 'service', label: 'Service', type: 'select', options: SERVICES },
              { name: 'service_other', label: 'Other — please specify', type: 'text', required: true, showIf: v => v.service === 'Other' },
              { name: 'value', label: 'Price', type: 'text' } ] },
  { key: 'order_assigned', label: 'Order Assigned to Designer', group: 'orders',
    fields: [ { name: 'client', label: 'Project name', type: 'text', required: true },
              { name: 'order_type', label: 'Order type', type: 'segment', options: ['Organic', 'Inorganic'], required: true },
              { name: 'designer', label: 'Designer', type: 'designer', required: true },
              { name: 'due', label: 'Due date', type: 'date' } ] },
  { key: 'files_assigned', label: 'Files Assigned to Designer', group: 'orders',
    fields: [ { name: 'project', label: 'Project name', type: 'text', required: true },
              { name: 'client', label: 'Client name', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'designer', required: true } ] },
  { key: 'order_completed', label: 'Order completed', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text', required: true },
              { name: 'completion', label: 'How was it completed?', type: 'segment', options: ['Auto-completed', 'By client'] },
              { name: 'completed_on', label: 'Completion date', type: 'date' },
              { name: 'value', label: 'Price', type: 'text' } ] },

  { key: 'revision_assigned', label: 'Revision assigned to designer', group: 'revisions',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' },
              { name: 'designer', label: 'Designer', type: 'designer', required: true } ] },

  // Project delivered = the formal deliverable — initial draft / final files only.
  { key: 'project_delivered', label: 'Project delivered', group: 'deliveries',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'stage', label: 'What was delivered', type: 'segment', options: ['Initial draft', 'Final files'], required: true } ] },
  // Shared in chat = anything sent in chat (multi-select, any elements).
  { key: 'shared', label: 'Shared to client (chat)', group: 'deliveries',
    fields: [ { name: 'client', label: 'Client / username', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'elements', label: 'What did you share? (pick any)', type: 'multiselect', options: SHARE_ELEMENTS, required: true },
              { name: 'other_text', label: 'Other — please specify', type: 'text', required: true, showIf: v => Array.isArray(v.elements) && v.elements.includes('Other') } ] },

  { key: 'followup_client', label: 'Follow-up with client', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'kind', label: 'Client type', type: 'segment', options: ['Ongoing order', 'Past client'], required: true },
              { name: 'project', label: 'Project name', type: 'text' },
              { name: 'reason', label: 'Reason to follow up', type: 'text' },
              { name: 'attempt', label: 'Which follow-up?', type: 'segment', options: ['1st', '2nd', '3rd', '4th+'] } ] },
  { key: 'followup_designer', label: 'Follow-up with designer', group: 'followups',
    fields: [ { name: 'project', label: 'Project name', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'designer', required: true },
              { name: 'note', label: 'Note', type: 'text' } ] },
  { key: 'update_followup', label: 'Update Followup', group: 'followups',
    fields: [ { name: 'project', label: 'Project Name', type: 'text' },
              { name: 'client', label: 'Client Name', type: 'text', required: true },
              { name: 'update_type', label: 'Update type', type: 'segment', options: ['Initial Update', 'Files Update'], required: true } ] },
  { key: 'upsell', label: 'Upsell', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'what', label: 'What was upsold', type: 'text', required: true },
              { name: 'kind', label: 'Client', type: 'segment', options: ['New', 'Old'], required: true },
              { name: 'value', label: 'Price', type: 'text' } ] },
  { key: 'offer', label: 'Offer', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'kind', label: 'New or existing client', type: 'segment', options: ['New', 'Existing'] },
              { name: 'scope', label: 'Scope of work', type: 'text' },
              { name: 'value', label: 'Offer value', type: 'text', required: true } ] },
  { key: 'review_request', label: 'Review request', group: 'followups',
    fields: [ { name: 'client', label: 'Client name', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' },
              { name: 'review_type', label: 'Review type', type: 'segment', options: ['Public review', 'Private review'], required: true } ] },
  // The review a client actually left — three star scores; the average is auto-computed (0.0).
  { key: 'review_received', label: 'Review received', group: 'followups',
    fields: [ { name: 'client', label: 'Client name', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' },
              { name: 'value_rating', label: 'Value of Delivery', type: 'stars', required: true },
              { name: 'quality_rating', label: 'Quality of Delivery', type: 'stars', required: true },
              { name: 'communication_rating', label: 'Seller Communication Level', type: 'stars', required: true } ] },

  { key: 'meeting', label: 'Meeting', group: 'meetings',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'kind', label: 'Type', type: 'segment', options: ['New', 'Old client'], required: true },
              { name: 'agenda', label: 'What it was about (agenda)', type: 'text', required: true } ] },

  { key: 'frustrated', label: 'Frustrated client', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'what', label: 'What happened', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' } ] },
  { key: 'disputed', label: 'Disputed client', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'reason', label: 'Reason', type: 'text', required: true },
              { name: 'project', label: 'Project name', type: 'text' } ] },
  { key: 'extension', label: 'Extension sent', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'reason', label: 'Reason', type: 'text' } ] },
  { key: 'spam', label: 'Spam / not relevant', group: 'problems',
    fields: [ { name: 'client', label: 'Username', type: 'text', required: true },
              { name: 'reason', label: 'Reason', type: 'text' } ] },
];

export const ACTION_BY_KEY = Object.fromEntries(ACTIONS.map(a => [a.key, a]));

// ── Reminder system ──────────────────────────────────────────────
// Owner-defined rules. Each rule: logging that activity books a reminder for
// the SAME PROFILE delayMinutes later — it pops on whoever covers the profile
// then (any shift, any person) and stays until resolved. Snooze (5 min) is
// always available. Per rule:
//   when     — optional condition on the logged entry; the reminder is only
//              booked when it returns true (re-checked if the entry is edited).
//   cancelOn — if THAT activity is logged for the same client + profile before
//              the reminder is resolved, the reminder clears itself (not needed).
//   buttons  — the resolve buttons, in order. kind 'resolve' closes the
//              reminder outright; kind 'form' opens that activity's form
//              prefilled with the reminder's client/project and closes the
//              reminder once the entry is saved.
export const REMINDER_SNOOZE_MINUTES = 5;
// Launch floor: no rule-booked reminder falls due before this moment (PKT) — one
// booked earlier is floored to it, so the system's first pop-ups start exactly
// then. Once this time has passed, the floor is inert (pure rule delays apply).
export const REMINDERS_START_AT = '2026-07-21T10:00:00+05:00';
export const REMINDERS = {
  // New inquiry → 25 min later, send the prospect their 1st follow-up.
  inquiry: {
    title: r => `Send the 1st follow-up to ${r.client || 'the client'}`,
    delayMinutes: 25,
    buttons: [
      { key: 'in_discussion', label: 'In discussion', kind: 'resolve', variant: 'subtle' },
      { key: 'followed_up',   label: 'Followed up',   kind: 'resolve', variant: 'solid' },
      { key: 'order_taken',   label: 'Order taken',   kind: 'resolve', variant: 'ok' },
    ],
  },
  // Order completed → 30 min later, ask the client for a Public Review.
  // Auto-clears if a "Review received" for the same client + profile lands first.
  order_completed: {
    title: 'Ask the client for a Public Review',
    delayMinutes: 30,
    cancelOn: 'review_received',
    buttons: [
      { key: 'no_need',      label: 'No need',      kind: 'resolve', variant: 'subtle' },
      { key: 'msg_sent',     label: 'Msg sent',     kind: 'resolve', variant: 'solid' },
      { key: 'review_given', label: 'Review given', kind: 'form', form: 'review_received', variant: 'ok' },
    ],
  },
  // Public review received with a 4.7–5.0 average → exactly 24h later, ask that
  // client for a Private Review. Only for top ratings (checked on the stored,
  // displayed 0.0 average — what the CSR and CEO see).
  review_received: {
    title: 'Ask the client for a Private Review',
    delayMinutes: 24 * 60,
    when: a => { const r = Number(a.details && a.details.rating); return r >= 4.7 && r <= 5; },
    buttons: [
      { key: 'msg_sent', label: 'Msg sent', kind: 'resolve', variant: 'ok' },
    ],
  },
  // Final files assigned to the designer → an immediate nudge to upsell that
  // client (the CSR knows what to offer).
  files_assigned: {
    title: r => `Suggest an upsell to ${r.client || 'the client'}`,
    delayMinutes: 0,
    buttons: [
      { key: 'no_need',     label: 'No need',     kind: 'resolve', variant: 'subtle' },
      { key: 'upsell_done', label: 'Upsell done', kind: 'resolve', variant: 'ok' },
    ],
  },
  // A deliverable went out (formal delivery) → 15h later, follow up on that
  // specific item with that client. Title is built from the reminder itself
  // (the item lives in its note, captured at booking).
  project_delivered: {
    title: r => `Follow up on the ${(r.note || 'delivery').toLowerCase()} delivered to ${r.client || 'the client'}`,
    delayMinutes: 15 * 60,
    buttons: [
      { key: 'responded',   label: 'Responded',   kind: 'resolve', variant: 'subtle' },
      { key: 'followed_up', label: 'Followed up', kind: 'resolve', variant: 'ok' },
    ],
  },
  // Anything shared in chat → same 15h follow-up on the shared items.
  shared: {
    title: r => `Follow up on the ${r.note ? r.note.toLowerCase() : 'items'} shared with ${r.client || 'the client'}`,
    delayMinutes: 15 * 60,
    buttons: [
      { key: 'responded',   label: 'Responded',   kind: 'resolve', variant: 'subtle' },
      { key: 'followed_up', label: 'Followed up', kind: 'resolve', variant: 'ok' },
    ],
  },
};

// End-of-shift checklist
export const CHECKLIST = [
  'CRM updated', 'ClickUp cleared', 'Portfolio updated', 'Briefs Created', 'Analytics checked', 'Checked orders one by one',
];

// Short labels for KPI tiles / summaries
export const KPI_LABEL = {
  inquiry: 'Inquiries', lead_followup: 'Lead F/U', client_conversation: 'Conversations', new_order: 'New orders',
  order_assigned: 'Orders assigned', files_assigned: 'Files assigned', order_completed: 'Completed',
  revision_assigned: 'Rev. assigned', project_delivered: 'Delivered', shared: 'Shared',
  followup_client: 'Follow-ups', followup_designer: 'Designer F/U', update_followup: 'Update F/U', upsell: 'Upsells', offer: 'Offers',
  review_request: 'Reviews', review_received: 'Reviews received',
  meeting: 'Meetings', frustrated: 'Frustrated', disputed: 'Disputed', extension: 'Extensions', spam: 'Spam',
};

// Mistakes log (manager records, CEO reviews) — categories + severity scale
export const MISTAKE_CATEGORIES = [
  'Missed follow-up', 'Wrong info to client', 'Late delivery', 'CRM / ClickUp not updated',
  'Tone / communication', 'Process skipped', 'Wrong assignment', 'Order not assigned', 'Revision Assigned', 'Revision Shared', 'Other',
];
export const MISTAKE_SEVERITIES = ['Low', 'Medium', 'High'];

// ── CEO console access ───────────────────────────────────────────────────────
// Managers sign in with Supabase Auth (email + password) — see store.js (db.signIn).
// No password or hash is shipped in the client bundle. In local/demo mode (no
// Supabase configured), the console accepts the demo password "admin".
