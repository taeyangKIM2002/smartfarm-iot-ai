import os
import cv2

def convert_roboflow_to_yolov4_repo(data_dir, output_txt_path):
    annotations = []
    # 경로 존재 여부 확인
    if not os.path.exists(data_dir):
        print(f"❌ 폴더를 찾을 수 없습니다. 현재 경로에 '{data_dir}' 폴더가 있는지 확인해주세요.")
        return

    print(f"🔄 '{data_dir}' 폴더에서 데이터 변환을 시작합니다...")

    for file in os.listdir(data_dir):
        # 이미지 파일 확장자 체크 (.jpg, .jpeg, .png 대응)
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(data_dir, file)
            txt_path = os.path.splitext(img_path)[0] + '.txt'
            
            # 쌍이 되는 라벨링(.txt) 파일이 없으면 패스
            if not os.path.exists(txt_path):
                continue
                
            img = cv2.imread(img_path)
            if img is None:
                continue
            h, w, _ = img.shape
            
            # 이미지 경로를 시작으로 데이터 저장 준비 (예: train/image_01.jpg)
            line_str = img_path
            
            with open(txt_path, 'r') as f:
                lines = f.readlines()
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) != 5:
                        continue
                    class_id = parts[0]
                    x_center, y_center, bbox_w, bbox_h = map(float, parts[1:])
                    
                    # YOLO 포맷(0~1 정규화) -> 오픈소스가 요구하는 절대 좌표(픽셀) 변환
                    xmin = int((x_center - bbox_w / 2) * w)
                    ymin = int((y_center - bbox_h / 2) * h)
                    xmax = int((x_center + bbox_w / 2) * w)
                    ymax = int((y_center + bbox_h / 2) * h)
                    
                    # 좌표가 이미지 범위를 벗어나지 않도록 안전 조치
                    xmin, ymin = max(0, xmin), max(0, ymin)
                    xmax, ymax = min(w, xmax), min(h, ymax)
                    
                    line_str += f" {xmin},{ymin},{xmax},{ymax},{class_id}"
            
            annotations.append(line_str)
            
    # 결과를 저장할 data 폴더가 없으면 자동 생성
    os.makedirs(os.path.dirname(output_txt_path), exist_ok=True)
            
    with open(output_txt_path, 'w') as f:
        f.write('\n'.join(annotations))
    print(f"🎉 {output_txt_path} 생성 완료! (변환된 이미지 수: {len(annotations)})\n")

# ✨ 핵심 변경 부분: 루트 경로에 있는 train과 valid 폴더를 바로 매핑합니다.
convert_roboflow_to_yolov4_repo('train', './data/yolov4_train.txt')
convert_roboflow_to_yolov4_repo('valid', './data/yolov4_val.txt')