// Stand-in for the STM32F4 device header, with only what control_loop.cpp
// touches, so the test can compile that file on a desktop machine.
#pragma once
#include <cstdint>

struct TIM_TypeDef {
  volatile std::uint32_t SR;
};

inline TIM_TypeDef tim2_registers{};
#define TIM2 (&tim2_registers)
#define TIM_SR_UIF (0x1u)
