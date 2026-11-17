import network
import machine
import time
import ujson
import gc

try:
    import requests as http
except ImportError:
    import urequests as http

# ---------- CHANGE THESE SETTINGS ----------
WIFI_SSID = "Anggonism"
WIFI_PASSWORD = "onetonine"

API_BASE_URL = "http://192.168.100.12:3000"
DEVICE_ID = "cabinet-esp32-01"
DEVICE_TOKEN="ba5aff3db6a7dd9701894bdecce1a0f6d9686bea91ccc2cc22674d6cfe046456"

SERVO_PIN = 18
SERVO_LOCK_ANGLE = 0       # Adjust to match the physical locked position.
SERVO_UNLOCK_ANGLE = 90    # Adjust to match the physical unlocked position.
DEFAULT_UNLOCK_MS = 1500
POLL_INTERVAL_MS = 1200
# -------------------------------------------

servo_pwm = machine.PWM(machine.Pin(SERVO_PIN), freq=50)


def servo_angle(angle):
    # 50 Hz period = 20,000 microseconds. SG90 typical pulse range 500-2500 us.
    angle = max(0, min(180, int(angle)))
    pulse_us = 500 + int((angle / 180) * 2000)
    duty = int((pulse_us / 20000) * 65535)
    servo_pwm.duty_u16(duty)


def servo_lock():
    servo_angle(SERVO_LOCK_ANGLE)
    time.sleep_ms(350)


def servo_unlock_for(duration_ms):
    duration_ms = max(500, min(5000, int(duration_ms)))
    servo_angle(SERVO_UNLOCK_ANGLE)
    time.sleep_ms(duration_ms)
    servo_lock()



def connect_wifi():
    wlan = network.WLAN(network.STA_IF)

    wlan.active(True)
    time.sleep(1)

    if wlan.isconnected():
        print("Wi-Fi already connected:", wlan.ifconfig()[0])
        return wlan

    wlan.disconnect()
    time.sleep(1)

    wlan.active(False)
    time.sleep(2)

    wlan.active(True)
    time.sleep(2)

    print("Connecting to Wi-Fi...")
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    started = time.ticks_ms()

    while not wlan.isconnected():
        if time.ticks_diff(time.ticks_ms(), started) > 20000:
            raise OSError("Wi-Fi connection timed out")
        time.sleep_ms(500)

    print("Wi-Fi connected:", wlan.ifconfig()[0])
    return wlan



def request_headers():
    return {
        "X-Device-Id": DEVICE_ID,
        "X-Device-Token": DEVICE_TOKEN,
        "Content-Type": "application/json",
    }


def get_next_command():
    response = None
    try:
        response = http.get(API_BASE_URL + "/api/device/commands/next", headers=request_headers())
        print("Backend response:", response.status_code)
        if response.status_code != 200:
            print("Command poll rejected:", response.status_code)
            return None
        payload = response.json()
        return payload.get("command")
    finally:
        if response:
            response.close()


def acknowledge(command_id, status, message):
    response = None
    try:
        body = ujson.dumps({"status": status, "message": message})
        response = http.post(
            API_BASE_URL + "/api/device/commands/" + str(command_id) + "/ack",
            data=body,
            headers=request_headers(),
        )
        if response.status_code != 200:
            print("Command acknowledgement failed:", response.status_code)
            return False
        return True
    finally:
        if response:
            response.close()


def handle_command(command):
    if not command:
        return
    command_id = command.get("id")
    # The API deliberately exposes only an unlock action, never arbitrary pin/angle commands.
    if command.get("deviceId") != DEVICE_ID or command.get("action") != "unlock" or not command_id:
        print("Ignoring malformed or unsupported command")
        return

    duration = command.get("unlockDurationMs", DEFAULT_UNLOCK_MS)
    try:
        print("Authorized unlock command:", command_id, "slot:", command.get("slot"))
        servo_unlock_for(duration)
        acknowledge(command_id, "completed", "Servo unlocked briefly and returned to locked position")
        print("Cabinet returned to locked position")
    except Exception as exc:
        # Fail safe: always attempt to return the servo to its locked position.
        try:
            servo_lock()
        except Exception:
            pass
        try:
            acknowledge(command_id, "failed", str(exc))
        except Exception:
            pass
        print("Servo command failed:", exc)


# Start in the locked position, including after a power restart.
servo_lock()
print("SHSRS ESP32 controller starting; servo is in LOCK position")

while True:
    try:
        connect_wifi()
        command = get_next_command()
        if command:
            handle_command(command)
    except Exception as error:
        # Network errors do not move the servo. It remains locked.
        print("Controller/network error:", error)
        try:
            servo_lock()
        except Exception:
            pass
        time.sleep_ms(2500)
    gc.collect()
    time.sleep_ms(POLL_INTERVAL_MS)
