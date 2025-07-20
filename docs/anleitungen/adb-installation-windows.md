# ADB Installation für Windows

## Download & Installation

1. **Download Android SDK Platform Tools:**
   - https://developer.android.com/studio/releases/platform-tools
   - Wähle "Download SDK Platform-Tools for Windows"
   - ZIP-Datei (~40 MB)

2. **Installation:**
   - ZIP entpacken nach `C:\adb` (oder anderen Ordner)
   - Ordner enthält: `adb.exe`, `fastboot.exe`, etc.

## Für Git Bash

### Option 1: Zum PATH hinzufügen (Permanent)
```bash
# In Git Bash:
echo 'export PATH="/c/adb:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Teste:
adb --version
```

### Option 2: Direkt ausführen
```bash
# In Git Bash:
/c/adb/adb.exe devices
/c/adb/adb.exe reverse tcp:5173 tcp:5173
```

### Option 3: Alias erstellen
```bash
# In Git Bash:
echo 'alias adb="/c/adb/adb.exe"' >> ~/.bashrc
source ~/.bashrc

# Dann normal:
adb devices
adb reverse tcp:5173 tcp:5173
```

## Schnelltest

1. Handy per USB anschließen
2. USB-Debugging aktivieren
3. In Git Bash:
```bash
# Wenn im PATH:
adb devices

# Oder direkt:
/c/adb/adb.exe devices
```

Sollte zeigen:
```
List of devices attached
XXXXXXXX    device
```

## Für unser Projekt

Nach Installation in Git Bash:
```bash
# Server läuft bereits auf localhost:5173
adb reverse tcp:5173 tcp:5173

# Am Handy öffnen:
# http://localhost:5173
# Kamera funktioniert! ✅
```