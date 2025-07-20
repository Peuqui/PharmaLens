@echo off
:: WSL2 Port Manager Extended - Erweitert um zusätzliche Ports
:: Muss als Administrator ausgefuehrt werden

:: Fenstergroesse einstellen
mode con: cols=100 lines=50

:MENU
cls
echo ================================================================================
echo                           WSL2 PORT MANAGER EXTENDED
echo ================================================================================
echo.
echo  Aktuelle WSL2 IP: 
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do echo  %%i
echo.
echo  Windows IP im Netzwerk:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do echo  %%b
)
echo.
echo ================================================================================
echo.
echo  [1] Port-Weiterleitungen AKTIVIEREN (Ports: 80, 443, 3000, 5173-5179, 8080-8089)
echo.
echo  [2] Port-Weiterleitungen DEAKTIVIEREN
echo.
echo  [3] Firewall-Regeln HINZUFUEGEN (fuer Mobilzugriff)
echo.
echo  [4] Firewall-Regeln ENTFERNEN
echo.
echo  [5] STATUS anzeigen (Weiterleitungen und Firewall)
echo.
echo  [6] QUICK FIX - Alles aktivieren (Ports + Firewall)
echo.
echo  [7] ALLES ENTFERNEN (Ports + Firewall)
echo.
echo  [8] IP AKTUALISIEREN (nach WSL Neustart)
echo.
echo  [M] MOBILZUGRIFF - Spezial-Fix fuer Handys/Tablets
echo.
echo  [X] Beenden
echo.
echo ================================================================================
echo.
set /p choice="Waehle eine Option: "

if /i "%choice%"=="1" goto ENABLE_PORTS
if /i "%choice%"=="2" goto DISABLE_PORTS
if /i "%choice%"=="3" goto ENABLE_FIREWALL
if /i "%choice%"=="4" goto DISABLE_FIREWALL
if /i "%choice%"=="5" goto SHOW_STATUS
if /i "%choice%"=="6" goto QUICK_FIX
if /i "%choice%"=="7" goto REMOVE_ALL
if /i "%choice%"=="8" goto UPDATE_IP
if /i "%choice%"=="M" goto MOBILE_ACCESS
if /i "%choice%"=="X" exit
goto MENU

:ENABLE_PORTS
cls
echo ================================================================================
echo                      AKTIVIERE PORT-WEITERLEITUNGEN
echo ================================================================================
echo.
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set WSL_IP=%%i
echo WSL2 IP-Adresse: %WSL_IP%
echo.
echo Loesche alte Weiterleitungen...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>nul
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
echo.
echo Erstelle neue Weiterleitungen...
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=%WSL_IP%
echo [OK] Port 80
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=%WSL_IP%
echo [OK] Port 443
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
echo [OK] Port 3000
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy add v4tov4 listenport=%%i listenaddress=0.0.0.0 connectport=%%i connectaddress=%WSL_IP%
    echo [OK] Port %%i
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy add v4tov4 listenport=%%i listenaddress=0.0.0.0 connectport=%%i connectaddress=%WSL_IP%
    echo [OK] Port %%i
)
echo.
echo Port-Weiterleitungen aktiviert!
echo.
pause
goto MENU

:DISABLE_PORTS
cls
echo ================================================================================
echo                     DEAKTIVIERE PORT-WEITERLEITUNGEN
echo ================================================================================
echo.
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>nul
echo [OK] Port 80 entfernt
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>nul
echo [OK] Port 443 entfernt
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>nul
echo [OK] Port 3000 entfernt
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
    echo [OK] Port %%i entfernt
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
    echo [OK] Port %%i entfernt
)
echo.
echo Port-Weiterleitungen deaktiviert!
echo.
pause
goto MENU

:ENABLE_FIREWALL
cls
echo ================================================================================
echo                        AKTIVIERE FIREWALL-REGELN
echo ================================================================================
echo.
echo Loesche alte WSL2-Regeln...
powershell -Command "Get-NetFirewallRule -DisplayName '*WSL2*' | Remove-NetFirewallRule" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Development Access" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Private Network Access" 2>nul
echo.
echo Erstelle neue Firewall-Regeln...
echo.
echo [1/4] Basis-Regel fuer Development Ports...
netsh advfirewall firewall add rule name="WSL2 Development Access" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=80,443,3000,5173-5179,8080-8089 ^
    profile=any ^
    enable=yes ^
    edge=yes ^
    remoteip=any ^
    interfacetype=any
echo [OK] Basis-Regel erstellt
echo.
echo [2/4] PowerShell-Regel fuer erweiterten Zugriff...
powershell -Command "New-NetFirewallRule -DisplayName 'WSL2 Mobile Network Access' -Direction Inbound -Protocol TCP -LocalPort 80,443,3000,5173-5179,8080-8089 -Action Allow -Profile Any -EdgeTraversalPolicy Allow -RemoteAddress Any -Enabled True" 2>nul
echo [OK] Erweiterte Regel erstellt
echo.
echo [3/4] Spezielle Regel fuer privates Netzwerk (Mobilzugriff)...
netsh advfirewall firewall add rule name="WSL2 Private Network Access" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=5173 ^
    profile=private ^
    enable=yes ^
    remoteip=localsubnet
echo [OK] Private Netzwerk-Regel fuer Port 5173 erstellt
echo.
echo [4/4] Regel fuer Development Port-Bereich...
netsh advfirewall firewall add rule name="WSL2 Dev Ports 5000-5999" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=5000-5999 ^
    profile=any ^
    enable=yes
echo [OK] Port-Bereich 5000-5999 freigegeben
echo.
echo Firewall-Regeln aktiviert!
echo.
pause
goto MENU

:DISABLE_FIREWALL
cls
echo ================================================================================
echo                       DEAKTIVIERE FIREWALL-REGELN
echo ================================================================================
echo.
netsh advfirewall firewall delete rule name="WSL2 Development Access" 2>nul
echo [OK] Basis-Regel entfernt
netsh advfirewall firewall delete rule name="WSL2 Dev Ports 5000-5999" 2>nul
echo [OK] Port-Bereich Regel entfernt
powershell -Command "Get-NetFirewallRule -DisplayName '*WSL2*' | Remove-NetFirewallRule" 2>nul
echo [OK] PowerShell-Regeln entfernt
echo.
echo Firewall-Regeln deaktiviert!
echo.
pause
goto MENU

:SHOW_STATUS
cls
echo ================================================================================
echo                              AKTUELLER STATUS
echo ================================================================================
echo.
echo PORT-WEITERLEITUNGEN:
echo --------------------------------------------------------------------------------
netsh interface portproxy show all
echo.
echo.
echo FIREWALL-REGELN:
echo --------------------------------------------------------------------------------
echo Suche WSL2-Regeln...
netsh advfirewall firewall show rule name="WSL2 Development Access" 2>nul
netsh advfirewall firewall show rule name="WSL2 Private Network Access" 2>nul
netsh advfirewall firewall show rule name="WSL2 Dev Ports 5000-5999" 2>nul
echo.
echo PowerShell Firewall-Regeln:
powershell -Command "Get-NetFirewallRule | Where-Object {$_.DisplayName -like '*WSL2*'} | Select-Object DisplayName, Enabled, Profile, Direction, Action | Format-Table -AutoSize"
echo.
echo.
echo NETZWERK-PROFIL:
echo --------------------------------------------------------------------------------
powershell -Command "Get-NetConnectionProfile | Select Name, NetworkCategory"
echo.
pause
goto MENU

:QUICK_FIX
cls
echo ================================================================================
echo                     QUICK FIX - ALLES AKTIVIEREN
echo ================================================================================
echo.
call :ENABLE_PORTS_SILENT
call :ENABLE_FIREWALL_SILENT
echo.
echo ================================================================================
echo FERTIG! Alle Einstellungen aktiviert.
echo.
echo Verfuegbare Adressen:
echo - http://localhost:5173-5179
echo - http://localhost:8080-8089
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Mobilzugriff:
        echo - http://%%b:5173-5179
        echo - http://%%b:8080-8089
    )
)
echo ================================================================================
echo.
pause
goto MENU

:MOBILE_ACCESS
cls
echo ================================================================================
echo                    MOBILZUGRIFF SPEZIAL-FIX
echo ================================================================================
echo.
echo Dieser Fix behebt Probleme beim Zugriff von Mobilgeraeten...
echo.
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set WSL_IP=%%i
echo WSL2 IP: %WSL_IP%
echo.
echo [1] Entferne ALLE alten Regeln und Weiterleitungen...
call :REMOVE_ALL_SILENT
echo.
echo [2] Erstelle neue Port-Weiterleitung fuer 5173...
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=%WSL_IP%
echo [OK] Port-Weiterleitung aktiviert
echo.
echo [3] Erstelle umfassende Firewall-Regeln...
echo.
echo - Regel 1: Basis-Zugriff...
netsh advfirewall firewall add rule name="WSL2 Mobile Port 5173" dir=in action=allow protocol=TCP localport=5173 profile=any enable=yes remoteip=any
echo [OK]
echo.
echo - Regel 2: Private Netzwerke...
netsh advfirewall firewall add rule name="WSL2 Local Network 5173" dir=in action=allow protocol=TCP localport=5173 profile=private,public enable=yes remoteip=localsubnet,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12
echo [OK]
echo.
echo - Regel 3: PowerShell erweiterte Regel...
powershell -Command "New-NetFirewallRule -DisplayName 'WSL2 Mobile Dev 5173' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any -RemoteAddress Any -Enabled True -InterfaceType Any -EdgeTraversalPolicy Allow" >nul 2>&1
echo [OK]
echo.
echo [4] Aktiviere IP-Weiterleitung im System...
powershell -Command "Set-NetIPInterface -Forwarding Enabled -ErrorAction SilentlyContinue" >nul 2>&1
echo [OK]
echo.
echo [5] Test-URLs:
echo --------------------------------------------------------------------------------
echo Lokal:    http://localhost:5173
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Mobil:    http://%%b:5173
    )
)
echo.
echo WICHTIG: Falls immer noch nicht erreichbar:
echo - Windows Defender Benachrichtigungen pruefen
echo - Browser-Cache auf Mobilgeraet loeschen
echo - Private/Oeffentliche Netzwerk-Einstellung pruefen
echo ================================================================================
echo.
pause
goto MENU

:REMOVE_ALL_SILENT
netsh interface portproxy reset >nul 2>&1
powershell -Command "Get-NetFirewallRule | Where-Object {$_.DisplayName -like '*WSL2*' -or $_.DisplayName -like '*5173*'} | Remove-NetFirewallRule" >nul 2>&1
netsh advfirewall firewall delete rule name="WSL2*" >nul 2>&1
exit /b

:REMOVE_ALL
cls
echo ================================================================================
echo                    ENTFERNE ALLE EINSTELLUNGEN
echo ================================================================================
echo.
call :DISABLE_PORTS_SILENT
call :DISABLE_FIREWALL_SILENT
echo.
echo Alle WSL2-Einstellungen entfernt!
echo.
pause
goto MENU

:: Silent-Funktionen fuer Quick Fix
:ENABLE_PORTS_SILENT
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set WSL_IP=%%i
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>nul
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy add v4tov4 listenport=%%i listenaddress=0.0.0.0 connectport=%%i connectaddress=%WSL_IP%
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy add v4tov4 listenport=%%i listenaddress=0.0.0.0 connectport=%%i connectaddress=%WSL_IP%
)
echo [OK] Port-Weiterleitungen aktiviert
exit /b

:DISABLE_PORTS_SILENT
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>nul
for /L %%i in (5173,1,5179) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
for /L %%i in (8080,1,8089) do (
    netsh interface portproxy delete v4tov4 listenport=%%i listenaddress=0.0.0.0 2>nul
)
echo [OK] Port-Weiterleitungen deaktiviert
exit /b

:ENABLE_FIREWALL_SILENT
powershell -Command "Get-NetFirewallRule -DisplayName '*WSL2*' | Remove-NetFirewallRule" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Development Access" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Private Network Access" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Dev Ports 5000-5999" 2>nul
netsh advfirewall firewall add rule name="WSL2 Development Access" dir=in action=allow protocol=TCP localport=80,443,3000,5173-5179,8080-8089 profile=any enable=yes edge=yes remoteip=any interfacetype=any >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'WSL2 Mobile Network Access' -Direction Inbound -Protocol TCP -LocalPort 80,443,3000,5173-5179,8080-8089 -Action Allow -Profile Any -EdgeTraversalPolicy Allow -RemoteAddress Any -Enabled True" >nul 2>&1
netsh advfirewall firewall add rule name="WSL2 Private Network Access" dir=in action=allow protocol=TCP localport=5173 profile=private enable=yes remoteip=localsubnet >nul 2>&1
netsh advfirewall firewall add rule name="WSL2 Dev Ports 5000-5999" dir=in action=allow protocol=TCP localport=5000-5999 profile=any enable=yes >nul 2>&1
echo [OK] Firewall-Regeln aktiviert
exit /b

:DISABLE_FIREWALL_SILENT
netsh advfirewall firewall delete rule name="WSL2 Development Access" 2>nul
netsh advfirewall firewall delete rule name="WSL2 Dev Ports 5000-5999" 2>nul
powershell -Command "Get-NetFirewallRule -DisplayName '*WSL2*' | Remove-NetFirewallRule" 2>nul
echo [OK] Firewall-Regeln deaktiviert
exit /b

:UPDATE_IP
cls
echo ================================================================================
echo                          IP-ADRESSE AKTUALISIEREN
echo ================================================================================
echo.
echo Ermittle neue WSL2 IP-Adresse...
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set NEW_WSL_IP=%%i
echo Neue WSL2 IP: %NEW_WSL_IP%
echo.
echo Entferne alte Port-Weiterleitungen...
call :DISABLE_PORTS_SILENT
echo.
echo Erstelle neue Port-Weiterleitungen mit aktueller IP...
call :ENABLE_PORTS_SILENT
echo.
echo ================================================================================
echo IP-Adresse aktualisiert!
echo.
echo Verfuegbare Adressen:
echo - http://localhost:5173
echo - http://localhost:8080
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Mobilzugriff:
        echo - http://%%b:5173
        echo - http://%%b:8080
    )
)
echo ================================================================================
echo.
pause
goto MENU

:MOBILE_ACCESS
cls
echo ================================================================================
echo                    MOBILZUGRIFF SPEZIAL-FIX
echo ================================================================================
echo.
echo Dieser Fix behebt Probleme beim Zugriff von Mobilgeraeten...
echo.
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set WSL_IP=%%i
echo WSL2 IP: %WSL_IP%
echo.
echo [1] Entferne ALLE alten Regeln und Weiterleitungen...
call :REMOVE_ALL_SILENT
echo.
echo [2] Erstelle neue Port-Weiterleitung fuer 5173...
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=%WSL_IP%
echo [OK] Port-Weiterleitung aktiviert
echo.
echo [3] Erstelle umfassende Firewall-Regeln...
echo.
echo - Regel 1: Basis-Zugriff...
netsh advfirewall firewall add rule name="WSL2 Mobile Port 5173" dir=in action=allow protocol=TCP localport=5173 profile=any enable=yes remoteip=any
echo [OK]
echo.
echo - Regel 2: Private Netzwerke...
netsh advfirewall firewall add rule name="WSL2 Local Network 5173" dir=in action=allow protocol=TCP localport=5173 profile=private,public enable=yes remoteip=localsubnet,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12
echo [OK]
echo.
echo - Regel 3: PowerShell erweiterte Regel...
powershell -Command "New-NetFirewallRule -DisplayName 'WSL2 Mobile Dev 5173' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any -RemoteAddress Any -Enabled True -InterfaceType Any -EdgeTraversalPolicy Allow" >nul 2>&1
echo [OK]
echo.
echo [4] Aktiviere IP-Weiterleitung im System...
powershell -Command "Set-NetIPInterface -Forwarding Enabled -ErrorAction SilentlyContinue" >nul 2>&1
echo [OK]
echo.
echo [5] Test-URLs:
echo --------------------------------------------------------------------------------
echo Lokal:    http://localhost:5173
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Mobil:    http://%%b:5173
    )
)
echo.
echo WICHTIG: Falls immer noch nicht erreichbar:
echo - Windows Defender Benachrichtigungen pruefen
echo - Browser-Cache auf Mobilgeraet loeschen
echo - Private/Oeffentliche Netzwerk-Einstellung pruefen
echo ================================================================================
echo.
pause
goto MENU

:REMOVE_ALL_SILENT
netsh interface portproxy reset >nul 2>&1
powershell -Command "Get-NetFirewallRule | Where-Object {$_.DisplayName -like '*WSL2*' -or $_.DisplayName -like '*5173*'} | Remove-NetFirewallRule" >nul 2>&1
netsh advfirewall firewall delete rule name="WSL2*" >nul 2>&1
exit /b

:DIAGNOSE
cls
echo ================================================================================
echo                              DIAGNOSE
echo ================================================================================
echo.
echo [1] WSL2 Status:
echo --------------------------------------------------------------------------------
wsl --status 2>nul
echo.
echo [2] WSL2 IP-Adressen:
echo --------------------------------------------------------------------------------
echo WSL2 IP (von Windows aus):
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do echo %%i
echo.
echo Alternative Methode:
wsl -e bash -c "ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1" 2>nul
echo.
echo [3] Aktuelle Port-Weiterleitungen:
echo --------------------------------------------------------------------------------
netsh interface portproxy show all | findstr "5173\|80\|443\|3000\|8080"
echo.
echo [4] Test-Verbindung zu WSL2:
echo --------------------------------------------------------------------------------
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set TEST_IP=%%i
echo Teste Ping zu %TEST_IP%...
ping -n 1 %TEST_IP% >nul 2>&1
if %errorlevel%==0 (
    echo [OK] WSL2 ist erreichbar
) else (
    echo [FEHLER] WSL2 ist NICHT erreichbar!
)
echo.
echo [5] Windows Defender Firewall Status:
echo --------------------------------------------------------------------------------
netsh advfirewall show currentprofile | findstr "State"
echo.
echo [6] WSL2 Firewall-Regeln:
echo --------------------------------------------------------------------------------
netsh advfirewall firewall show rule name="WSL2*" 2>nul | findstr "Rule Name\|Enabled\|LocalPort"
echo.
echo [7] Netzwerk-Adapter:
echo --------------------------------------------------------------------------------
ipconfig | findstr "WSL\|vEthernet" -A 3
echo.
echo ================================================================================
echo.
pause
goto MENU

:MOBILE_ACCESS
cls
echo ================================================================================
echo                    MOBILZUGRIFF SPEZIAL-FIX
echo ================================================================================
echo.
echo Dieser Fix behebt Probleme beim Zugriff von Mobilgeraeten...
echo.
for /f "tokens=1" %%i in ('wsl hostname -I 2^>nul') do set WSL_IP=%%i
echo WSL2 IP: %WSL_IP%
echo.
echo [1] Entferne ALLE alten Regeln und Weiterleitungen...
call :REMOVE_ALL_SILENT
echo.
echo [2] Erstelle neue Port-Weiterleitung fuer 5173...
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=%WSL_IP%
echo [OK] Port-Weiterleitung aktiviert
echo.
echo [3] Erstelle umfassende Firewall-Regeln...
echo.
echo - Regel 1: Basis-Zugriff...
netsh advfirewall firewall add rule name="WSL2 Mobile Port 5173" dir=in action=allow protocol=TCP localport=5173 profile=any enable=yes remoteip=any
echo [OK]
echo.
echo - Regel 2: Private Netzwerke...
netsh advfirewall firewall add rule name="WSL2 Local Network 5173" dir=in action=allow protocol=TCP localport=5173 profile=private,public enable=yes remoteip=localsubnet,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12
echo [OK]
echo.
echo - Regel 3: PowerShell erweiterte Regel...
powershell -Command "New-NetFirewallRule -DisplayName 'WSL2 Mobile Dev 5173' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any -RemoteAddress Any -Enabled True -InterfaceType Any -EdgeTraversalPolicy Allow" >nul 2>&1
echo [OK]
echo.
echo [4] Aktiviere IP-Weiterleitung im System...
powershell -Command "Set-NetIPInterface -Forwarding Enabled -ErrorAction SilentlyContinue" >nul 2>&1
echo [OK]
echo.
echo [5] Test-URLs:
echo --------------------------------------------------------------------------------
echo Lokal:    http://localhost:5173
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo Mobil:    http://%%b:5173
    )
)
echo.
echo WICHTIG: Falls immer noch nicht erreichbar:
echo - Windows Defender Benachrichtigungen pruefen
echo - Browser-Cache auf Mobilgeraet loeschen
echo - Private/Oeffentliche Netzwerk-Einstellung pruefen
echo ================================================================================
echo.
pause
goto MENU

:REMOVE_ALL_SILENT
netsh interface portproxy reset >nul 2>&1
powershell -Command "Get-NetFirewallRule | Where-Object {$_.DisplayName -like '*WSL2*' -or $_.DisplayName -like '*5173*'} | Remove-NetFirewallRule" >nul 2>&1
netsh advfirewall firewall delete rule name="WSL2*" >nul 2>&1
exit /b