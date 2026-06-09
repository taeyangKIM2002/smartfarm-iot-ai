# Smart Farm Plant Disease Detection (Model Training Pipeline)

> **YOLOv4-Tiny 기반 스마트팜 바질 질병 및 해충 감지 모델 학습 및 초경량 경량화(TFLite) 파이프라인 저장소입니다.**

라즈베리 파이(Raspberry Pi)와 같은 자원이 제한된 임베디드 장치에서도 끊김 없이 실시간 진단이 가능하도록 AI 두뇌를 경량화하고, 소프트웨어 레이어에서 진단 안정성을 극대화할 수 있도록 커스텀 패치를 적용했습니다.

---

## 주요 변경 및 개선 사항 (Updates & Enhancements)

오픈소스 원본 코드의 노후화 및 임베디드 이식 시 발생하는 고질적인 문제들을 해결하기 위해 아래와 같은 핵심 코드를 직접 수정/추가했습니다.

### 1. OpenCV 최신 버전 호환성 패치 (`core/utils.py`)
- **문제 원인:** 최신 OpenCV 라이브러리에서 사각형 박스 및 텍스트를 그릴 때 소수점 좌표(`Float`)를 받지 않고 에러를 뿜는 엄격한 타입 체크 버그 발생.
- **해결 조치:** 바운딩 박스(`c1`, `c2`), 텍스트 배경 박스(`c3`), 글자 출력 좌표(`cv2.putText`) 내부의 모든 좌표 데이터를 정수형(`int`)으로 강제 형변환하여 예외 없이 시각화가 완벽히 동작하도록 수정 완료.

### 2. TFLite 변환 연산자 결손 방어 (`convert_tflite.py`)
- **문제 원인:** 모바일/임베디드용 특수 부품 라이브러리(TFLite 기본 내장 가중치)에 존재하지 않는 텐서플로우 원본 특수 연산자가 YOLO 모델에 섞여 있어 압축 시 빌드가 터지는 현상 발생.
- **해결 조치:** 변환기 스펙에 `tf.lite.OpsSet.SELECT_TF_OPS` 치트키를 주입하여, 없는 부품은 원본 텐서플로우 엔진에서 자동으로 빌려와 결합하도록 예외 처리 완료.

### 3. 다수결 투표(Majority Voting) 진단 알고리즘 도입 (`core/utils.py`)
- **문제 원인:** AI 특성상 특정 잎사귀 하나에 과적합(Overfitting)이나 오검출이 일어나 완전 깨끗한 잎임에도 질병(`diseased`) 확률을 95%로 과하게 확신하는 현상 발생.
- **해결 조치:** 단 하나의 박스에 휘둘리지 않고, 사진 속에서 감지된 **모든 잎사귀들의 개별 상태를 취합하여 다수결 투표**를 진행합니다. 가장 많은 표를 얻은 종합 결과 클래스(`healthy`, `diseased`)를 최종 결론으로 도출하며, 화면에는 승리한 클래스의 박스 중 가장 신뢰도가 높은 단 한 개의 대표 박스만 깔끔하게 노출하도록 로직을 완전 혁신했습니다.

---

## 실행 방법 (Usage)

모든 명령은 가상환경(`sf_env`)이 활성화된 터미널에서 프로젝트 최상위 폴더를 기준으로 순서대로 실행합니다.

### 1. 데이터셋 다운로드 및 압축 해제
Roboflow에서 라벨링이 완료된 바질 및 병해충 이미지 데이터를 다운로드하고 압축을 푼 뒤 임시 압축파일을 정리합니다.
```bash
curl -L "[https://app.roboflow.com/ds/OlUGigQQIX?key=nBMxwmxZyS](https://app.roboflow.com/ds/OlUGigQQIX?key=nBMxwmxZyS)" > roboflow.zip; unzip roboflow.zip; rm roboflow.zip
```

### 2. 모델 학습
```bash
python train.py --weights ./data/yolov4-tiny.weights --model yolov4 --tiny
```

### 3. TensorFlow 포맷 변환
```bash
python save_model.py --weights ./checkpoints/yolov4 --output ./checkpoints/yolov4-tiny-416 --input_size 416 --model yolov4 --tiny --framework tflite
```

### 4. TFLite 포맷 변환
```bash
python convert_tflite.py --weights ./checkpoints/yolov4-tiny-416 --output ./checkpoints/plant_disease_tiny.tflite
```

### 5. 모델 테스트(./test_image.jpg에 이미지를 넣고 아래 명령 실행)
```bash
python detect.py --weights ./checkpoints/plant_disease_tiny.tflite --size 416 --model yolov4 --image ./test_image.jpg --framework tflite --tiny
```
