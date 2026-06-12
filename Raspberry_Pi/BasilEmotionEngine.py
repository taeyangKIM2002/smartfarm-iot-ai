import datetime
from dataclasses import dataclass


@dataclass(frozen=True)
class BasilThresholds:
    temp_min: float = 15.0
    temp_max: float = 30.0
    moisture_min: float = 30.0
    moisture_max: float = 80.0
    humidity_max: float = 75.0
    sleep_start: int = 22
    sleep_end: int = 6


class BasilEmotionEngine:
    """Evaluate basil condition from calibrated sensor values."""

    GIF_BY_EMOTION = {
        "happy": "happy.gif",
        "sleepy": "sleepy.gif",
        "thirsty": "thirsty.gif",
        "overwatered": "overwatered.gif",
        "cold": "cold.gif",
        "hot": "hot.gif",
        "stuffy": "stuffy.gif",
        "sick": "sick.gif",
    }

    MESSAGE_BY_EMOTION = {
        "happy": "온도 정상, 습도 정상, 토양 수분 정상입니다.",
        "sleepy": "야간 시간대라 식물이 휴식 중입니다.",
        "thirsty": "토양 수분이 낮아 물주기 확인이 필요합니다.",
        "overwatered": "토양 수분이 높아 배수와 통풍 확인이 필요합니다.",
        "cold": "온도가 낮아 보온 확인이 필요합니다.",
        "hot": "낮 시간대 온도가 높아 환기와 차광 확인이 필요합니다.",
        "stuffy": "습도가 높아 통풍 확인이 필요합니다.",
        "sick": "병해충 의심 상태입니다. 잎 상태를 확인하세요.",
    }

    def __init__(self, thresholds: BasilThresholds | None = None):
        self.thresholds = thresholds or BasilThresholds()

    def is_night_time(self, now: datetime.datetime | None = None) -> bool:
        current_hour = (now or datetime.datetime.now()).hour
        return self.thresholds.sleep_start <= current_hour or current_hour < self.thresholds.sleep_end

    def evaluate_emotion(
        self,
        temp: float,
        humidity: float,
        moisture: float,
        is_sick_ai: bool = False,
        now: datetime.datetime | None = None,
    ) -> str:
        if is_sick_ai:
            return "sick"

        if moisture < self.thresholds.moisture_min:
            return "thirsty"
        if moisture > self.thresholds.moisture_max:
            return "overwatered"

        if temp < self.thresholds.temp_min:
            return "cold"
        if temp > self.thresholds.temp_max:
            return "hot"
        if humidity > self.thresholds.humidity_max:
            return "stuffy"

        if self.is_night_time(now):
            return "sleepy"

        return "happy"

    def build_payload(
        self,
        device_id: str,
        temperature: float,
        humidity: float,
        soil_moisture: float,
        soil_raw: int | None = None,
        illuminance: int | None = None,
        is_sick_ai: bool = False,
        measured_at: datetime.datetime | None = None,
    ) -> dict:
        measured_at = measured_at or datetime.datetime.now()
        emotion = self.evaluate_emotion(temperature, humidity, soil_moisture, is_sick_ai, measured_at)
        return {
            "deviceId": device_id,
            "temperature": round(temperature, 2),
            "humidity": round(humidity, 2),
            "soilMoisture": round(soil_moisture, 2),
            "soilRaw": soil_raw,
            "illuminance": illuminance,
            "emotionStatus": emotion,
            "emotionMessage": self.MESSAGE_BY_EMOTION[emotion],
            "gifName": self.GIF_BY_EMOTION[emotion],
            "isAbnormal": emotion in {"sick", "thirsty", "overwatered", "cold", "hot"},
            "measuredAt": measured_at.isoformat(timespec="seconds"),
        }
