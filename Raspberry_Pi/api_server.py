import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from disease_detector import DiseaseDetector
from smartfarm_db import SmartFarmDatabase


class SmartFarmApiHandler(BaseHTTPRequestHandler):
    db = SmartFarmDatabase("DB/smartfarm.sqlite3")
    disease_detector = DiseaseDetector()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/v1/plants/current":
            self._send_json({"error": "not_found"}, status=404)
            return

        query = parse_qs(parsed.query)
        device_id = query.get("deviceId", ["RASP_001"])[0]
        latest = self.db.latest(device_id)
        if latest is None:
            self._send_json({"error": "no_sensor_data", "deviceId": device_id}, status=404)
            return

        self._send_json(
            {
                "deviceId": latest["device_id"],
                "temperature": latest["temperature"],
                "humidity": latest["humidity"],
                "soilMoisture": latest["soil_moisture"],
                "soilRaw": latest["soil_raw"],
                "illuminance": latest["illuminance"],
                "emotionStatus": latest["emotion_status"],
                "emotionMessage": latest["emotion_message"],
                "gifName": latest["gif_name"],
                "isAbnormal": bool(latest["is_abnormal"]),
                "measuredAt": latest["measured_at"],
            }
        )

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/v1/disease/analyze":
            self._send_json({"error": "not_found"}, status=404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")
            result = self.disease_detector.analyze(payload).to_dict()
            self._send_json(result)
        except Exception as exc:
            self._send_json({"error": "analysis_failed", "message": str(exc)}, status=400)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8000), SmartFarmApiHandler)
    print("SmartFarm API listening on http://0.0.0.0:8000")
    server.serve_forever()
