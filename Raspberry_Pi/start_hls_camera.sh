#!/usr/bin/env bash
set -euo pipefail

HLS_DIR="${SMARTFARM_HLS_DIR:-/var/www/html/hls}"
WIDTH="${SMARTFARM_CAMERA_WIDTH:-640}"
HEIGHT="${SMARTFARM_CAMERA_HEIGHT:-480}"
FPS="${SMARTFARM_CAMERA_FPS:-15}"

sudo rm -rf "$HLS_DIR"
sudo mkdir -p "$HLS_DIR"
sudo chown "$USER":"$USER" "$HLS_DIR"
chmod 755 "$HLS_DIR"

if command -v rpicam-vid >/dev/null 2>&1; then
  CAMERA_CMD=(rpicam-vid -t 0 --inline --intra "$((FPS * 2))" --width "$WIDTH" --height "$HEIGHT" --framerate "$FPS" --codec h264 -o -)
elif command -v libcamera-vid >/dev/null 2>&1; then
  CAMERA_CMD=(libcamera-vid -t 0 --inline --intra "$((FPS * 2))" --width "$WIDTH" --height "$HEIGHT" --framerate "$FPS" --codec h264 -o -)
else
  echo "Neither rpicam-vid nor libcamera-vid was found." >&2
  exit 1
fi

echo "Starting SmartFarm HLS camera"
echo "Output: ${HLS_DIR}/stream.m3u8"

"${CAMERA_CMD[@]}" | ffmpeg -hide_banner -loglevel warning -fflags nobuffer -f h264 -i - -c:v copy \
  -f hls -hls_time 2 -hls_list_size 20 \
  -hls_flags independent_segments \
  -hls_segment_filename "${HLS_DIR}/stream%d.ts" \
  "${HLS_DIR}/stream.m3u8"
