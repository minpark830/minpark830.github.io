export interface Job {
  /** anchor id, so results and other pages can link to the entry */
  id: string;
  org: string;
  role: string;
  place: string;
  when: string;
  bullets: string[];
  techniques?: string;
  /** a write-up about this work */
  writeup?: { href: string; label: string };
}

export interface SmallRole {
  title: string;
  when: string;
  desc: string;
}

export const jobs: Job[] = [
  {
    id: 'varian',
    org: 'Varian (Siemens Healthineers)',
    role: 'Embedded Software Engineer / Control Systems Intern',
    place: 'Palo Alto, CA',
    when: 'May 2026 – present',
    bullets: [
      'Build and unit-test servo and motor control, optimization, and path and treatment-planning algorithms in C++ and Python for radiotherapy machines, improving servo performance and motion accuracy.',
      'Made trajectory generation 30% faster on average by optimizing the planning algorithms.',
    ],
    techniques:
      'two-degree-of-freedom PID with feedforward, disturbance observers, jerk-limited trajectory generation.',
  },
  {
    id: 'kumar-lab',
    org: 'Kumar Lab, University of Pennsylvania',
    role: 'Research Assistant',
    place: 'Philadelphia, PA',
    when: 'Aug 2025 – present',
    bullets: [
      'Writing a research paper on multi-agent payload control: literature synthesis, problem formulation, and analysis of trajectory generation and controller performance.',
      'Built and configured a Crazyflie test framework with ROS 2 and Docker for evaluating trajectories and controllers, so aerial-robotics experiments can be reproduced and validated.',
    ],
  },
  {
    id: 'cpsquare',
    org: 'CPSquare, Cal Poly Cyber-Physical Systems Lab',
    role: 'Research Assistant',
    place: 'San Luis Obispo, CA',
    when: 'Sep 2024 – Jun 2025',
    bullets: [
      'Co-developed leader-follower formation control (triangle and line formations) for a three-drone Crazyflie swarm, flight-tested in the lab.',
      "Wrote the leader drone's firmware apps in C as FreeRTOS tasks, including a peer-to-peer radio version that takes the ground station out of the loop, and a Python FastAPI ground server with a WebSocket link to each drone.",
    ],
    writeup: { href: '/projects/swarm/', label: 'Read the write-up on the swarm controller' },
  },
  {
    id: 'stryker-endoscopy',
    org: 'Stryker, Endoscopy',
    role: 'Advanced Operations Electrical Engineering Intern',
    place: 'San Jose, CA',
    when: 'Jun – Sep 2024',
    bullets: [
      'Introduced LabVIEW automation software on the 1788 camera head manufacturing line, cutting manufacturing time by up to 20%.',
      'Reworked Precision Light Source calibration software to support the L11 light source line, saving 5% of production floor space.',
      'Revised the 1788 camera head quality-check software, improving reliability and cutting debugging time by more than two weeks.',
    ],
  },
  {
    id: 'stryker-spine',
    org: 'Stryker, Interventional Spine',
    role: 'R&D Electrical Engineering Intern',
    place: 'Portage, MI',
    when: 'Jun – Sep 2023',
    bullets: [
      'Designed the schematic and PCB layout of an Arduino-integrated test board in Altium Designer, cutting MultiGen 2 splitter box test time by 75%.',
      "Made the board's schematic symbols and footprints by hand, chose parts to meet power and cost requirements, and generated the bill of materials for purchasing.",
      'Tested and verified EMC and power compliance of RF ablation console PCBAs to IEC 60601.',
      'Wrote the documentation for the MultiGen 2 test board used by R&D teams.',
    ],
  },
];

export const earlierRoles: SmallRole[] = [
  {
    title: 'Instructional Teaching Assistant, Cal Poly EE',
    when: '2023 – 2025',
    desc: 'Graded and gave feedback for EE 302 and EE 342 (classical controls and its lab). Taught soldering, PCB design, and microcontroller basics in EE 143, and graded EE 113 and EE 228.',
  },
  {
    title: 'Student Assistant, Cal Poly Corporation',
    when: 'Aug 2022 – Jul 2023',
    desc: 'Automated grant and contract data collection with Power Automate workflows and Python scripts, and built a CRM app in JavaScript and Firebase.',
  },
  {
    title: 'Code Sensei, Code Ninjas Cupertino',
    when: 'Sep 2019 – Aug 2021',
    desc: 'Taught programming fundamentals through JavaScript and guided students through debugging and building games.',
  },
];
