# WSL2 Speicher erhöhen

## 1. Erstelle/Bearbeite die Datei:
`C:\Users\mp\.wslconfig`

## 2. Füge diese Einstellungen ein:

```ini
[wsl2]
# Speicher erhöhen (Standard: 50% vom RAM)
memory=8GB

# Swap erhöhen
swap=4GB

# CPU-Kerne (optional)
processors=4

# WICHTIG: Diese Zeile NICHT einkommentieren!
# networkingMode=mirrored
```

## 3. WSL2 neu starten:

In PowerShell als Administrator:
```powershell
wsl --shutdown
```

Dann WSL neu öffnen.

## 4. Prüfen ob es funktioniert hat:

In WSL:
```bash
# Speicher prüfen
free -h

# Sollte zeigen:
#               total        used        free
# Mem:           7.8G        1.2G        6.6G
```

## Empfohlene Werte:

- **4GB RAM im PC**: memory=2GB
- **8GB RAM im PC**: memory=4GB  
- **16GB RAM im PC**: memory=8GB
- **32GB+ RAM im PC**: memory=16GB

## Alternative: Nur für diese Session

```bash
# In WSL temporär mehr Swap:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```