# ADB über WLAN - Anleitung

## WLAN-Debugging aktivieren (Android 11+)

1. **Entwickleroptionen** → **Debugging über WLAN** aktivieren
2. **Koppeln mit Kopplungscode** antippen
3. Es erscheint IP-Adresse und Port (z.B. 192.168.0.100:37853) + 6-stelliger Code

**Am PC:**
```bash
# Koppeln (nur einmalig nötig):
adb pair 192.168.0.100:37853
# Code eingeben

# Verbinden:
adb connect 192.168.0.100:5555

# Dann normal:
adb reverse tcp:5173 tcp:5173
```

## WICHTIGER HINWEIS

**Problem**: Bei WLAN-Debugging funktioniert `adb reverse` NICHT richtig!
- `adb reverse` leitet Ports über USB-Verbindung um
- Bei WLAN gibt es keine direkte Verbindung zwischen PC und Handy-Localhost

## Alternative Lösungen

### 1. USB-Debugging (EMPFOHLEN)
```bash
# Mit USB-Kabel
adb reverse tcp:5173 tcp:5173
# Am Handy: http://localhost:5173
```

### 2. Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:5173
# Nutze die generierte HTTPS-URL
```

### 3. Direkter Netzwerkzugriff
```bash
# WSL-Port-Manager Option M ausführen
# Am Handy: http://192.168.x.x:5173
# ABER: Keine Kamera ohne HTTPS!
```

## Fazit

Für Kamera-Zugriff bleiben nur:
1. **USB + adb reverse** (localhost = Secure Context)
2. **Cloudflare Tunnel** (HTTPS)
3. **Echtes SSL-Zertifikat** (Let's Encrypt)