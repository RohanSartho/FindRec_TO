export interface ProgramFilterOption {
  label: string;
  value: string; // matches course_title exactly
  ageLabel: string;
  group: "leisure" | "shinny" | "special";
}

export const DROPIN_FILTER_OPTIONS: ProgramFilterOption[] = [
  // Leisure Skate
  {
    label: "Leisure Skate",
    value: "Leisure Skate",
    ageLabel: "All ages",
    group: "leisure",
  },
  {
    label: "Leisure Skate (Unsupervised)",
    value: "Leisure Skate (Unsupervised)",
    ageLabel: "All ages",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Early Years",
    value: "Leisure Skate: Early Years with Caregiver",
    ageLabel: "0–5 yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Early Years (Unsupervised)",
    value: "Leisure Skate: Early Years with Caregiver (Unsupervised)",
    ageLabel: "0–5 yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Child with Caregiver",
    value: "Leisure Skate: Child with Caregiver",
    ageLabel: "6–12 yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Youth",
    value: "Leisure Skate: Youth",
    ageLabel: "13–24 yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Adult",
    value: "Leisure Skate: Adult",
    ageLabel: "19+ yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Adult (Unsupervised)",
    value: "Leisure Skate: Adult (Unsupervised)",
    ageLabel: "19+ yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Older Adult",
    value: "Leisure Skate: Older Adult",
    ageLabel: "60+ yrs",
    group: "leisure",
  },
  {
    label: "Leisure Skate: Older Adult (Unsupervised)",
    value: "Leisure Skate: Older Adult (Unsupervised)",
    ageLabel: "60+ yrs",
    group: "leisure",
  },
  // Shinny
  {
    label: "Shinny",
    value: "Shinny",
    ageLabel: "All ages",
    group: "shinny",
  },
  {
    label: "Shinny (Unsupervised)",
    value: "Shinny (Unsupervised)",
    ageLabel: "All ages",
    group: "shinny",
  },
  {
    label: "Shinny: Early Years",
    value: "Shinny: Early Years with Caregiver",
    ageLabel: "0–5 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Child",
    value: "Shinny: Child",
    ageLabel: "6–13 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Child (Girls)",
    value: "Shinny: Child (Girls)",
    ageLabel: "6–12 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Child with Caregiver",
    value: "Shinny: Child with Caregiver",
    ageLabel: "0–12 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Youth",
    value: "Shinny: Youth",
    ageLabel: "0–24 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Youth (Girls)",
    value: "Shinny: Youth (Girls)",
    ageLabel: "13–18 yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Adult",
    value: "Shinny: Adult",
    ageLabel: "18+ yrs",
    group: "shinny",
  },
  {
    label: "Shinny (Women)",
    value: "Shinny (Women)",
    ageLabel: "18+ yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Adult (Unsupervised)",
    value: "Shinny: Adult (Unsupervised)",
    ageLabel: "18+ yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Older Adult",
    value: "Shinny: Older Adult",
    ageLabel: "60+ yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Older Adult (Unsupervised)",
    value: "Shinny: Older Adult (Unsupervised)",
    ageLabel: "60+ yrs",
    group: "shinny",
  },
  {
    label: "Shinny: Older Adult (Women)",
    value: "Shinny: Older Adult (Women) (Unsupervised)",
    ageLabel: "60+ yrs",
    group: "shinny",
  },
  // Special
  {
    label: "Adapted Leisure Skate",
    value: "Adapted Leisure Skate with Family",
    ageLabel: "All ages",
    group: "special",
  },
  {
    label: "Leisure Skate (Pride)",
    value: "Leisure Skate (Pride Skate)",
    ageLabel: "All ages",
    group: "special",
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
