# SHSRS ESP32 + SG90 setup

This firmware controls **one shared prototype cabinet door lock**. It does not independently actuate each of the app's 12 logical reservation slots. The backend validates the full reservation QR and queues a short-lived command; the ESP32 cannot authorize a student or accept commands from the phone app directly.

## Wiring

| SG90 lead | Connect to |
|---|---|
| Brown / Black (GND) | External 5V supply GND **and** ESP32 GND (common ground) |
| Red (+5V) | Regulated external 5V supply, preferably 1A or higher |
| Orange / Yellow (signal) | ESP32 GPIO18 |

Do not power the servo from the ESP32 3V3 pin. A 470–1000 µF capacitor across the servo supply (observe polarity) can help with brief current spikes. Do not connect the external 5V positive rail to the ESP32 3V3 pin. Test the lock linkage with the cabinet door open before normal use.

## Install

1. Install MicroPython firmware on the ESP32 DevKit V1.
2. Connect the ESP32 to your PC by USB and open Thonny.
3. In Thonny's MicroPython REPL, run `import mip; mip.install("requests")` if the firmware does not already provide `requests` or `urequests`.
4. Open `main.py` and edit Wi-Fi name/password, `API_BASE_URL`, and `DEVICE_TOKEN`.
5. Set `API_BASE_URL` to your PC's Wi-Fi IPv4 address from `ipconfig`, for example `http://192.168.1.26:3000`. Do not use `localhost` on the ESP32.
6. Copy the same `ESP32_DEVICE_TOKEN` value from `server/.env` into `DEVICE_TOKEN` in `main.py`.
7. Save the file to the ESP32 as `main.py`, reset the board, and keep the PC and ESP32 on the same network.
8. Confirm the serial output shows Wi-Fi connected and the controller is polling.

The code starts the servo at its locked angle, moves to the unlock angle only after a backend command, waits briefly, then returns to the locked angle. You may need to adjust `SERVO_LOCK_ANGLE` and `SERVO_UNLOCK_ANGLE` to match your physical latch. Disconnect servo power while adjusting the linkage.

## Safety

- The app QR scanner sends the QR to Node.js. It never sends servo angles or GPIO commands.
- Node.js checks the reservation, student/user ID, slot, date, time, payment, status, maintenance flag and access window before inserting a command.
- Device commands expire after 30 seconds. The ESP32 uses a separate shared secret and device ID.
- Use this on a trusted local network for prototype testing. For deployment outside a trusted LAN, use HTTPS/VPN and protect the device secret.
- A single SG90 opens one common physical latch. It cannot select among 12 separate compartment doors.
