import cv2
import os
import sys

video_path = r"C:\Users\santi\Videos\2026-05-19 03-02-20.mp4"
out_dir = r"C:\Users\santi\Desktop\speis\frames"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("ERROR: cannot open video")
    sys.exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = total / fps if fps else 0

print(f"FPS: {fps}")
print(f"Total frames: {total}")
print(f"Resolution: {width}x{height}")
print(f"Duration: {duration:.2f}s")

# Extract one frame every ~2 seconds
step_sec = 2.0
saved = 0
t = 0.0
while t < duration:
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ret, frame = cap.read()
    if not ret:
        break
    fname = os.path.join(out_dir, f"frame_{saved:04d}_t{int(t*1000):07d}ms.jpg")
    # downscale if very large to keep files small
    h, w = frame.shape[:2]
    if w > 1600:
        scale = 1600 / w
        frame = cv2.resize(frame, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(fname, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    saved += 1
    t += step_sec

cap.release()
print(f"Saved {saved} frames to {out_dir}")
