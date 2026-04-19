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
  { id: 1, text: "I enjoy working with tools, machines, or physical equipment.", type: "R" },
  { id: 2, text: "I like solving complex problems.", type: "I" },
  { id: 3, text: "I express myself best through art, writing music, or creative projects.", type: "A" },
  { id: 4, text: "Helping people with their problems gives me satisfaction.", type: "S" },
  { id: 5, text: "I feel comfortable in competitive environments.", type: "E" },
  { id: 6, text: "I prefer having clear rules, schedules, and organized systems.", type: "C" },

  { id: 7, text: "I like fixing and building things.", type: "R" },
  { id: 8, text: "I enjoy analyzing data, research, or abstract ideas.", type: "I" },
  { id: 9, text: "I like coming up with original ideas and experimenting with new styles.", type: "A" },
  { id: 10, text: "I enjoy guiding and teaching others.", type: "S" },
  { id: 11, text: "I enjoy taking the lead when working with others.", type: "E" },
  { id: 12, text: "I enjoy planning, budgeting, or keeping records accurate.", type: "C" },

  { id: 13, text: "I enjoy working outdoors rather than at a desk.", type: "R" },
  { id: 14, text: "I prefer learning using critical thinking over memorization.", type: "I" },
  { id: 15, text: "I prefer having freedom rather than guidelines on work.", type: "A" },
  { id: 16, text: "I characterize myself as helpful, friendly, and trustworthy.", type: "S" },
  { id: 17, text: "I excel at convincing people to support my plan.", type: "E" },
  { id: 18, text: "I make sure to double check all my work and submit it on time.", type: "C" },

  { id: 19, text: "I prefer practical tasks over theoretical discussions.", type: "R" },
  { id: 20, text: "I enjoy learning how and why things work.", type: "I" },
  { id: 21, text: "I enjoy designing, creating, or performing.", type: "A" },
  { id: 22, text: "I find great joy in forming close relationships with others.", type: "S" },
  { id: 23, text: "I prioritize working hard towards my goals.", type: "E" },
  { id: 24, text: "I thrive in structured environments.", type: "C" },

  { id: 25, text: "I feel satisfied when I can see a tangible result of my work.", type: "R" },
  { id: 26, text: "I would rather research a topic deeply than work with my hands.", type: "I" },
  { id: 27, text: "I feel energized when I can think outside of the box.", type: "A" },
  { id: 28, text: "I prefer working with people over working alone.", type: "S" },
  { id: 29, text: "I like helping start up and carry out projects.", type: "E" },
  { id: 30, text: "I see myself as orderly and good at following a set plan.", type: "C" },

  { id: 31, text: "I prefer structured, task-focused tasks with clear outcomes.", type: "R" },
  { id: 32, text: "I prefer logical reading over emotional decisions.", type: "I" },
  { id: 33, text: "I often think of unique or unconventional solutions.", type: "A" },
  { id: 34, text: "I thrive in roles where I can connect with others and assist them.", type: "S" },
  { id: 35, text: "I am willing to take risks to achieve a desired outcome.", type: "E" },
  { id: 36, text: "I have set high standards for the work I produce.", type: "C" },

  { id: 37, text: "I enjoy working with animals, plants, or nature.", type: "R" },
  { id: 39, text: "I enjoy conducting experiments to test my theories.", type: "I" },
  { id: 41, text: "I enjoy visiting museums, galleries, or attending performances.", type: "A" },
  { id: 43, text: "I feel fulfillment when I support someone through a difficult time.", type: "S" },
  { id: 45, text: "I enjoy negotiating or finding deals that benefit everyone.", type: "E" },
  { id: 47, text: "I prefer having a consistent daily routine over spontaneous changes.", type: "C" },

  { id: 38, text: "I like assembling or taking apart mechanical or electronic devices.", type: "R" },
  { id: 40, text: "I am drawn to puzzles, riddles, or strategic games.", type: "I" },
  { id: 42, text: "I like using visuals, metaphors, or storytelling to explain things.", type: "A" },
  { id: 44, text: "I naturally notice when someone around me is struggling.", type: "S" },
  { id: 46, text: "I feel motivated by recognition and achieving measurable success.", type: "E" },
  { id: 48, text: "I take pride in keeping my workspace neat and well-organized.", type: "C" },
];

// 2. Apply the interface here
export const options: Option[] = [
  { label: 'Strongly Disagree', value: 1, color: '#ef4444' },
  { label: 'Disagree', value: 2, color: '#f87171' },
  { label: 'Neutral', value: 3, color: '#94a3b8' },
  { label: 'Agree', value: 4, color: '#4ade80' },
  { label: 'Strongly Agree', value: 5, color: '#22c55e' },
];