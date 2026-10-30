#pragma once
#include <algorithm>

// Discrete PID for a 1 kHz servo loop.
// - Derivative acts on the measurement through a
//   first-order filter, so setpoint steps don't kick.
// - Integration pauses while the output is saturated
//   in the direction of the error (anti-windup).
struct Pid {
  float kp, ki, kd;    // gains
  float tf;            // derivative filter [s]
  float ts;            // sample period [s]
  float u_min, u_max;  // actuator limits

  float integ  = 0.0f;
  float d_filt = 0.0f;
  float y_prev = 0.0f;

  float update(float r, float y) {
    const float e = r - y;

    const float a  = tf / (tf + ts);
    const float dy = (y - y_prev) / ts;
    d_filt = a * d_filt - (1.0f - a) * kd * dy;
    y_prev = y;

    const float u = kp * e + integ + d_filt;

    const bool windup = (u > u_max && e > 0.0f) ||
                        (u < u_min && e < 0.0f);
    if (!windup) integ += ki * ts * e;

    return std::clamp(u, u_min, u_max);
  }
};
