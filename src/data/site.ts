/** Facts used across the site. Change them here and every page follows. */
export const site = {
  name: 'Minwoo Park',
  givenName: 'Minwoo',
  familyName: 'Park',
  role: 'Embedded software and controls engineer',
  url: 'https://minpark830.github.io/',
  email: 'mwpark@engineering.upenn.edu',
  resume: '/assets/Minwoo_Park_Resume.pdf',
  github: 'https://github.com/minpark830',
  linkedin: 'https://www.linkedin.com/in/minwoo-park1/',
  repo: 'https://github.com/minpark830/minpark830.github.io',
  ohm: 'https://minpark830.github.io/ohm/',
  description:
    "Minwoo Park is an embedded software and controls engineer finishing an M.S. in Electrical Engineering at the University of Pennsylvania. Servo control and trajectory planning at Varian; aerial robotics research in Penn's Kumar Lab.",
  ogTitle: 'Minwoo Park, embedded software and controls engineer',
  ogDescription:
    'Servo control and trajectory planning at Varian, aerial robotics research at Penn, and embedded C++ on real hardware. Includes a live PID servo you can tune.',
  ogImageAlt:
    'Minwoo Park, embedded software and controls engineer, next to a servo step response that meets its requirements.',
} as const;

/** Roles the projects can be filtered by, in the order of the filter. */
export const roleIds = ['embedded', 'controls', 'electrical', 'software'] as const;
export type Role = (typeof roleIds)[number];

export const roleLabels: Record<Role, string> = {
  embedded: 'Embedded',
  controls: 'Controls',
  electrical: 'Electrical',
  software: 'Software',
};

/** Where to look for more of each kind of work, shown under the filter. */
export const roleNotes: Record<Role, string> = {
  embedded:
    'Also see Varian and CPSquare under Experience, where the embedded work is servo and motor control in C++ and drone firmware in C on FreeRTOS.',
  controls:
    'Most of my controls work is at Varian and the Kumar Lab, under Experience. Figure 1, at the top of this page, is a PID servo you can tune.',
  electrical:
    'Also see the two Stryker internships under Experience: a test board designed in Altium, and LabVIEW automation on a manufacturing line.',
  software:
    'Also see Varian under Experience, where I write and unit-test planning and control software in C++ and Python.',
};
