// All shared constants — replaces hardcoded data spread across JSX files

export const HOUSES = [
  { id: 'oak',    name: 'Oak House',   short: 'OAK', color: '#d4a64a', addr: '142 Oak Lane',    branch: 'North', manager: 'Aisha M.', residents: 4 },
  { id: 'willow', name: 'Willow Run',  short: 'WLW', color: '#2f9489', addr: '318 Willow Ct',   branch: 'North', manager: 'Devon P.', residents: 4 },
  { id: 'maple',  name: 'Maple Run',   short: 'MPL', color: '#cf4f3b', addr: '27 Maple Street',  branch: 'South', manager: 'Saira K.', residents: 5 },
  { id: 'cedar',  name: 'Cedar Ridge', short: 'CDR', color: '#6e4d8f', addr: '904 Cedar Road',   branch: 'South', manager: 'Tomas R.', residents: 5 },
];

// Demo "Preview as" personas. Subtitles + houseSlug align to the seeded houses
// (Maple / Oak / Birch — see demoStore). The DSP persona (Aisha) is seeded at
// Maple, so manager + DSP are scoped there; supervisor spans every house.
// Names match the seeded Maple staff roster (see demoStore) so a previewed
// manager/DSP maps to their own seeded shifts — "your shifts" highlight in the
// schedule + My Day, and a DSP can give up a shift that's actually theirs.
export const ROLES = [
  { id: 'supervisor', name: 'Lina R.',       initial: 'L', color: 'var(--a-clay)', role: 'Supervisor' },
  { id: 'manager',    name: 'Priya Nair',    initial: 'P', color: '#2f9489',       role: 'House Mgr · Maple', houseSlug: 'maple-house' },
  { id: 'staff',      name: 'Aisha Mendez',  initial: 'A', color: 'var(--a-sage)', role: 'DSP · Maple',       houseSlug: 'maple-house' },
];

export const STAFF_LIST = [
  { name: 'Aisha Mendez',  role: 'DSP · Lead',  house: 'oak',    score: 96, sub: '2.1 yrs · On track for promo',  highlight: 'promo',   tenure: '2.1 yrs', notes: 'Flagged for Lead promotion. Score above 92 for 24 days.' },
  { name: 'Jay Brooks',    role: 'DSP',          house: 'oak',    score: 88, sub: '2.0 yrs · MAR perfect 90d',                          tenure: '2.0 yrs', notes: 'MAR compliance perfect last 90 days. Reliable 7a–3p.' },
  { name: 'Devon Park',    role: 'House mgr',    house: 'willow', score: 94, sub: '3.4 yrs · Family ★ 5.0',                             tenure: '3.4 yrs', notes: 'Family satisfaction rating 5.0. No incidents this quarter.' },
  { name: 'Saira Khan',    role: 'House mgr',    house: 'maple',  score: 89, sub: '1.2 yrs',                                            tenure: '1.2 yrs', notes: 'Consistent performance. Completed all trainings.' },
  { name: 'Marcus Lewis',  role: 'DSP',          house: 'maple',  score: 64, sub: '0.5 yrs · 4 late in 2wk',      highlight: 'concern', tenure: '0.5 yrs', notes: '4 late arrivals in past 2 weeks. Last note: tardy w/o notice.' },
  { name: 'Carmen Vela',   role: 'DSP',          house: 'oak',    score: 82, sub: '6 mo · Orientation 80%',        highlight: 'orient',  tenure: '6 mo',   notes: 'In orientation — 80% complete. Week 2 tasks pending.' },
  { name: 'Priya Nair',    role: 'DSP',          house: 'cedar',  score: 91, sub: '1.8 yrs',                                            tenure: '1.8 yrs', notes: 'Consistent lead on Cedar weekend shifts.' },
  { name: 'Reni Tate',     role: 'DSP',          house: 'maple',  score: 87, sub: '1.5 yrs',                                            tenure: '1.5 yrs', notes: 'Reliable on mid-day shift. Good resident rapport.' },
  { name: 'Tomas Reed',    role: 'House mgr',    house: 'cedar',  score: 93, sub: '4.0 yrs',                                            tenure: '4.0 yrs', notes: 'Longest-tenured manager. No open incidents.' },
];

export const CHAT_DATA = {
  oak:    { name: 'Oak House',    members: '5 members', color: '#d4a64a', short: 'OAK', messages: [
    { from: 'Aisha M.',  time: '8:14a', text: 'Morning all — Devon just confirmed the 10am dentist run for Marcus J.' },
    { from: 'Jay B.',    time: '8:22a', text: "Thanks! I'll have the van warmed up." },
    { from: 'You',       time: '9:01a', text: 'Great. Aisha, can you confirm MAR is done for morning meds before the run?' },
    { from: 'Aisha M.',  time: '9:03a', text: 'Done ✓ All 4 residents signed off.' },
  ]},
  willow: { name: 'Willow Run',   members: '4 members', color: '#2f9489', short: 'WLW', messages: [
    { from: 'Devon P.',  time: '7:55a', text: 'Paper towels are completely out. Putting in a request now.' },
    { from: 'You',       time: '8:10a', text: 'Noted — checked with Oak, they have surplus. Cross-house swap set up.' },
    { from: 'Devon P.',  time: '8:12a', text: 'Perfect, thanks!' },
  ]},
  maple:  { name: 'Maple Run',    members: '6 members', color: '#cf4f3b', short: 'MPL', messages: [
    { from: 'Saira K.',  time: '7:30a', text: 'Marcus is 12 min late, no call. Covering his tasks for now.' },
    { from: 'You',       time: '7:35a', text: 'Thanks for the heads up. I\'ll note it.' },
    { from: 'Marcus L.', time: '7:49a', text: 'Sorry — bus was delayed. Here now.' },
    { from: 'Saira K.',  time: '7:51a', text: 'OK. Please check in with me when you arrive.' },
  ]},
  cedar:  { name: 'Cedar Ridge',  members: '4 members', color: '#6e4d8f', short: 'CDR', messages: [
    { from: 'Tomas R.',  time: '9:00a', text: 'All quiet here. Priya and I have morning covered.' },
    { from: 'You',       time: '9:05a', text: 'Great — Cedar has the best streak this quarter. Keep it up!' },
    { from: 'Tomas R.',  time: '9:06a', text: '💪' },
  ]},
  carmen: { name: 'Carmen Vela',  members: 'DM', color: '#6e4d8f', short: 'CV', messages: [
    { from: 'You',       time: 'Mon',   text: 'Hi Carmen — just checking in on orientation Week 2. Any questions on the MAR process?' },
    { from: 'Carmen V.', time: 'Mon',   text: 'Yes! I was confused about the 2-signature rule for PRN meds. Can we go over it?' },
    { from: 'You',       time: 'Mon',   text: 'Absolutely — I\'ll set up a 15-min call tomorrow morning. Does 8:30am work?' },
    { from: 'Carmen V.', time: 'Mon',   text: 'Perfect, thank you!' },
  ]},
  marcus: { name: 'Marcus Lewis', members: 'DM', color: '#cf4f3b', short: 'ML', messages: [
    { from: 'You',       time: 'Today', text: 'Marcus — this is the 4th late arrival in 2 weeks. I want to touch base this week. Can you come in 15 min early Thursday?' },
    { from: 'Marcus L.', time: 'Today', text: 'Yes, I can do Thursday. I\'m sorry about the lates — the bus schedule changed.' },
    { from: 'You',       time: 'Today', text: 'Appreciate you letting me know. Let\'s figure out a solution Thursday.' },
  ]},
};

export const TODAY_SHIFTS = [
  { house: 'oak',    start: 7,    end: 15,   person: 'Aisha M.',  role: 'Lead',    status: 'here' },
  { house: 'oak',    start: 7,    end: 15,   person: 'Jay B.',    role: 'DSP',     status: 'here' },
  { house: 'oak',    start: 15,   end: 23,   person: 'Carmen V.', role: 'DSP',     status: 'scheduled' },
  { house: 'oak',    start: 23,   end: 31,   person: 'Brian L.',  role: 'Awake OT',status: 'scheduled' },
  { house: 'willow', start: 7,    end: 15,   person: 'Devon P.',  role: 'Mgr',     status: 'here' },
  { house: 'willow', start: 15,   end: 23,   person: 'OPEN',      role: 'DSP',     status: 'open' },
  { house: 'willow', start: 9,    end: 13,   person: 'Theo W.',   role: 'PT',      status: 'scheduled' },
  { house: 'maple',  start: 7,    end: 15,   person: 'Saira K.',  role: 'Mgr',     status: 'here' },
  { house: 'maple',  start: 7.2,  end: 15.2, person: 'Marcus L.', role: 'DSP',     status: 'late' },
  { house: 'maple',  start: 11,   end: 19,   person: 'Reni T.',   role: 'DSP',     status: 'scheduled' },
  { house: 'maple',  start: 19,   end: 27,   person: 'Iris H.',   role: 'DSP',     status: 'scheduled' },
  { house: 'cedar',  start: 7,    end: 15,   person: 'Tomas R.',  role: 'Mgr',     status: 'here' },
  { house: 'cedar',  start: 15,   end: 23,   person: 'Priya N.',  role: 'DSP',     status: 'swap' },
];
