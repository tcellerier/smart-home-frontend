# smart-home-frontend

## Description
* Provide a front end dashboard for a smart home, based on:
  * Domoticz server
  * jdigiclock
  * Meteofrance pluie à 1 heure
  * Taux d'occupation de 2 stations vélib
  * Airparif : pollution à Paris
  * Statut de 2 lignes de métro Paris

## Preview
![alt tag](screenshot.png)


## Utilisation Domoticz

### Détection présence

### Changement pile module RF
Les modules RF changent d'identifiant unique lorsque leur batterie est remplacée.
Pour conserver l'historique des données, ajouter le nouveau module dans Domoticz en lui donnant par exemple le nom 'Nouveau module'. 
Puis appuyer sur le bouton Edit de l'ancien module, sélectionner Replace et choisir le nouveau moudule ('nouveau module').
On peut maintenant renommer le nouveau momdule par son nom original 'module'
