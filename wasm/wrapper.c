#include <math.h>
#include <stdlib.h>
#include <stdbool.h>
#include <complex.h>
#include <emscripten.h>

////////////////////////////////////////////////////////////////////////////////
// Math constants and functions

#define PI 3.14159265358979323846
#define TWO_PI (PI*2)

#define COEFF_1 0.7853981633974483
#define COEFF_2 2.356194490192345
double _custom_atan2(double y, double x) {
  double abs_y = fabs(y) + 1e-10;
  double angle;
  if (x >= 0) {
    double r = (x - abs_y) / (x + abs_y);
    angle = 0.1963 * r * r * r - 0.9817 * r + COEFF_1;
  } else {
    double r = (x + abs_y) / (abs_y - x);
    angle = 0.1963 * r * r * r - 0.9817 * r + COEFF_2;
  }
  return y < 0 ? -angle : angle;
}

double r2p_angle(double x, double y) {
  return _custom_atan2(x, y);
}

double r2p_distance(double x, double y) {
  return sqrt(x*x + y*y);
}

////////////////////////////////////////////////////////////////////////////////
// Color functions

void _hsv_to_rgb(double hue, double sat, double val,
		int *red, int *green, int *blue) {
  hue = fmin(hue, 360);
  hue = fmax(hue, 0);
  sat = fmin(sat, 100);
  sat = fmax(sat, 0);
  val = fmin(val, 100);
  val = fmax(val, 0);

  double s = sat / 100;
  double v = val / 100;
  double c = s * v;
  double x = c * (1 - fabs(fmod(hue / 60.0, 2) - 1));
  double m = v - c;
  double r, g, b;
  if(hue >= 0 && hue < 60){
    r = c, g = x, b = 0;
  }
  else if(hue >= 60 && hue < 120){
    r = x, g = c, b = 0;
  }
  else if(hue >= 120 && hue < 180){
    r = 0, g = c, b = x;
  }
  else if(hue >= 180 && hue < 240){
    r = 0, g = x, b = c;
  }
  else if(hue >= 240 && hue < 300){
    r = x, g = 0, b = c;
  }
  else{
    r = c, g = 0, b = x;
  }
  *red   = (r + m) * 255;
  *green = (g + m) * 255;
  *blue  = (b + m) * 255;
}

int _convert_hsv_to_rgb(double hue, double sat, double val) {
  int red, green, blue;
  _hsv_to_rgb(hue, sat, val, &red, &green, &blue);
  return (blue  << 16)  |
         (green <<  8)  |
         (red        );
}

int make_hsv(double hue, double sat, double val) {
  return _convert_hsv_to_rgb(hue, sat, val);
}

int make_rgb(int r, int g, int b) {
  return (b << 16) | (g << 8) | (r);
}

inline int max(a, b) { return a>b ? a : b; }
inline int min(a, b) { return a<b ? a : b; }

double frand() {
  return (double)rand()/(double)RAND_MAX;
}

////////////////////////////////////////////////////////////////////////////////
// Complex domain coloring

double _complex_domain_coloring_modulate_r(double r) {
  double r2 = log(r*10+1)/log(2);
  double val = fmod(r2, 1);
  double val2 = sin(pow(1 - val, .35) * PI);  // smooth transitions
  return val2 / 2 + .5;
}

double _complex_domain_coloring_modulate_a(double a) {
  return 1 - pow(sin(a * 5), 100) /2;
}

int make_hsv_complex(double complex z) {
  double a = carg(z);
  double r = cabs(z);

  double hue = fmod(360 * 3 + a / TWO_PI * 360, 360);
  double sat = _complex_domain_coloring_modulate_a(a) * 100;
  double val = _complex_domain_coloring_modulate_r(r) * 100;
  return make_hsv(hue, sat, val);
}

////////////////////////////////////////////////////////////////////////////////
// Forward declaration of functions that must be implemented by user code

int compute_pixel(double x, double y, double t);
EMSCRIPTEN_KEEPALIVE void initialize();
bool pre_draw(double t);

////////////////////////////////////////////////////////////////////////////////
// Variables

//int* data;
int data[2000000];

const double X_MIN;
const double X_MAX;
const double Y_MIN;
const double Y_MAX;

const int HEIGHT;
const int WIDTH;
int PIXEL_COUNT;

double X_SPAN;
double Y_SPAN;

const bool NO_ANIMATION;

////////////////////////////////////////////////////////////////////////////////
// Accessors

int EMSCRIPTEN_KEEPALIVE get_width() {
  return WIDTH;
}

int EMSCRIPTEN_KEEPALIVE get_height() {
  return HEIGHT;
}

bool EMSCRIPTEN_KEEPALIVE get_no_animation() {
  return NO_ANIMATION;
}

////////////////////////////////////////////////////////////////////////////////
// Functions that can be called by user

int* EMSCRIPTEN_KEEPALIVE init() {
  PIXEL_COUNT = WIDTH * HEIGHT;
//  data = malloc(pixelCount * sizeof(int));
  return data;
}

bool __initialized = false;

int u, v;

void EMSCRIPTEN_KEEPALIVE render(double timestamp) {
  X_SPAN = X_MAX - X_MIN;
  Y_SPAN = Y_MAX - Y_MIN;

  double w = (double)WIDTH;
  double h = (double)HEIGHT;
  double t = timestamp / 200;
  int last_pixel = 0;

  if (!__initialized) {
    initialize();
    __initialized = true;
  }

  if (!pre_draw(t))
    return;

  for (v = 0; v < HEIGHT; v++) {
    int row = v * WIDTH;
    double y = Y_SPAN * (double)v / h + Y_MIN;
    for (u = 0; u < WIDTH; u++) {
      double x = X_SPAN * (double)u / w + X_MIN;
      int pixel = compute_pixel(x, y, t);
      if (pixel == -1)
	pixel = last_pixel;

      data[row + u] = (255 << 24) | pixel;
      last_pixel = pixel;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////

// User formula:
#include "formula.c"
