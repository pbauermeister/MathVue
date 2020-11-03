For language syntax, see <http://processingjs.org/learning/>. For a
list of math functions see <http://processingjs.org/reference/>.
__________

##### Parameters

Parameter                 | Description
------------------------- | -------------------------------------------------
«int WIDTH, HEIGHT»       | Define the range of the canvas space
«float RATIO»             | If «HEIGHT» is left 0, is used to compute «HEIGHT»; if «RATIO» set to «AUTO», calculated after X/Y spans
«int X_MIN, X_MAX»        | Lower range of the parametric space
«int Y_MIN, Y_MAX»        | Upper range of the parametric space
«float TIME_INCREMENT»    | Time increment for animation
«bool CLICK_PAUSE»        | If «true», clicking canvas toggles animation on/off
«bool OUT_PAUSE»          | If «true», mouse outside canvas stops animation
«bool MOUSE_MOVE»         | If «true» and no animation, redraw frame on mouse moves
«int FRAMES»              | In animation mode, defines the number of wanted frames

Default values:
«««
WIDTH  = 300;         X_MIN = 0;
RATIO  = 4/3;         X_MAX = 1;
HEIGHT = 0;           Y_MIN = 0;
FRAMES = 0;           Y_MAX = 1/RATIO;

CLICK_PAUSE = false;  TIME_INCREMENT   = 0;
OUT_PAUSE   = true;   FIRST_FRAME_TIME = 0;
MOUSE_MOVE  = false;
»»»

If «HEIGHT» is left to 0, then it is deduced using «WIDTH» and «RATIO».

The following constants, deduced from the parametric range may be used
as constants:

Constant                  | Description
------------------------- | -------------------------------------------------
«int X_SPAN»              | Horizontal span («X_MAX - X_MIN»)
«int Y_SPAN»              | Vertical span («Y_MAX - Y_MIN»)

##### Pixel color functions

To define a pixel color, the user shall redefine either «rgb()» or
«hsb()» function, which shall return a color according to the wanted
color model, and pass «t» if animation is wanted.

The coordinates in the parametric space are passed as «x» and «y».

Function                  | Description
------------------------- | -------------------------------------------------
«color rgb(x, y)»         | No animation
«color rgb(x, y, t)»      | Animate with «TIME_INCREMENT» or 1
«color hsb(x, y)»         | No animation
«color hsb(x, y, t)»      | Animate with «TIME_INCREMENT» or 1

##### Dynamic, read-only canvas state variables

In the latter functions the following variables are available:

The system variables «width», «height».

The «u» and «v» give the coordinates of the current pixel in the
canvas space.

The variables «mouseX», «mouseY» are particularly useful for user
interaction.

All the others variables provided by
[Processing](https://processing.org/reference/) are also available.

##### Frame functions

The following function may be defined:

Function                  | Description
------------------------- | -------------------------------------------------
«bool preDraw(t)»         | Called before a frame is drawn: if it returns true, the frame is drawn.
«void postDraw(t)»        | Called after a frame is drawn

##### Examples

Example formula, providing time animation and mouse interaction:

«««
WIDTH = 200;
float RATIO = 1;
TIME_INCREMENT = 0.02;

color rgb(x, y, t) {
  x = map(x, X_MIN, X_MAX, -1, 1);          // no care for param range
  y = map(y, Y_MIN, Y_MAX, -1, 1);          // no care for param range
  float r = dist(0, 0, x, y);               // Conv. cartesian to polar
  float theta = atan2(y, x);                // Conv. cartesian to polar

  theta += t;
  r += mouseX / width;
  r = pow(r*5, 0.67);                       // squeezes center a bit
  float ampli = (int)(mouseY/height*10 +1);
  float k = sq(sin(r*PI));                  // ripples
  float l = sq(sin(theta*ampli + k*PI/4));  // wavy rays
  float res = pow(k*l, 0.25);               // thinner black areas

  return color(res*255);                    // grayscales
}
»»»

##### Happy math'ing!
