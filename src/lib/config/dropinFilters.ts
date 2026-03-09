export interface ProgramFilterOption {
  label: string;
  value: string;          // unique chip key (e.g. "leisure-adult")
  ageLabel: string;
  group: "leisure" | "shinny" | "special";
  courseTitles: string[]; // all course_title strings this chip covers (supervised + unsupervised)
}

export const DROPIN_FILTER_OPTIONS: ProgramFilterOption[] = [
  // ── Leisure Skate (age descending) ───────────────────────────────────────
  {
    label: "All Ages",
    value: "leisure-all",
    ageLabel: "All ages",
    group: "leisure",
    courseTitles: ["Leisure Skate", "Leisure Skate (Unsupervised)"],
  },
  {
    label: "Older Adult",
    value: "leisure-older-adult",
    ageLabel: "60+ yrs",
    group: "leisure",
    courseTitles: [
      "Leisure Skate: Older Adult",
      "Leisure Skate: Older Adult (Unsupervised)",
    ],
  },
  {
    label: "Adult",
    value: "leisure-adult",
    ageLabel: "19+ yrs",
    group: "leisure",
    courseTitles: [
      "Leisure Skate: Adult",
      "Leisure Skate: Adult (Unsupervised)",
    ],
  },
  {
    label: "Youth",
    value: "leisure-youth",
    ageLabel: "13–24 yrs",
    group: "leisure",
    courseTitles: ["Leisure Skate: Youth"],
  },
  {
    label: "Child with Caregiver",
    value: "leisure-child",
    ageLabel: "6–12 yrs",
    group: "leisure",
    courseTitles: [
      "Leisure Skate: Child with Caregiver",
      "Leisure Skate: Child with Caregiver (unsupervised)",
      "Leisure Skate: Child with Caregiver (Unsupervised)",
    ],
  },
  {
    label: "Early Years",
    value: "leisure-early",
    ageLabel: "0–5 yrs",
    group: "leisure",
    courseTitles: [
      "Leisure Skate: Early Years with Caregiver",
      "Leisure Skate: Early Years with Caregiver (Unsupervised)",
    ],
  },

  // ── Shinny / Hockey (age descending) ─────────────────────────────────────
  {
    label: "All Ages",
    value: "shinny-all",
    ageLabel: "All ages",
    group: "shinny",
    courseTitles: ["Shinny", "Shinny (Unsupervised)", "Shinny (Women)"],
  },
  {
    label: "Older Adult",
    value: "shinny-older-adult",
    ageLabel: "60+ yrs",
    group: "shinny",
    courseTitles: [
      "Shinny: Older Adult",
      "Shinny: Older Adult (Unsupervised)",
      "Shinny: Older Adult (Women) (Unsupervised)",
    ],
  },
  {
    label: "Adult",
    value: "shinny-adult",
    ageLabel: "18+ yrs",
    group: "shinny",
    courseTitles: ["Shinny: Adult", "Shinny: Adult (Unsupervised)"],
  },
  {
    label: "Youth",
    value: "shinny-youth",
    ageLabel: "13–24 yrs",
    group: "shinny",
    courseTitles: [
      "Shinny: Youth",
      "Shinny: Youth (Girls)",
      "Shinny: Youth (Unsupervised)",
    ],
  },
  {
    label: "Child",
    value: "shinny-child",
    ageLabel: "6–13 yrs",
    group: "shinny",
    courseTitles: [
      "Shinny: Child",
      "Shinny: Child (Girls)",
      "Shinny: Child (Unsupervised)",
      "Shinny: Child with Caregiver",
      "Shinny: Child with Caregiver (unsupervised)",
      "Shinny: Child with Caregiver (Unsupervised)",
    ],
  },
  {
    label: "Early Years",
    value: "shinny-early",
    ageLabel: "0–5 yrs",
    group: "shinny",
    courseTitles: [
      "Shinny: Early Years with Caregiver",
      "Shinny: Early Years with Caregiver (Unsupervised)",
    ],
  },

  // ── Special Programs ──────────────────────────────────────────────────────
  {
    label: "Adapted Leisure",
    value: "special-adapted",
    ageLabel: "All ages",
    group: "special",
    courseTitles: ["Adapted Leisure Skate with Family"],
  },
  {
    label: "Pride Skate",
    value: "special-pride",
    ageLabel: "All ages",
    group: "special",
    courseTitles: ["Leisure Skate (Pride Skate)"],
  },
];

export const DISTRICTS = [
  { value: "", label: "All Toronto" },
  { value: "Etobicoke York", label: "Etobicoke & York" },
  { value: "North York", label: "North York" },
  { value: "Scarborough", label: "Scarborough" },
  { value: "Toronto and East York", label: "Toronto & East York" },
];

export const RADIUS_OPTIONS = [
  { value: "2", label: "Within 2 km" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
];

export const ACTIVITY_FILTER_OPTIONS = [
  { value: "", label: "All Activities" },
  { value: "skating", label: "Skating" },
  { value: "fitness", label: "Fitness" },
  { value: "aquatics", label: "Aquatics" },
  { value: "arts", label: "Arts" },
  { value: "sports", label: "Sports" },
];

export interface SubActivityOption {
  value: string;
  label: string;
}

/**
 * Sub-activity options grouped by parent activity_type.
 * Values match the normalized sub_activity column in the DB.
 */
// ── Shared sub-activity entries (identical in both drop-in and registered maps) ──

const SHARED_FITNESS: SubActivityOption[] = [
  { value: "Yoga",      label: "Yoga" },
  { value: "Pilates",   label: "Pilates" },
  { value: "Zumba",     label: "Zumba" },
  { value: "Cardio",    label: "Cardio / Bootcamp" },
  { value: "Tai Chi",   label: "Tai Chi" },
];

const SHARED_ARTS: SubActivityOption[] = [
  { value: "Dance",    label: "Dance" },
  { value: "Painting", label: "Painting / Drawing" },
  { value: "Pottery",  label: "Pottery / Ceramics" },
  { value: "Crafts",   label: "Crafts" },
  { value: "Music",    label: "Music" },
  { value: "Drama",    label: "Drama / Theatre" },
];

const SHARED_SPORTS: SubActivityOption[] = [
  { value: "Pickleball",   label: "Pickleball" },
  { value: "Soccer",       label: "Soccer" },
  { value: "Basketball",   label: "Basketball" },
  { value: "Badminton",    label: "Badminton" },
  { value: "Volleyball",   label: "Volleyball" },
  { value: "Tennis",       label: "Tennis" },
  { value: "Baseball",     label: "Baseball / Softball" },
  { value: "Squash",       label: "Squash" },
  { value: "Ball Hockey", label: "Ball Hockey" },
  { value: "Floor Hockey", label: "Floor Hockey" },
  { value: "Dodgeball",    label: "Dodgeball" },
  { value: "Table Tennis", label: "Table Tennis" },
  { value: "Lacrosse",     label: "Lacrosse" },
  { value: "Cricket",      label: "Cricket" },
];

export const SUB_ACTIVITY_MAP: Record<string, SubActivityOption[]> = {
  skating: [
    { value: "Public Skating", label: "Public Skating" },
    { value: "Hockey",         label: "Hockey / Shinny" },
    { value: "Figure Skating", label: "Figure Skating" },
    { value: "Speed Skating",  label: "Speed Skating" },
    { value: "Ringette",       label: "Ringette" },
    { value: "Broomball",      label: "Broomball" },
  ],
  aquatics: [
    { value: "Leisure Swim",      label: "Leisure Swim" },
    { value: "Lane Swimming",     label: "Lane Swimming" },
    { value: "Aquafit",           label: "Aquafit" },
    { value: "Swim Lessons",      label: "Swim Lessons" },
    { value: "Parent & Tot Swim", label: "Parent & Tot Swim" },
    { value: "Diving",            label: "Diving" },
    { value: "Water Polo",        label: "Water Polo" },
  ],
  fitness: SHARED_FITNESS,
  arts:    SHARED_ARTS,
  sports:  [...SHARED_SPORTS, { value: "Ringette", label: "Ringette" }, { value: "Broomball", label: "Broomball" }],
};

/**
 * Sub-activity options for Registered Programs.
 * Skating/aquatics differ from drop-in; fitness/arts/sports share base entries.
 */
export const PROGRAMS_SUB_ACTIVITY_MAP: Record<string, SubActivityOption[]> = {
  skating: [
    { value: "Public Skating", label: "Learn to Skate" },
    { value: "Hockey",         label: "Hockey / Shinny" },
    { value: "Figure Skating", label: "Figure Skating" },
  ],
  aquatics: [
    { value: "Swim Lessons",        label: "Swim Lessons" },
    { value: "Parent & Tot Swim",   label: "Parent & Tot Swim" },
    { value: "Ultra Swim",          label: "Ultra Swim" },
    { value: "Adult Swim",          label: "Adult Swim" },
    { value: "Aquatic Leadership",  label: "Aquatic Leadership" },
    { value: "Swim Team",           label: "Swim Team" },
  ],
  fitness: SHARED_FITNESS,
  arts:    SHARED_ARTS,
  sports:  SHARED_SPORTS,
};
