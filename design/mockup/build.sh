#!/usr/bin/env bash
# Concatenate the mockup sources into app.js (one IIFE, shared scope).
set -euo pipefail
cd "$(dirname "$0")"
{
  echo "/* LAMMPS Studio mockup · generated from src/*.js by build.sh, edit the sources */"
  echo "(function () {"
  echo "'use strict';"
  for f in src/*.js; do echo; echo "/* ---- $f ---- */"; cat "$f"; done
  echo "})();"
} > app.js
node --check app.js
echo "app.js: $(wc -l < app.js) lines, $(wc -c < app.js) bytes"
