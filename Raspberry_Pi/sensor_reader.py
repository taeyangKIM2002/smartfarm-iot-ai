import os
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class SoilCalibration:
    dry_raw: int = 15000
    wet_raw: int = 32000

    def to_percent(self, raw_value: int) -> float:
        if self.dry_raw == self.wet_raw:
            raise ValueError("dry_raw and wet_raw must be different")

        if self.wet_raw > self.dry_raw:
            ratio = (raw_value - self.dry_raw) / (self.wet_raw - self.dry_raw)
        else:
            ratio = (self.dry_raw - raw_value) / (self.dry_raw - self.wet_raw)
        return max(0.0, min(100.0, ratio * 100.0))

    def voltage_to_percent(self, voltage: float) -> float:
        dry_voltage = float(os.getenv("SOIL_DRY_VOLTAGE", "1.6"))
        wet_voltage = float(os.getenv("SOIL_WET_VOLTAGE", "1.05"))
        if dry_voltage == wet_voltage:
            raise ValueError("SOIL_DRY_VOLTAGE and SOIL_WET_VOLTAGE must be different")

        ratio = (dry_voltage - voltage) / (dry_voltage - wet_voltage)
        return max(0.0, min(100.0, ratio * 100.0))


@dataclass(frozen=True)
class SensorReading:
    temperature: float
    humidity: float
    soil_raw: int
    soil_moisture: float
    illuminance: int | None = None


class SensorReader:
    """Read DHT and soil moisture data, with a mock fallback for local testing."""

    def __init__(
        self,
        dht_pin: int = 4,
        dht_sensor: str | None = None,
        soil_channel: int = 0,
        light_channel: int = 1,
        calibration: SoilCalibration | None = None,
        mock: bool | None = None,
    ):
        self.dht_pin = dht_pin
        self.dht_sensor = (dht_sensor or os.getenv("SMARTFARM_DHT_SENSOR", "DHT22")).upper()
        self.adc_type = os.getenv("SMARTFARM_ADC_TYPE", "ADS1115").upper()
        self.soil_channel = soil_channel
        self.light_channel = int(os.getenv("LIGHT_ADC_CHANNEL", str(light_channel)))
        if calibration is None:
            default_dry_raw = "900" if self.adc_type == "ADS1115" else "820"
            default_wet_raw = "700" if self.adc_type == "ADS1115" else "310"
            calibration = SoilCalibration(
                dry_raw=int(os.getenv("SOIL_DRY_RAW", default_dry_raw)),
                wet_raw=int(os.getenv("SOIL_WET_RAW", default_wet_raw)),
            )
        self.calibration = calibration
        self.soil_fallback_moisture = float(os.getenv("SOIL_FALLBACK_MOISTURE", "60"))
        self.mock = mock if mock is not None else os.getenv("SMARTFARM_SENSOR_MODE", "mock") == "mock"

    def read(self) -> SensorReading:
        if self.mock:
            return self._read_mock()
        return self._read_hardware()

    def _read_mock(self) -> SensorReading:
        soil_raw = random.randint(self.calibration.wet_raw, self.calibration.dry_raw)
        return SensorReading(
            temperature=round(random.uniform(20.0, 31.5), 2),
            humidity=round(random.uniform(45.0, 78.0), 2),
            soil_raw=soil_raw,
            soil_moisture=round(self.calibration.to_percent(soil_raw), 2),
            illuminance=random.randint(150, 900),
        )

    def _read_hardware(self) -> SensorReading:
        try:
            import board
            import adafruit_dht
        except ImportError as exc:
            raise RuntimeError(
                "Hardware mode requires adafruit-circuitpython-dht and board. "
                "Set SMARTFARM_SENSOR_MODE=mock for local development."
            ) from exc

        pin_name = f"D{self.dht_pin}"
        sensor_class = adafruit_dht.DHT22 if self.dht_sensor == "DHT22" else adafruit_dht.DHT11

        temperature = None
        humidity = None
        last_error: Exception | None = None
        for _ in range(5):
            dht_device = sensor_class(getattr(board, pin_name), use_pulseio=False)
            try:
                temperature = dht_device.temperature
                humidity = dht_device.humidity
                if temperature is not None and humidity is not None:
                    break
            except RuntimeError as exc:
                last_error = exc
            finally:
                dht_device.exit()

        if temperature is None or humidity is None:
            raise RuntimeError(f"{self.dht_sensor} returned an empty reading") from last_error

        if not (-10.0 <= float(temperature) <= 60.0 and 0.0 <= float(humidity) <= 100.0):
            raise RuntimeError(f"Invalid {self.dht_sensor} reading: {temperature}C, {humidity}%")

        if self.adc_type == "MCP3008":
            soil_raw, soil_voltage = self._read_mcp3008(self.soil_channel)
            light_raw, light_voltage = self._read_mcp3008(self.light_channel)
        else:
            soil_raw, soil_voltage = self._read_ads1115(self.soil_channel)
            light_raw, light_voltage = self._read_ads1115(self.light_channel)

        default_voltage_mode = "true" if self.adc_type == "ADS1115" else "false"
        use_voltage_calibration = os.getenv("SOIL_USE_VOLTAGE", default_voltage_mode).lower() in {"1", "true", "yes"}
        if soil_voltage is not None and use_voltage_calibration:
            soil_moisture = round(self.calibration.voltage_to_percent(soil_voltage), 2)
        elif abs(soil_raw) <= 5:
            soil_moisture = self.soil_fallback_moisture
        else:
            soil_moisture = round(self.calibration.to_percent(soil_raw), 2)

        illuminance = self._raw_to_lux(light_raw, light_voltage)

        return SensorReading(
            temperature=float(temperature),
            humidity=float(humidity),
            soil_raw=soil_raw,
            soil_moisture=soil_moisture,
            illuminance=illuminance,
        )

    def _read_mcp3008(self, channel: int) -> tuple[int, float | None]:
        from gpiozero import MCP3008

        adc = MCP3008(channel=channel)
        try:
            return int(adc.value * 1023), None
        finally:
            adc.close()

    def _read_ads1115(self, channel: int) -> tuple[int, float]:
        import board
        import busio
        import adafruit_ads1x15.ads1115 as ADS
        from adafruit_ads1x15.analog_in import AnalogIn

        i2c = busio.I2C(board.SCL, board.SDA)
        ads = ADS.ADS1115(i2c)
        analog = AnalogIn(ads, channel)
        return int(analog.value), float(analog.voltage)

    def _raw_to_lux(self, raw_value: int, voltage: float | None = None) -> int | None:
        if voltage is not None:
            max_voltage = float(os.getenv("LIGHT_MAX_VOLTAGE", "3.3"))
            max_lux = int(os.getenv("LIGHT_MAX_LUX", "1200"))
            if voltage <= 0.02:
                return None
            ratio = max(0.0, min(1.0, voltage / max_voltage))
            return round(ratio * max_lux)

        if abs(raw_value) <= 5:
            return None

        dark_raw = int(os.getenv("LIGHT_DARK_RAW", "0"))
        bright_raw = int(os.getenv("LIGHT_BRIGHT_RAW", "1023"))
        max_lux = int(os.getenv("LIGHT_MAX_LUX", "1200"))
        if dark_raw == bright_raw:
            return None

        ratio = (raw_value - dark_raw) / (bright_raw - dark_raw)
        ratio = max(0.0, min(1.0, ratio))
        return round(ratio * max_lux)
