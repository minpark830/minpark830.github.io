#include "gains.hpp"
#include "pid.hpp"
#include "stm32f4xx.h"

// Provided elsewhere in the firmware:
extern volatile float g_setpoint;  // rad
float encoder_angle_rad();
void pwm_set_duty(float u);        // u in [-1, 1]

// tf = 5 ms, ts = 1 ms, output limits of -1 and 1
static Pid pid{kKp, kKi, kKd, 0.005f, 0.001f,
               -1.0f, 1.0f};

// TIM2 update interrupt at 1 kHz.
extern "C" void TIM2_IRQHandler() {
  TIM2->SR = ~TIM_SR_UIF;  // clear the update flag
  const float y = encoder_angle_rad();
  pwm_set_duty(pid.update(g_setpoint, y));
}
