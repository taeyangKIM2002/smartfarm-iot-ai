import pymysql

# 1. 기준 설정 (스위트 바질 기준)
TARGET_TEMP_MIN, TARGET_TEMP_MAX = 20.0, 30.0
TARGET_HUMID_MIN, TARGET_HUMID_MAX = 50.0, 70.0
TARGET_MOIST_MIN = 50.0 # 토양 수분은 하한선이 중요

def get_latest_sensor_data(device_id):
    """DB에서 해당 기기의 가장 최근 센서 데이터를 1줄 가져옵니다."""
    try:
        conn = pymysql.connect(host='localhost', user='root', password='root', db='smartfarm', charset='utf8')
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 최신 데이터를 가져오는 SQL (measured_at 기준 내림차순 정렬 후 1개만)
        sql = """
            SELECT temperature, humidity, soil_moisture 
            FROM sensor_logs 
            WHERE device_id = %s 
            ORDER BY measured_at DESC 
            LIMIT 1
        """
        cursor.execute(sql, (device_id,))
        result = cursor.fetchone() # 딕셔너리 형태로 1줄 반환
        conn.close()
        
        return result
    except Exception as e:
        print(f"❌ DB 조회 에러: {e}")
        return None

def calculate_plant_emotion(sensor_data):
    """센서 데이터를 바탕으로 100점 만점 기준 감점 방식으로 쾌적도 점수와 표정을 계산합니다."""
    if not sensor_data:
        return "❓", "데이터 없음", 0

    temp = sensor_data['temperature']
    humid = sensor_data['humidity']
    moist = sensor_data['soil_moisture']
    
    score = 100.0

    # [감점 로직 1] 토양 수분 패널티 (생명과 직결되므로 감점 폭이 큼)
    if moist < TARGET_MOIST_MIN:
        # 10% 부족할 때마다 15점씩 감점
        score -= ((TARGET_MOIST_MIN - moist) / 10.0) * 15.0

    # [감점 로직 2] 온도 패널티
    if temp < TARGET_TEMP_MIN:
        # 1도 낮을 때마다 10점씩 감점
        score -= (TARGET_TEMP_MIN - temp) * 10.0
    elif temp > TARGET_TEMP_MAX:
        # 1도 높을 때마다 10점씩 감점
        score -= (temp - TARGET_TEMP_MAX) * 10.0

    # [감점 로직 3] 대기 습도 패널티 (비교적 스트레스가 적음)
    if humid < TARGET_HUMID_MIN:
        # 10% 낮을 때마다 5점씩 감점
        score -= ((TARGET_HUMID_MIN - humid) / 10.0) * 5.0
    elif humid > TARGET_HUMID_MAX:
        # 10% 높을 때마다 5점씩 감점
        score -= ((humid - TARGET_HUMID_MAX) / 10.0) * 5.0

    # 점수가 0점 밑으로 내려가지 않도록 방어
    score = max(0, int(score))

    # [상태 매핑] 점수에 따른 표정 및 상태 메시지 반환
    if score >= 90:
        return "🥰", "환경이 완벽해요! 쑥쑥 자라는 중", score
    elif score >= 75:
        return "😁", "양호합니다", score
    elif score >= 50:
        return "😐", "조금 불편해요 (환경 조절 중)", score
    elif score >= 30:
        return "😥", "스트레스 수치가 높습니다. 확인이 필요해요!", score
    else:
        return "😵", "위험! 긴급 조치가 필요합니다!", score

# ==========================================
# 실행 테스트
# ==========================================
if __name__ == '__main__':
    # 테스트할 기기 ID
    target_device = 'RASP_001'
    
    # 1. DB에서 가장 최근 측정값 가져오기
    latest_data = get_latest_sensor_data(target_device)
    
    if latest_data:
        print(f"📊 [측정된 데이터] 온도: {latest_data['temperature']}°C, 습도: {latest_data['humidity']}%, 수분: {latest_data['soil_moisture']}%")
        
        # 2. 감정 상태 계산하기
        emoji, status_msg, final_score = calculate_plant_emotion(latest_data)
        
        print("-" * 30)
        print(f"식물 상태: {emoji}")
        print(f"현재 점수: {final_score}점")
        print(f"메시지  : {status_msg}")
        print("-" * 30)
    else:
        print("DB에 데이터가 존재하지 않습니다. 먼저 수작업으로 INSERT를 진행해주세요.")