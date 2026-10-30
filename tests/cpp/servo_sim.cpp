// Runs firmware/pid.hpp against the same plant as src/lib/servo.ts and prints
// the measured position at every sample, one value per line.
//
//   servo_sim kp ki kd
#include <cstdio>
#include <cstdlib>

#include "pid.hpp"

int main(int argc, char** argv) {
  if (argc != 4) {
    std::fprintf(stderr, "usage: servo_sim kp ki kd\n");
    return 2;
  }
  const float kp = std::strtof(argv[1], nullptr);
  const float ki = std::strtof(argv[2], nullptr);
  const float kd = std::strtof(argv[3], nullptr);

  // Same constants as PLANT in src/lib/servo.ts.
  const double ts = 0.001, tau = 0.1, K = 10.0, load_amount = 0.3;
  const int samples = 2000, i_up = 100, i_down = 1100, i_load = 600;

  Pid pid{kp, ki, kd, 0.005f, 0.001f, -1.0f, 1.0f};
  double th = 0.0, w = 0.0;

  for (int k = 0; k < samples; ++k) {
    const float r = (k >= i_up && k < i_down) ? 1.0f : 0.0f;
    const double load = k >= i_load ? load_amount : 0.0;

    const float u = pid.update(r, static_cast<float>(th));
    std::printf("%.9g\n", th);

    // One RK4 step with the command held.
    const double f = K * (static_cast<double>(u) - load);
    const double a1 = w, b1 = (f - w) / tau;
    const double a2 = w + ts / 2 * b1, b2 = (f - a2) / tau;
    const double a3 = w + ts / 2 * b2, b3 = (f - a3) / tau;
    const double a4 = w + ts * b3, b4 = (f - a4) / tau;
    th += ts / 6 * (a1 + 2 * a2 + 2 * a3 + a4);
    w += ts / 6 * (b1 + 2 * b2 + 2 * b3 + b4);
  }
  return 0;
}
