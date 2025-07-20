# ADB Troubleshooting

## Häufige Probleme & Lösungen

### 1. "no devices/emulators found"

**Checklist:**
- [ ] USB-Kabel angeschlossen?
- [ ] USB-Debugging aktiviert? (Einstellungen → Entwickleroptionen)
- [ ] "USB-Debugging zulassen?" am Handy bestätigt?
- [ ] Richtiger USB-Modus? (Nicht nur "Laden")

### 2. USB-Verbindungsmodus ändern

Am Handy nach USB-Anschluss:
1. Benachrichtigung "USB für..." antippen
2. Wähle: **"Dateiübertragung/MTP"** (NICHT "Nur Laden")

### 3. Treiber Problem (Windows)

Wenn Gerät nicht erkannt wird:
1. Geräte-Manager öffnen (Win+X → Geräte-Manager)
2. Nach Gerät mit gelbem Dreieck suchen
3. Rechtsklick → "Treiber aktualisieren"
4. Oder: Google USB Driver installieren

### 4. Trust-Dialog verpasst

Am Handy:
1. Entwickleroptionen → "USB-Debugging-Autorisierungen widerrufen"
2. USB-Kabel neu einstecken
3. "USB-Debugging zulassen?" → OK + "Von diesem Computer immer zulassen"

### 5. Test-Befehle

```bash
# In Git Bash:
# 1. ADB Server neu starten
/c/adb/adb.exe kill-server
/c/adb/adb.exe start-server

# 2. Geräte auflisten
/c/adb/adb.exe devices -l

# Sollte zeigen:
# List of devices attached
# XXXXXXXX    device    product:... model:... device:... transport_id:1
```

### 6. Alternative: PowerShell

Falls Git Bash Probleme macht:
```powershell
# In PowerShell (normal, nicht Admin):
cd C:\adb
.\adb.exe devices
.\adb.exe reverse tcp:5173 tcp:5173
```

## WLAN vs USB

- **WLAN AN lassen** ist OK! 
- ADB über USB funktioniert unabhängig vom WLAN
- Beide können gleichzeitig aktiv sein

## Wenn alles fehlschlägt

Zurück zu **Cloudflare Tunnel**:
```bash
# In WSL:
cloudflared tunnel --url http://localhost:5173
# Nutze die HTTPS-URL für Kamera-Zugriff
```