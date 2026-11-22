// Origin CAD – Offline-Betrieb einschalten (eigene Datei, damit die Sicherheitsregel keine Skripte im HTML erlauben muss)
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
