$val = (Get-ItemProperty -Path 'HKCU:\Control Panel\Desktop').ForegroundLockTimeout
Write-Host "ForegroundLockTimeout in registry = $val ms"
