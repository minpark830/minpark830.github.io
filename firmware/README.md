# Firmware shown in Figure 1

These are the files the home page displays beside the live servo. The page
imports them at build time, so what you read on the site is what is tested.

- `pid.hpp`: the discrete PID controller. `src/lib/servo.ts` is a line-for-line
  port, and `tests/unit/parity.test.ts` compiles this header with `g++` and
  checks that both produce the same step response.
- `gains.hpp`: the default gains. On the page the numbers follow the sliders.
- `control_loop.cpp`: how the controller would run from a 1 kHz timer
  interrupt on an STM32F4. The test compiles it against a small stand-in for
  the vendor header (`tests/cpp/stub/stm32f4xx.h`); it is not flashed to
  hardware.
