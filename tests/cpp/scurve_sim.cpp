// Plans a move with firmware/scurve.hpp and prints the duration, then
// position, velocity, and acceleration every millisecond until 0.1 s after
// the move ends.
//
//   scurve_sim distance v_max a_max j_max
#include <cstdio>
#include <cstdlib>

#include "scurve.hpp"

int main(int argc, char** argv) {
  if (argc != 5) {
    std::fprintf(stderr, "usage: scurve_sim distance v_max a_max j_max\n");
    return 2;
  }
  Scurve s;
  if (!s.plan(std::strtof(argv[1], nullptr), std::strtof(argv[2], nullptr), std::strtof(argv[3], nullptr),
              std::strtof(argv[4], nullptr))) {
    std::fprintf(stderr, "limits must be positive\n");
    return 1;
  }
  std::printf("%.9g\n", static_cast<double>(s.duration));
  const int samples = static_cast<int>(s.duration * 1000.0f) + 100;
  for (int k = 0; k <= samples; ++k) {
    const Scurve::State st = s.at(static_cast<float>(k) * 0.001f);
    std::printf("%.9g %.9g %.9g\n", static_cast<double>(st.x), static_cast<double>(st.v), static_cast<double>(st.a));
  }
  return 0;
}
