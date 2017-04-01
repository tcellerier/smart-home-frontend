# smart-home-frontend

## Description
* Provide a front end dashboard for a smart home, based on:
  * [Domoticz server](https://www.domoticz.com)
  * [jdigiclock](https://github.com/tcellerier/jdigiclock)
  * Meteofrance pluie à 1 heure
  * Taux d'occupation de stations vélib
  * Airparif : pollution à Paris
  * Statut lignes de métro Paris
  * [LUA scripts](https://github.com/tcellerier/Domoticz-LUA-scripts)
  * [Python scripts](https://github.com/tcellerier/Domoticz-Python-scripts)

## Preview
![alt tag](screenshot.png)


## Utilisation Domoticz

### Détection présence
Il existe deux modes de détection de présence à paramétrer dans le script LUA [script_time_presence_ping.lua](https://github.com/tcellerier/Domoticz-LUA-scripts).
* mode 3
  * Ce mode se base sur le ping des ordinateurs (variable Domoticz Var_IP_Computer_ping) et des téléphones (variable Domoticz Var_IP_Tel_ping) pour détecter une présence
  * Ce mode dispose de 3 états :
    * Présent (vert) : état fixe pendant M minutes (à paramétrer dans le script LUA [script_time_presence_ping.lua](https://github.com/tcellerier/Domoticz-LUA-scripts)) et dans l'interface du dashboard (fichier dashboard/dashboard.js)
    * Détection (orange) : état pendant M minutes durant lequel un ping des ordintateurs / téléphones est tenté toutes les minutes. Si réussite, retour en état "Présent"
    * Absent (rouge) : un ping des ordintateurs / téléphones est tenté toutes les minutes. Si réussite, retour en état "Présent"
  * Dans ce mode, il faudra entre M et 2*M minutes pour passer d'un état présent à un état absent lors d'un départ de l'appartement
    
* mode 2
  * Ce mode se base sur le ping des ordinateurs/téléphones tel qu'en mode 3 et sur les paquets Ethernet transmis en permanence par les téléphones. Le paramétrage des adresses MAC des téléphones à détecter se fait dans le script python [presence/presence.py](https://github.com/tcellerier/Domoticz-Python-scripts)).
  * Ce mode ne dispose que de 2 états :
    * Présent (vert) : état pendant M minutes (à paramétrer dans le script LUA [script_time_presence_ping.lua](https://github.com/tcellerier/Domoticz-LUA-scripts)) et dans l'interface du dashboard (fichier dashboard/dashboard.js)
    * Absent (rouge) : un ping des ordintateurs / téléphones est tenté toutes les minutes. Si réussite, retour en état "Présent"
  * Dans ce mode, la détection d'adresse MAC remet en permance le compteur d'état de présence à 0. Si cela ne fonctionne pas, le ping en état absent permettra en complément de repasser de l'état absent à présent. 
  * Il faudra entre 1 et M minutes pour passer d'un état présent à un état absent lors d'un départ de l'appartement. En pratique, je constate qu'un iPhone non utilisé envoie un paquet Ethernet toutes les 15 minutes maximum.

* Les délais conseillés M de passage d'un état à l'autre sont :
  * 20 minutes en mode 3
  * 15 minutes en mode 2

### Changement pile module RF
Les modules RF changent d'identifiant unique lorsque leur batterie est remplacée.
Pour conserver l'historique des données du capteur, ajouter le nouveau module dans Domoticz en lui donnant par exemple le nom 'Nouveau module'. 
Puis appuyer sur le bouton Edit de l'ancien module, sélectionner Replace et choisir le nouveau moudule ('nouveau module').
On peut maintenant renommer le nouveau momdule par son nom original 'module'
