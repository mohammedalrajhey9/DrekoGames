$jdkBin = "C:\Users\Administrator\AppData\Local\Programs\Temurin\jdk-21\jdk-21.0.12.1+1\bin"
$env:PATH = $jdkBin + ";" + $env:PATH
Write-Host "Starting emulators with JDK bin (prepended): $jdkBin"
npx firebase emulators:start --only firestore,database,auth
