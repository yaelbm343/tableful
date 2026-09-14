// Mock data for the Tableful prototype. No backend — everything lives here or in localStorage.

const GRADIENTS = [
    'linear-gradient(135deg,#E8B37A,#C1633D)',
    'linear-gradient(135deg,#9CB380,#5E7A4A)',
    'linear-gradient(135deg,#D9A5A0,#A85C52)',
    'linear-gradient(135deg,#E3C77E,#B8863B)',
    'linear-gradient(135deg,#A9BFC4,#5C7C82)',
    'linear-gradient(135deg,#CBB3D8,#7E5B94)',
    'linear-gradient(135deg,#E2A25B,#9C5A2E)',
    'linear-gradient(135deg,#8FB3A3,#3F6B58)',
  ];

const FAMILIES = [
  {
        id: 'f1', name: 'Cohen', city: 'Paris', district: 'Paris 16e', distanceKm: 2.1,
        languages: ['French', 'English', 'Hebrew'], lifestyle: 'Traditional', kosher: 'Fully Kosher',
        capacity: 4, intro: 'We love hosting students for a lively Friday night table — good food, good conversation, and always room for one more.',
        familyInfo: 'Two parents, three teenagers, one very friendly cat.', accessibility: 'Ground floor entrance, no stairs.',
        photo: GRADIENTS[0],
  },
  {
        id: 'f2', name: 'Levy', city: 'Paris', district: 'Paris 17e', distanceKm: 3.4,
        languages: ['French', 'Hebrew'], lifestyle: 'Religious', kosher: 'Glatt Kosher',
        capacity: 2, intro: 'A quiet, warm home. We keep a traditional Shabbat table and love introducing students to our customs.',
        familyInfo: 'Retired couple, longtime hosts of exchange students.', accessibility: '',
        photo: GRADIENTS[1],
  },
  {
        id: 'f3', name: 'Azoulay', city: 'Paris', district: 'Paris 11e', distanceKm: 1.2,
        languages: ['French', 'English'], lifestyle: 'Secular', kosher: 'Kosher-style, no pork/shellfish',
        capacity: 6, intro: 'Big table, bigger appetite for good company. We host students almost every Friday.',
        familyInfo: 'Family of five, two dogs, lots of laughter.', accessibility: 'Elevator building.',
        photo: GRADIENTS[2],
  },
  {
        id: 'f4', name: 'Benhamou', city: 'Paris', district: 'Paris 19e', distanceKm: 5.6,
        languages: ['French', 'Hebrew', 'Arabic'], lifestyle: 'Traditional', kosher: 'Fully Kosher',
        capacity: 3, intro: 'North-African Shabbat traditions with a lot of warmth. Students often become regulars.',
        familyInfo: 'Parents with one child at home.', accessibility: '',
        photo: GRADIENTS[3],
  },
  {
        id: 'f5', name: 'Weiss', city: 'Paris', district: 'Neuilly-sur-Seine', distanceKm: 4.8,
        languages: ['French', 'English', 'German'], lifestyle: 'Secular', kosher: 'Not kosher, dietary needs accommodated',
        capacity: 4, intro: 'We host a relaxed Friday dinner — candles, good wine, easy conversation about anything.',
        familyInfo: 'Young couple, no children yet.', accessibility: 'Third floor, no elevator.',
        photo: GRADIENTS[4],
  },
  {
        id: 'f6', name: 'Haddad', city: 'Paris', district: 'Paris 9e', distanceKm: 2.9,
        languages: ['French', 'Hebrew', 'English'], lifestyle: 'Traditional', kosher: 'Fully Kosher',
        capacity: 5, intro: 'Our door is always open on Friday nights. Students say it feels like a second family.',
        familyInfo: 'Family of four plus grandparents most weeks.', accessibility: 'Ground floor.',
        photo: GRADIENTS[5],
  },
  {
        id: 'f7', name: 'Sebbag', city: 'Paris', district: 'Paris 15e', distanceKm: 3.9,
        languages: ['French'], lifestyle: 'Religious', kosher: 'Glatt Kosher',
        capacity: 2, intro: 'A calm, spiritual Shabbat table. We love sharing traditions with students far from home.',
        familyInfo: 'Couple in their 60s.', accessibility: '',
        photo: GRADIENTS[6],
  },
  {
        id: 'f8', name: 'Boukhris', city: 'Paris', district: 'Paris 12e', distanceKm: 6.3,
        languages: ['French', 'English', 'Hebrew'], lifestyle: 'Secular', kosher: 'Kosher-style',
        capacity: 8, intro: 'We regularly host groups of students — the more the merrier at our table.',
        familyInfo: 'Large family, always some cousins around too.', accessibility: 'Elevator building.',
        photo: GRADIENTS[7],
  },
  ];

// Jewish holidays are lunar and start at sundown the evening before — these dates are
// reasonable estimates for the demo, not authoritative. A real build should pull them
// from a Hebrew-calendar API (e.g. Hebcal) rather than hardcoding.
const HOLIDAYS_2026 = [
  { key: 'roshHashanah', start: '2026-09-11', end: '2026-09-13', emoji: '🍎' },
  { key: 'yomKippur', start: '2026-09-20', end: '2026-09-21', emoji: '🕊️' },
  { key: 'sukkot', start: '2026-09-25', end: '2026-10-02', emoji: '🌿' },
  { key: 'simchatTorah', start: '2026-10-03', end: '2026-10-04', emoji: '📜' },
  { key: 'chanukah', start: '2026-12-05', end: '2026-12-12', emoji: '🕎' },
  { key: 'tuBishvat', start: '2027-01-22', end: '2027-01-22', emoji: '🌳' },
  { key: 'purim', start: '2027-03-04', end: '2027-03-04', emoji: '🎭' },
  { key: 'passover', start: '2027-04-01', end: '2027-04-09', emoji: '🍷' },
  { key: 'shavuot', start: '2027-05-21', end: '2027-05-22', emoji: '🌾' },
  ];

// French national public holidays (jours fériés), 2026 — fixed dates plus Easter-derived
// ones computed from the standard Gregorian Easter algorithm, so these are exact.
const FRENCH_HOLIDAYS_2026 = [
  { key: 'jourDeLAn', date: '2026-01-01' },
  { key: 'lundiDePaques', date: '2026-04-06' },
  { key: 'feteDuTravail', date: '2026-05-01' },
  { key: 'victoire1945', date: '2026-05-08' },
  { key: 'ascension', date: '2026-05-14' },
  { key: 'lundiDePentecote', date: '2026-05-25' },
  { key: 'feteNationale', date: '2026-07-14' },
  { key: 'assomption', date: '2026-08-15' },
  { key: 'toussaint', date: '2026-11-01' },
  { key: 'armistice', date: '2026-11-11' },
  { key: 'noel', date: '2026-12-25' },
  ];

function nextFriday(from = new Date()) {
    const d = new Date(from);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
}

function upcomingHoliday(from = new Date()) {
    const today = new Date(from.toDateString());
    for (const h of HOLIDAYS_2026) {
          const start = new Date(h.start);
          const diffDays = (start - today) / 86400000;
          if (diffDays >= 0 && diffDays <= 21) return h;
    }
    return null;
}
