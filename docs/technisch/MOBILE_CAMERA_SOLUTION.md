# Mobile Kamera-Zugriff Lösung

## Problem
- Kamera funktioniert nur über HTTPS (Secure Context)
- Port-Forwarding funktioniert nur für HTTP
- Selbstsignierte Zertifikate werden abgelehnt

## Lösung: Port Forwarding über USB

### Voraussetzungen
- Android-Gerät mit USB-Debugging aktiviert
- Chrome auf dem Android-Gerät
- ADB (Android Debug Bridge) auf Windows

### Schritte

1. **USB-Debugging aktivieren** (auf Android):
   - Einstellungen → Über das Telefon → 7x auf Build-Nummer tippen
   - Entwickleroptionen → USB-Debugging aktivieren

2. **ADB installieren** (auf Windows):
   ```powershell
   # Als Administrator
   winget install Google.PlatformTools
   ```

3. **Port-Forwarding einrichten**:
   ```powershell
   # Handy per USB anschließen
   adb devices  # Gerät sollte angezeigt werden
   
   # Port-Forwarding aktivieren
   adb reverse tcp:5173 tcp:5173
   ```

4. **Auf dem Handy**:
   - Chrome öffnen
   - Zu `http://localhost:5173` navigieren
   - Kamera funktioniert! (localhost ist Secure Context)

## Alternative: Chrome Remote Debugging

1. **Chrome auf Android**: `chrome://inspect` aktivieren
2. **Chrome auf Windows**: `chrome://inspect/#devices`
3. Port-Forwarding dort direkt einrichten

## Warum das funktioniert
- `localhost` ist IMMER ein Secure Context (auch HTTP)
- ADB leitet localhost:5173 vom Handy zu Windows weiter
- Keine Zertifikate nötig!

## Für WLAN-Zugriff (komplizierter)
1. Cloudflare Tunnel (kostenlos): `cloudflared tunnel --url http://localhost:5173`
2. Oder: Echtes Zertifikat mit Let's Encrypt (braucht Domain)
3. Oder: Chrome Flag auf Desktop + Handy verbinden