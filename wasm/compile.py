#!/usr/bin/python3

import sys
import tempfile
import subprocess
import base64
import os

formula = sys.argv[1]

CMD = ('emcc program.c '
#       '-Os '  # avoid optim > 2 as it wil minify the identifiers.
#       '-O3 --profiling-funcs --profiling -g3 '  # no good
       '-O2 '

       '-s WASM=1 '
       '-o out.js')

with open('wasm/formula.c') as f:
    code = f.read()

with tempfile.TemporaryDirectory(prefix='wasmCompile') as d:
    os.chdir(d)

    with open('program.c', 'w') as f:
        f.write(code)
        f.write('\n')
        f.write(formula)

    subprocess.check_call(CMD.split())

    with open('out.wasm', 'rb') as f:
        wasm = f.read()

wasm_b64 = base64.b64encode(wasm)
wasm_b64_str = wasm_b64.decode('utf-8')
print(wasm_b64_str)
