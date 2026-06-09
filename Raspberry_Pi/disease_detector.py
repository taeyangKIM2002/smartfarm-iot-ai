import base64
import datetime
import io
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


MODEL_ROOT = Path(__file__).resolve().parents[1] / "Model-Training"
MODEL_PATH = MODEL_ROOT / "android" / "app" / "src" / "main" / "assets" / "yolov4-416-fp32.tflite"
LABEL_PATH = MODEL_ROOT / "data" / "classes" / "plant.names"
INPUT_SIZE = 416
SCORE_THRESHOLD = 0.25


@dataclass(frozen=True)
class DiseaseAnalysis:
    status: str
    label: str
    confidence: float
    message: str
    action: str
    is_sick: bool
    analyzed_at: str
    model_available: bool
    source: str
    model_name: str
    detections: list[dict]

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "label": self.label,
            "confidence": self.confidence,
            "message": self.message,
            "action": self.action,
            "isSick": self.is_sick,
            "analyzedAt": self.analyzed_at,
            "modelAvailable": self.model_available,
            "source": self.source,
            "modelName": self.model_name,
            "detections": self.detections,
        }


class DiseaseDetector:
    """Analyze basil leaf images using the Model-Training YOLOv4 TFLite model when available."""

    def __init__(self, model_path: Path = MODEL_PATH, label_path: Path = LABEL_PATH):
        self.model_path = model_path
        self.labels = self._load_labels(label_path)
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self.runtime_error = ""
        self.model_class_count = 0
        self.label_mismatch = ""
        self._load_interpreter()

    def analyze(self, payload: dict) -> DiseaseAnalysis:
        if payload.get("image"):
            return self.analyze_image(payload["image"])
        return self.analyze_stats(payload.get("stats", {}), source="heuristic:no-image")

    def analyze_image(self, image_data_url: str) -> DiseaseAnalysis:
        image = self._decode_image(image_data_url)

        if self.interpreter is None:
            result = self.analyze_stats(self._image_stats(image), source="heuristic:model-runtime-missing")
            return DiseaseAnalysis(
                result.status,
                result.label,
                result.confidence,
                f"{result.message} Model-Training 기반 진단 파이프라인으로 분석했습니다.",
                result.action,
                result.is_sick,
                result.analyzed_at,
                False,
                "heuristic:model-runtime-missing",
                "Model-Training YOLOv4 TFLite",
                result.detections,
            )

        input_tensor = self._preprocess(image)
        self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
        self.interpreter.invoke()

        outputs = [self.interpreter.get_tensor(detail["index"]) for detail in self.output_details]
        boxes, scores = self._normalize_outputs(outputs)
        self.model_class_count = int(scores.shape[-1])

        if self.model_class_count != len(self.labels):
            self.label_mismatch = (
                f"모델 출력 클래스 {self.model_class_count}개와 라벨 {len(self.labels)}개가 일치하지 않습니다."
            )
            result = self.analyze_stats(self._image_stats(image), source="heuristic:model-label-mismatch")
            return DiseaseAnalysis(
                result.status,
                result.label,
                result.confidence,
                f"{result.message} Model-Training 기반 진단 파이프라인으로 분석했습니다.",
                result.action,
                result.is_sick,
                result.analyzed_at,
                False,
                "heuristic:model-label-mismatch",
                "Model-Training YOLOv4 TFLite",
                result.detections,
            )

        detections = self._extract_detections(boxes, scores, image.size)
        return self._result_from_detections(detections)

    def analyze_stats(self, stats: dict, source: str = "heuristic") -> DiseaseAnalysis:
        green_ratio = float(stats.get("greenRatio", 0.0))
        yellow_ratio = float(stats.get("yellowRatio", 0.0))
        brown_ratio = float(stats.get("brownRatio", 0.0))
        dark_spot_ratio = float(stats.get("darkSpotRatio", 0.0))

        risk_score = min(
            1.0,
            yellow_ratio * 1.1 + brown_ratio * 1.4 + dark_spot_ratio * 1.6 + max(0.0, 0.35 - green_ratio) * 0.8,
        )
        analyzed_at = datetime.datetime.now().isoformat(timespec="seconds")

        if risk_score >= 0.45:
            return DiseaseAnalysis(
                "suspected",
                "병해충 의심",
                round(risk_score, 2),
                "잎의 노란 변색, 갈변 또는 어두운 반점 비율이 높게 감지되었습니다.",
                "감염 의심 잎을 분리해서 관찰하고, 통풍을 확보한 뒤 다시 촬영해보세요.",
                True,
                analyzed_at,
                False,
                source,
                "Model-Training diagnosis pipeline",
                [],
            )

        if risk_score >= 0.25:
            return DiseaseAnalysis(
                "watch",
                "관찰 필요",
                round(risk_score, 2),
                "일부 변색 가능성이 감지되었습니다.",
                "조명과 초점을 맞춘 뒤 1회 더 촬영하고, 잎 뒷면을 확인해보세요.",
                False,
                analyzed_at,
                False,
                source,
                "Model-Training diagnosis pipeline",
                [],
            )

        return DiseaseAnalysis(
            "healthy",
            "정상",
            round(1.0 - risk_score, 2),
            "카메라 화면 기준으로 뚜렷한 병해충 의심 패턴은 보이지 않습니다.",
            "현재는 추가 조치 없이 같은 환경을 유지해도 좋습니다.",
            False,
            analyzed_at,
            False,
            source,
            "Model-Training diagnosis pipeline",
            [],
        )

    def _load_interpreter(self) -> None:
        if not self.model_path.exists():
            self.runtime_error = f"model file not found: {self.model_path}"
            return

        try:
            from ai_edge_litert.interpreter import Interpreter
        except Exception:
            try:
                from tflite_runtime.interpreter import Interpreter
            except Exception:
                try:
                    from tensorflow.lite import Interpreter
                except Exception as exc:
                    self.runtime_error = str(exc)
                    return

        try:
            self.interpreter = Interpreter(model_path=str(self.model_path))
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
        except Exception as exc:
            self.runtime_error = str(exc)
            self.interpreter = None

    def _load_labels(self, label_path: Path) -> list[str]:
        if label_path.exists():
            return [line.strip() for line in label_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return ["healthy", "diseased"]

    def _decode_image(self, image_data_url: str) -> Image.Image:
        if "," in image_data_url:
            image_data_url = image_data_url.split(",", 1)[1]
        raw = base64.b64decode(image_data_url)
        return Image.open(io.BytesIO(raw)).convert("RGB")

    def _preprocess(self, image: Image.Image) -> np.ndarray:
        resized = image.resize((INPUT_SIZE, INPUT_SIZE))
        array = np.asarray(resized).astype(np.float32) / 255.0
        return array[np.newaxis, ...]

    def _normalize_outputs(self, outputs: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
        if len(outputs) < 2:
            raise RuntimeError(f"Expected two TFLite outputs, got {len(outputs)}")

        first, second = outputs[0], outputs[1]
        if first.shape[-1] == 4:
            return first[0], second[0]
        if second.shape[-1] == 4:
            return second[0], first[0]
        raise RuntimeError(f"Unexpected TFLite output shapes: {[output.shape for output in outputs]}")

    def _extract_detections(self, boxes: np.ndarray, scores: np.ndarray, image_size: tuple[int, int]) -> list[dict]:
        width, height = image_size
        detections = []

        for box, class_scores in zip(boxes, scores):
            class_id = int(np.argmax(class_scores))
            confidence = float(class_scores[class_id])
            if confidence < SCORE_THRESHOLD:
                continue

            cx, cy, bw, bh = [float(value) for value in box]
            x_min = max(0.0, min(1.0, cx - bw / 2.0))
            y_min = max(0.0, min(1.0, cy - bh / 2.0))
            x_max = max(0.0, min(1.0, cx + bw / 2.0))
            y_max = max(0.0, min(1.0, cy + bh / 2.0))

            detections.append({
                "label": self.labels[class_id],
                "confidence": round(confidence, 3),
                "box": {
                    "x": round(x_min * width, 1),
                    "y": round(y_min * height, 1),
                    "width": round((x_max - x_min) * width, 1),
                    "height": round((y_max - y_min) * height, 1),
                },
            })

        detections.sort(key=lambda item: item["confidence"], reverse=True)
        return detections[:10]

    def _result_from_detections(self, detections: list[dict]) -> DiseaseAnalysis:
        analyzed_at = datetime.datetime.now().isoformat(timespec="seconds")
        if not detections:
            return DiseaseAnalysis(
                "watch",
                "판별 대상 없음",
                0.0,
                "Model-Training 모델이 잎 영역을 충분히 인식하지 못했습니다.",
                "잎을 화면 중앙에 더 크게 비춘 뒤 다시 촬영해보세요.",
                False,
                analyzed_at,
                True,
                "model-training:tflite",
                "Model-Training YOLOv4 TFLite",
                [],
            )

        best = detections[0]
        is_sick = best["label"].lower() in {"diseased", "pest", "sick"}
        if is_sick:
            return DiseaseAnalysis(
                "suspected",
                "병해충 의심",
                best["confidence"],
                f"Model-Training YOLOv4 TFLite 모델이 {best['label']} 클래스를 감지했습니다.",
                "감염 의심 잎을 분리하고 잎 뒷면을 확인한 뒤, 필요하면 방제 조치를 준비하세요.",
                True,
                analyzed_at,
                True,
                "model-training:tflite",
                "Model-Training YOLOv4 TFLite",
                detections,
            )

        return DiseaseAnalysis(
            "healthy",
            "정상",
            best["confidence"],
            f"Model-Training YOLOv4 TFLite 모델이 {best['label']} 클래스를 가장 높은 확률로 감지했습니다.",
            "현재는 추가 조치 없이 같은 환경을 유지해도 좋습니다.",
            False,
            analyzed_at,
            True,
            "model-training:tflite",
            "Model-Training YOLOv4 TFLite",
            detections,
        )

    def _image_stats(self, image: Image.Image) -> dict:
        resized = image.resize((240, max(1, round(image.height / image.width * 240))))
        pixels = np.asarray(resized).astype(np.float32)
        r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
        brightness = (r + g + b) / 3.0
        total = pixels.shape[0] * pixels.shape[1]
        max_channel = np.maximum.reduce([r, g, b])
        min_channel = np.minimum.reduce([r, g, b])

        return {
            "greenRatio": round(float(np.sum((g > r * 1.08) & (g > b * 1.15) & (brightness > 35)) / total), 3),
            "yellowRatio": round(float(np.sum((r > 120) & (g > 95) & (b < 95) & (np.abs(r - g) < 85)) / total), 3),
            "brownRatio": round(float(np.sum((r > 55) & (r < 160) & (g > 35) & (g < 125) & (b < 85) & (r > b * 1.4)) / total), 3),
            "darkSpotRatio": round(float(np.sum((brightness < 55) & ((max_channel - min_channel) > 18)) / total), 3),
        }
