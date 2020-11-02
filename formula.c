#include <math.h>
#include <stdlib.h>
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


int convert_hsv_to_rgb(float H, float S, float V) {
  if(H>360 || H<0 || S>100 || S<0 || V>100 || V<0){
    return 0;
  }
  float s = S/100;
  float v = V/100;
  float C = s*v;
  float X = C*(1-fabs(fmod(H/60.0, 2)-1));
  float m = v-C;
  float r,g,b;
  if(H >= 0 && H < 60){
    r = C, g = X, b = 0;
  }
  else if(H >= 60 && H < 120){
    r = X, g = C, b = 0;
  }
  else if(H >= 120 && H < 180){
    r = 0, g = C, b = X;
  }
  else if(H >= 180 && H < 240){
    r = 0, g = X, b = C;
  }
  else if(H >= 240 && H < 300){
    r = X, g = 0, b = C;
  }
  else{
    r = C, g = 0, b = X;
  }
  int R = (r+m)*255;
  int G = (g+m)*255;
  int B = (b+m)*255;

  return (B   << 16)  |  // B
         (G   <<  8)  |  // G
         (R        );    // R
}

void EMSCRIPTEN_KEEPALIVE render(double timestamp) {
  double w = (double)width;
  double h = (double)height;
  double t = timestamp;

  for (int v = 0; v < height; v++) {
    int vv = v * width;
    double y = Y_SPAN * (double)v / h + Y_MIN;
    for (int u = 0; u < width; u++) {
      double x = X_SPAN * (double)u / w + X_MIN;

      float radius = sqrt(x*x + y*y);  // cartesian to polar
      float angle = customAtan2(x, y) - t/8;   // cartesian to polar; turns with time

      // the spiral
      float value = angle*3 - log(radius)*12;
      value = cos(value);

      int luma = (int)((value + 1) * 127);
      int pixel = luma | luma <<8 | luma << 16;

      data[vv + u] = (255 << 24) | pixel;
    }
  }
}
