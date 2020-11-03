#include <math.h>
#include <stdlib.h>
#include <stdbool.h>
#include <emscripten.h>

int height;
int width;
int pixelCount;

#define PI 3.14159265358979323846
#define TWO_PI (PI*2)

#define min(a, b)  ((a) > (b) ? (b) : (a))
#define max(a, b)  ((a) > (b) ? (a) : (b))

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

//int* data;
int data[2000000];

int* EMSCRIPTEN_KEEPALIVE init(int cWidth, int cHeight, int cFactor) {
  width = cWidth;
  height = cHeight;
  pixelCount = width * height;
//  data = malloc(pixelCount * sizeof(int));
  return data;
}

//WIDTH = 600; RATIO = 2;
const double X_MIN =   -1;
const double X_MAX =    1;
const double Y_MIN =  0.5;
const double Y_MAX = -0.5;

const double X_SPAN = X_MAX - X_MIN;
const double Y_SPAN = Y_MAX - Y_MIN;
//TIME_INCREMENT = 0.5;


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

int compute_pixel(double x, double y, double t);
bool pre_draw(double t);

void EMSCRIPTEN_KEEPALIVE render(double timestamp) {
  double w = (double)width;
  double h = (double)height;
  double t = timestamp / 200;
  int last_pixel = 0;

  if(!pre_draw(t))
    return;

  for (int v = 0; v < height; v++) {
    int row = v * width;
    double y = Y_SPAN * (double)v / h + Y_MIN;
    for (int u = 0; u < width; u++) {
      double x = X_SPAN * (double)u / w + X_MIN;
      int pixel = compute_pixel(x, y, t);
      if (pixel == -1)
	pixel = last_pixel;

      data[row + u] = (255 << 24) | pixel;
      last_pixel = pixel;
    }
  }
}

#if 1
bool pre_draw(double t) { return true; }
int compute_pixel(double x, double y, double t) {
      float radius = sqrt(x*x + y*y);  // cartesian to polar
      float angle = customAtan2(x, y) - t/8;   // cartesian to polar; turns with time

      // the spiral
      float value = angle*3 - log(radius)*12;
      value = cos(value);

      int luma = (int)((value + 1) * 127);
      int pixel = luma | luma <<8 | luma << 16;
      return pixel;
}

#else

double cos_t;
double sin_t;
bool pre_draw(double t0) {
    float t = sin(t0/320) * TWO_PI * 4 + sin(t0/20) * PI / 2 - cos(t0/40) * PI;
    cos_t = cos(t/10);
    sin_t = sin(t/10);
    return true;
}

int compute_pixel(double x, double y, double t) {
    double x1 = x * cos_t - y * sin_t;
    double y1 = y * cos_t + x * sin_t;
    if(y1==0) return -1; // avoid zero-divide

    double x2 = x1;
    double y2 = fabs(y1);

    double val = cos(1/y2 + t) * cos(x2/y2);   // perspective spots raster
    val = 1 - pow(val, 4);                     // increase contrast
    double fade = y2/Y_SPAN*2;
    val *= fade;                               // fade horizon to avoid moiree
    double color_shift = cos(t/10)/2;

    // pack all into HSV
    double z = 1 + sin(val/2); // 0..2
    double h = (z + color_shift) * 120; // 0..360
    double v = y1<0 ? 100 : 50*z;
    return convert_hsv_to_rgb(h, 78, v);
}

#endif
