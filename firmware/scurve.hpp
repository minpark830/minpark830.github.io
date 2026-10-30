#pragma once
#include <array>
#include <cmath>

// Shortest move from rest to rest over a distance, within limits on
// velocity, acceleration, and jerk: seven phases of constant jerk
// (+j, 0, -j, cruise, -j, 0, +j). Plan once, then call at() from the
// control loop. No heap, no exceptions.
struct Scurve {
  struct State {
    float x, v, a;  // position [m], velocity [m/s], acceleration [m/s^2]
  };

  std::array<float, 7> dt{};     // phase durations [s]
  std::array<float, 7> jerk{};   // jerk in each phase [m/s^3]
  std::array<State, 8> start{};  // state at each phase start, then the end
  float duration = 0.0f;         // [s]

  // Returns false and leaves the plan empty unless all limits are positive.
  bool plan(float distance, float v_max, float a_max, float j_max) {
    *this = Scurve{};
    const float d = std::fabs(distance);
    if (!(d > 0.0f && v_max > 0.0f && a_max > 0.0f && j_max > 0.0f)) return false;
    const float v = v_max, a = a_max, j = j_max;

    // Assume the move reaches the velocity limit and cruises.
    float tj, ta;
    if (v * j >= a * a) {
      tj = a / j;
      ta = tj + v / a;
    } else {
      tj = std::sqrt(v / j);
      ta = 2.0f * tj;
    }
    float tv = d / v - ta;

    if (tv < 0.0f) {
      // Too short to cruise: find the peak velocity the distance allows.
      tv = 0.0f;
      tj = a / j;
      const float r = a * a / j;
      const float vp = (-r + std::sqrt(r * r + 4.0f * d * a)) / 2.0f;
      ta = tj + vp / a;
      if (ta < 2.0f * tj) {
        // Too short to reach the acceleration limit either.
        tj = std::cbrt(d / (2.0f * j));
        ta = 2.0f * tj;
      }
    }

    const float s = distance < 0.0f ? -1.0f : 1.0f;
    dt = {tj, ta - 2.0f * tj, tj, tv, tj, ta - 2.0f * tj, tj};
    jerk = {s * j, 0.0f, -s * j, 0.0f, -s * j, 0.0f, s * j};
    for (std::size_t k = 0; k < dt.size(); ++k) start[k + 1] = advance(start[k], jerk[k], dt[k]);
    duration = 2.0f * ta + tv;
    return true;
  }

  // Position, velocity, and acceleration at time t [s] after the start.
  State at(float t) const {
    if (t <= 0.0f) return start[0];
    float t0 = 0.0f;
    for (std::size_t k = 0; k < dt.size(); ++k) {
      if (t < t0 + dt[k]) return advance(start[k], jerk[k], t - t0);
      t0 += dt[k];
    }
    return start[7];
  }

 private:
  static State advance(const State& s, float j, float h) {
    return {s.x + s.v * h + s.a * h * h / 2.0f + j * h * h * h / 6.0f,
            s.v + s.a * h + j * h * h / 2.0f,
            s.a + j * h};
  }
};
