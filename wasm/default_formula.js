const DEFAULT_FORMULA = `
const int WIDTH = 512;
const int HEIGHT = 512;

void initialize() {}

bool pre_draw(double t0) {
    return true;
}

int compute_pixel(double x, double y, double t) {
    return make_rgb(u, v, (u+v + (int)(t*10)) % 0xff);
}
`;
