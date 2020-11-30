#include <math.h>
#include <stdlib.h>
#include <stdbool.h>
#include <emscripten.h>

////////////////////////////////////////////////////////////////////////////////
// Math constants and functions

#define PI 3.14159265358979323846
#define TWO_PI (PI*2)

#define COEFF_1 0.7853981633974483
#define COEFF_2 2.356194490192345
double customAtan2(float y, float x) {
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

////////////////////////////////////////////////////////////////////////////////
// Color functions

int convert_hsv_to_rgb(float hue, float sat, float val) {
  hue = fmin(hue, 360);
  hue = fmax(hue, 0);
  sat = fmin(sat, 100);
  sat = fmax(sat, 0);
  val = fmin(val, 100);
  val = fmax(val, 0);

  float s = sat / 100;
  float v = val / 100;
  float c = s * v;
  float x = c * (1 - fabs(fmod(hue / 60.0, 2) - 1));
  float m = v - c;
  float r, g, b;
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
  int red   = (r + m) * 255;
  int green = (g + m) * 255;
  int blue  = (b + m) * 255;

  return (blue  << 16)  |
         (green <<  8)  |
         (red        );
}

////////////////////////////////////////////////////////////////////////////////
// Forward declaration of functions that must be implemented by user code

int compute_pixel(double x, double y, double t);
void initialize();
bool pre_draw(double t);

////////////////////////////////////////////////////////////////////////////////
// Variables

//int* data;
int data[2000000];

double X_MIN =   -1;
double X_MAX =    1;
double Y_MIN =  0.5;
double Y_MAX = -0.5;

int HEIGHT;
int WIDTH;
int PIXEL_COUNT;

double X_SPAN;
double Y_SPAN;

////////////////////////////////////////////////////////////////////////////////
// Accessors

int EMSCRIPTEN_KEEPALIVE get_width() {
  return WIDTH;
}

int EMSCRIPTEN_KEEPALIVE get_height() {
  return HEIGHT;
}

////////////////////////////////////////////////////////////////////////////////
// Functions that can be called by user

int* EMSCRIPTEN_KEEPALIVE init(int cWidth, int cHeight) {
  WIDTH = cWidth;
  HEIGHT = cHeight;
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
