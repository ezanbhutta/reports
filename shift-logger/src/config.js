// ════════════════════════════════════════════════════════════════
// CSR Shift Logger — configuration (drives the whole UI)
// ════════════════════════════════════════════════════════════════

// Brand theme (HaseebMadeIt violet · light)
// HaseebMadeIt brand tokens — aligned with the CSR Pulse design system.
// Neutrals + a couple of accents resolve from CSS variables so the CSR app can
// flip to a dark "night-shift" theme via a .night class (see index.css).
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
  'Abdul Haseeb', 'Tariq Mahmood', 'Eikon Designs', 'Alee Studioz', 'Carpicon',
  'Dygram Designs', 'Storm Design', 'WeDesignz', 'Grid Designs', 'X Studioz',
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
  { id: 'zubair',  name: 'Zubair',  shift: 'Night', profile: '', role: 'Manager', active: true },
  { id: 'ezan',    name: 'Ezan',    shift: 'Night', profile: '', role: 'Manager', active: true },
];

// What can be shared to a client in chat (multi-select on the "Shared to client" action)
export const SHARE_ELEMENTS = [
  'Initial draft', 'Revision', 'Final files', 'Brand guidelines',
  'Social media kit', 'Stationery', 'Animation', 'Other',
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
    fields: [ { name: 'client', label: 'Name', type: 'text', required: true } ] },

  { key: 'new_order', label: 'New order', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'service', label: 'Service', type: 'text', required: true },
              { name: 'value', label: 'Price', type: 'text' } ] },
  { key: 'order_assigned', label: 'Order given to designer', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'text', required: true } ] },
  { key: 'project_assigned', label: 'Project given to designer', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text', required: true },
              { name: 'due', label: 'Due date', type: 'date' } ] },
  { key: 'order_completed', label: 'Order completed', group: 'orders',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'value', label: 'Price', type: 'text' } ] },

  { key: 'revision_assigned', label: 'Revision given to designer', group: 'revisions',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'text', required: true } ] },
  { key: 'revision_done', label: 'Revision done (by designer)', group: 'revisions',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text' } ] },

  // Project delivered = the formal deliverable — initial draft / final files only.
  { key: 'project_delivered', label: 'Project delivered', group: 'deliveries',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'stage', label: 'What was delivered', type: 'segment', options: ['Initial draft', 'Final files'], required: true } ] },
  // Shared in chat = anything sent in chat (multi-select, any elements).
  { key: 'shared', label: 'Shared to client (chat)', group: 'deliveries',
    fields: [ { name: 'client', label: 'Client / username', type: 'text', required: true },
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'elements', label: 'What did you share? (pick any)', type: 'multiselect', options: SHARE_ELEMENTS, required: true } ] },

  { key: 'followup_client', label: 'Follow-up with client', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true } ] },
  { key: 'followup_designer', label: 'Follow-up with designer', group: 'followups',
    fields: [ { name: 'project', label: 'Project / client', type: 'text', required: true },
              { name: 'designer', label: 'Designer', type: 'text', required: true },
              { name: 'note', label: 'Note', type: 'text' } ] },
  { key: 'upsell', label: 'Upsell', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'what', label: 'What was upsold', type: 'text', required: true },
              { name: 'kind', label: 'Client', type: 'segment', options: ['New', 'Old'], required: true },
              { name: 'value', label: 'Price', type: 'text' } ] },
  { key: 'offer', label: 'Offer / coupon', group: 'followups',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'scope', label: 'Scope of work', type: 'text', required: true },
              { name: 'value', label: 'Offer value', type: 'text', required: true },
              { name: 'coupon', label: 'Coupon', type: 'text' } ] },

  { key: 'meeting', label: 'Meeting', group: 'meetings',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'kind', label: 'Type', type: 'segment', options: ['New', 'Old client'], required: true },
              { name: 'agenda', label: 'What it was about (agenda)', type: 'text', required: true } ] },

  { key: 'frustrated', label: 'Frustrated client', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'what', label: 'What happened', type: 'text', required: true } ] },
  { key: 'disputed', label: 'Disputed client', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'reason', label: 'Reason', type: 'text', required: true },
              { name: 'order', label: 'Order (if any)', type: 'text' } ] },
  { key: 'extension', label: 'Extension sent', group: 'problems',
    fields: [ { name: 'client', label: 'Client', type: 'text', required: true },
              { name: 'reason', label: 'Reason', type: 'text' } ] },
  { key: 'spam', label: 'Spam / not relevant', group: 'problems',
    fields: [ { name: 'client', label: 'Username', type: 'text', required: true } ] },
];

export const ACTION_BY_KEY = Object.fromEntries(ACTIONS.map(a => [a.key, a]));

// End-of-shift checklist
export const CHECKLIST = [
  'CRM updated', 'ClickUp cleared', 'Portfolio updated', 'Analytics checked', 'Checked orders one by one',
];

// Short labels for KPI tiles / summaries
export const KPI_LABEL = {
  inquiry: 'Inquiries', lead_followup: 'Lead F/U', new_order: 'New orders',
  order_assigned: 'Orders assigned', project_assigned: 'Projects assigned', order_completed: 'Completed',
  revision_assigned: 'Rev. assigned', revision_done: 'Rev. done', project_delivered: 'Delivered', shared: 'Shared',
  followup_client: 'Follow-ups', followup_designer: 'Designer F/U', upsell: 'Upsells', offer: 'Offers',
  meeting: 'Meetings', frustrated: 'Frustrated', disputed: 'Disputed', extension: 'Extensions', spam: 'Spam',
};

// CEO console password (change this; it's a light gate, not hard security).
// Override at build time with VITE_CEO_PASSWORD.
export const CEO_PASSWORD = import.meta.env.VITE_CEO_PASSWORD || 'haseeb-ceo';
