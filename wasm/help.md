### Formula instructions

The formula shall be written in C, and may use all standard C
functions and includes.
__________

###### Geometric spaces


- **The parametric space**, with real numbers coordinates. The
  function `compute_pixel(double x, double y)` gets parametric space
  coordinates as input.

- **The canvas space**, with integer coordinates corresponding to
  pixels.

  **Important limitation**: the canvas space has a maximum size of
    2'000'000 pixels. This is e.g. 1414 x 1414 pixels.

###### Frames and time

- For each current time, a frame is computed: the canvas space is
  iterated over `HEIGHT` and `WIDTH` (with variables `v` and `u`), in
  order to compute the color of each pixel, by calling
  `compute_pixel(x, y)` (where x and y are interpolated from u and v).

- In animation recording mode, the successive time stamps are
  incremented by a duration corresponding to 60 FPS.

###### Color

- The function `int compute_pixel()` shall return a 24-bit RGB color
  (like 0xbbrrgg).

- The function `make_rgb(r, g, b)` can be conveniently used in
  `compute_pixel()` to form the color integer.

- The function `make_hsv(hue, sat, val)` can be alternatively used to
  form a result from HSV color space.

###### Available additional functions

- `double frand()` :
  return a random number between 0 and 1.

- `int make_hsv(double hue, double sat, double val)` :
  return a pixel value in HSV space. Ranges:
    - hue: 0..360
    - sat: 0..100
    - val: 0..100

- `int make_rgb(int r, int g, int b)` :
  return a pixel value in RGB space. Ranges:
    - r and g and b: 0..255

- `int max(a, b)`, `int min(a, b)` :
  maximum, resp. minimum of two integers.

- `int make_hsv_complex(double complex z)` :
  return a pixel value for z in complex domain coloring; the phase is
  mapped to hue, with 10 white stripes per turn; the log of modulus is
  mapped to value, modulo 1.

- `double r2p_angle(double x, double y)` :
  return the angle in radian of cartesian coordinates [x, y].

- `double r2p_distance(double x, double y)` :
  return the radius of cartesian coordinates [x, y].

###### Functions that shall be implemented

- `int compute_pixel(double x, double y, double t)` :
  is called for each pixel in the canvas for a frame, and over time.
  shall return a pixel value, for coordinates [x, y] in parametric
  space and for time t.

- `void initialize()` :
  is called at start, before the first frame is computed.

- `bool pre_draw(double t)` :
  is call before each frame; shall return true if the frame must be
  rendered, otherwise the frame will be skipped.

###### Values that shall be defined

- `const double X_MIN`, `const double X_MAX` :
  x range in parametric space.

- `const double Y_MIN`, `const double Y_MAX` :
  y range in parametric space.

- `const int HEIGHT`, `const int WIDTH` :
  sizes, in pixels, of the canvas space.

- `const bool NO_ANIMATION` :
  may be re-defined to false to prevent animation, i.e. only the
  first frame is rendered.

###### Available readable variables

- `int PIXEL_COUNT` :
  the number of pixels in canvas space.

- `int u`, `int v` :
  the current pixel coordinates in canvas space.

- `double X_SPAN`, `double Y_SPAN` :
  horizontal and vertical sizes in parametric space.
