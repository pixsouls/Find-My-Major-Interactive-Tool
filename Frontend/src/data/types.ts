export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface Option {
  label: string;
  value: number;
  color: string;
}

export interface Question {
  id: number;
  text: string;
  type: RiasecType;
}

export const questions: Question[] = [
  { id: 1, text: "I like to build and repair things with my hands.", type: "R" },
  { id: 2, text: "I enjoy researching scientific theories and facts.", type: "I" },
  { id: 3, text: "I like to express myself through sketching or painting.", type: "A" },
  { id: 4, text: "I enjoy teaching or training others.", type: "S" },
  { id: 5, text: "I like to start my own business or lead a project.", type: "E" },
  { id: 6, text: "I enjoy organizing data and maintaining records.", type: "C" },
  { id: 7, text: "I like working with tools and machinery.", type: "R" },
  { id: 8, text: "I enjoy solving complex problems.", type: "I" },
  { id: 9, text: "I like performing in front of others.", type: "A" },
  { id: 10, text: "I enjoy helping people solve their problems.", type: "S" },
  { id: 11, text: "I like persuading others to my point of view.", type: "E" },
  { id: 12, text: "I enjoy following clear procedures.", type: "C" },
  { id: 13, text: "I like working outdoors with plants or animals.", type: "R" },
  { id: 14, text: "I enjoy analyzing data and finding patterns.", type: "I" },
  { id: 15, text: "I like writing stories or poetry.", type: "A" },
  { id: 16, text: "I enjoy counseling or mentoring others.", type: "S" },
  { id: 17, text: "I like negotiating deals or contracts.", type: "E" },
  { id: 18, text: "I enjoy working with numbers and spreadsheets.", type: "C" },
  { id: 19, text: "I like fixing mechanical or electrical problems.", type: "R" },
  { id: 20, text: "I enjoy conducting experiments or research.", type: "I" },
  { id: 21, text: "I like designing websites or graphics.", type: "A" },
  { id: 22, text: "I enjoy volunteering for community causes.", type: "S" },
  { id: 23, text: "I like managing projects and delegating tasks.", type: "E" },
  { id: 24, text: "I enjoy proofreading and checking for accuracy.", type: "C" },
];

// 2. Apply the interface here
export const options: Option[] = [
  { label: 'Strongly Disagree', value: 1, color: '#ef4444' },
  { label: 'Disagree', value: 2, color: '#f87171' },
  { label: 'Neutral', value: 3, color: '#94a3b8' },
  { label: 'Agree', value: 4, color: '#4ade80' },
  { label: 'Strongly Agree', value: 5, color: '#22c55e' },
];