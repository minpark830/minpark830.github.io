/** Results, skills, and education: the parts of the home page that are lists. */

export interface Result {
  /** the measured change, set in the first column */
  amount: string;
  /** what changed */
  what: string;
  /** where, with a link to the evidence on this site or elsewhere */
  where: { label: string; href: string };
}

/** Each figure is also on the resume and in the entry it links to. */
export const results: Result[] = [
  {
    amount: '30% faster',
    what: 'trajectory generation, on average',
    where: { label: 'Varian', href: '#varian' },
  },
  {
    amount: '75% less',
    what: 'test time for a splitter box, with a test board I designed',
    where: { label: 'Stryker Interventional Spine', href: '#stryker-spine' },
  },
  {
    amount: 'Up to 20% less',
    what: 'camera-head manufacturing time, with LabVIEW automation',
    where: { label: 'Stryker Endoscopy', href: '#stryker-endoscopy' },
  },
  {
    amount: '3 drones',
    what: 'flown in triangle and line formations',
    where: { label: 'Cal Poly senior project', href: '/projects/swarm/' },
  },
  {
    amount: '75 problems',
    what: 'in a six-stage EE interview study path, live',
    where: { label: 'Ohm', href: 'https://minpark830.github.io/ohm/' },
  },
];

export const skills: { group: string; items: string }[] = [
  {
    group: 'Languages',
    items: 'C, C++, Python (NumPy, PyTorch, OpenCV), MATLAB, SystemVerilog, VHDL, RISC-V assembly, Java, JavaScript, SQL, Bash',
  },
  {
    group: 'Embedded',
    items: 'FreeRTOS, STM32 (Arm Cortex-M), interrupts, I²C, SPI, UART, Ethernet and TCP/IP, hardware-in-the-loop (HIL/SIL) testing, Arduino, Raspberry Pi, FPGAs (Basys-\u20603, Vivado)',
  },
  {
    group: 'Controls and estimation',
    items: 'Control theory, servo and motor control, PID, two-degree-of-freedom and state-space control, feedforward, disturbance observers, trajectory generation, path planning, Kalman filtering (EKF), formation control, convex optimization, PLC programming, MATLAB and Simulink',
  },
  {
    group: 'Robotics',
    items: 'ROS and ROS 2, Crazyflie, forward and inverse kinematics, computer vision, multi-agent systems',
  },
  {
    group: 'Hardware',
    items: 'Altium, Eagle, LTspice and SPICE, PCB design and assembly, power electronics, digital signal processing (DSP), Fusion 360, EMC and IEC 60601 compliance testing',
  },
  {
    group: 'Lab and test',
    items: 'Oscilloscope, logic analyzer, spectrum analyzer, network analyzer, multimeter, LabVIEW test automation',
  },
  {
    group: 'Software engineering',
    items: 'Git and GitHub, GitHub Actions CI/CD, Docker, Make, Linux, unit testing, Cypress end-to-end tests, ESLint, Prettier, Agile',
  },
  { group: 'Web', items: 'React, Vite, HTML and CSS, FastAPI, REST APIs, WebSockets' },
  { group: 'Data and cloud', items: 'Machine learning, AWS, Microsoft Azure, Firebase, Power Automate' },
];

export interface School {
  name: string;
  when: string;
  degree: string;
  notes?: { label: string; html: string }[];
}

export const schools: School[] = [
  {
    name: 'University of Pennsylvania',
    when: 'Expected Dec 2026',
    degree: 'M.S. in Electrical Engineering, concentration in AI. GPA 3.62.',
  },
  {
    name: 'California Polytechnic State University, San Luis Obispo',
    when: 'Sep 2021 – Jun 2025',
    degree: 'B.S. in Electrical Engineering, minor in Computer Science. GPA 3.96.',
    notes: [
      {
        label: 'Senior project',
        html: '<a href="https://digitalcommons.calpoly.edu/eesp/689/">Framework for Multi-Agent Coordination and Distributed Localization in Micro-UAVs</a>, with Nikolas Tambornini, advised by Siavash Farzan.',
      },
      {
        label: 'Honors',
        html: "Dean's List every term from Fall 2021 to Spring 2025, and President's Honor List 2021–2025.",
      },
    ],
  },
];

export const coursework: { group: string; courses: string }[] = [
  {
    group: 'Controls and optimization',
    courses: 'Classical Controls, Linear Systems Theory, Digital and Continuous Systems, Optimization Theory, Modern Convex Optimization',
  },
  {
    group: 'Embedded and digital',
    courses: 'Embedded Systems and Devices, Microcontroller System Design, Digital and Computer Design, Assembly Programming, Digital and Analog Electronics',
  },
  {
    group: 'Robotics and learning',
    courses: 'Vision-Based Robotics, Learning in Robotics, Machine Learning, Principles of Deep Learning, Machine Learning for Time-Series Data',
  },
  {
    group: 'Software and circuits',
    courses: 'Data Structures, Systems Programming, Object-Oriented Programming and Design, Discrete Structures, Circuit Analysis I–III',
  },
];

export const facts: { label: string; value: string }[] = [
  { label: 'License', value: 'FCC Amateur Radio Technician' },
  { label: 'Languages', value: 'English, Korean, Spanish (limited)' },
];
