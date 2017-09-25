/*  Fonctions Dommoticz */


/********************************************/
/**********   Début du paramétrage  *********/
/********************************************/

// ID des Devices Domoticz
vDomoticzIDVoletsSalon = 45;
vDomoticzIDVoletsSalonG = 50;
vDomoticzIDVoletsSalonD = 49;
vDomoticzIDVoletsChambre = 46;
vDomoticzIDVoletsSdb = 48;
vDomoticzIDTempSalon = 107;
vDomoticzIDTempChambre = 381;
vDomoticzIDTempSdb = 108;
vDomoticzIDTempDehors = 458;
vDomoticzIDChauffageSalonAutoPresence = 105;
vDomoticzIDChauffageSalonConsigne = 86;
vDomoticzIDChauffageSalonOnOff = 23;
vDomoticzIDChauffageSalonConfort = 25;
vDomoticzIDChauffageChambreAuto = 82;
vDomoticzIDChauffageChambreConsigne = 138;
vDomoticzIDChauffageChambreOnOff = 27;
vDomoticzIDChauffageChambreConfort = 26;
vDomoticzIDChauffageSdbAuto = 82;
vDomoticzIDChauffageSdbConsigne = 139;
vDomoticzIDChauffageSdbOnOff = 33;
vDomoticzIDPrise = 6;
vDomoticzIDReveil = 52;
vDomoticzIDPowerOffPrise2h = 35;
vDomoticzIDLampeChambreColorChange = 36;
vDomoticzIDLampe = 66;
vDomoticzIDCamera = 999;

vDomoticzTelecommandeBlanc = 147;
vDomoticzTelecommandeRouge = 148;
vDomoticzTelecommandeVert = 144;
vDomoticzTelecommandeBleu = 145;
vDomoticzTelecommandeJaune = 149;
vDomoticzTelecommandeCyan = 150;
vDomoticzTelecommandeViolet = 151;
vDomoticzTelecommandeRose = 163; // Virtual Device


// Noms des variables domoticz
vDomoticzScript_Volets_chambre = "Script_Volets_chambre";
vDomoticzScript_Volets_salon_droit = "Script_Volets_salon_droit";
vDomoticzScript_Volets_salon_gauche = "Script_Volets_salon_gauche";
vDomoticzScript_Volets_sdb = "Script_Volets_sdb";
vDomoticzVar_Chauffage_sdb_Consigne = "Var_Chauffage_sdb_Consigne";
vDomoticzVar_Chauffage_salon_Consigne = "Var_Chauffage_salon_Consigne";
vDomoticzVar_Chauffage_chambre_Consigne = "Var_Chauffage_chambre_Consigne";
vDomoticzVar_Alarmclock = "Var_Alarmclock";
vDomoticzScript_Presence_Maison = "Script_Presence_Maison";
vDomoticzScript_Lamp_brightness = "Script_Lamp_brightness"
vDomoticzScript_Mode_Maison = "Script_Mode_Maison";
vDomoticzScript_Mode_Volets = "Script_Mode_Volets";
vDomoticzScript_Mode_VoletsTardifs = "Script_Mode_VoletsTardifs";

// Proxy Google App
proxyGoogleCrossOrigin = "https://script.google.com/macros/s/XXXX";

// Module Pluie 1h (API non documentée) pour le 9e, besoin d'un proxy pour le cross origin
PluieUneHeureURL = "http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/751090";

// Module Vélib
VelibAPIKey = "XXXXX"; // Clef d'identification à l'API. ATTENTION : si modification, modifier les autres scripts Velib (type page PHP sur Synology)
VelibAPIURL = "https://api.jcdecaux.com/vls/v1/stations/";

// Module AirParif (parse page html)
AirParifURL = "http://www.airparif.asso.fr";

// Module RATP, API retro engineered par Pierre Grimaud
RatpURL = "https://api-ratp.pierre-grimaud.fr/v3/traffic/metros/";
RatpLigne1 = "2";
RatpLigne2 = "12";

// Module Calendrier Google (remplacer les &amp; par &)
CalendarURL = "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&height=213&wkst=2&bgcolor=%23333333&src=XXXX&color=%231B887A&ctz=Europe%2FParis";


// Delay en minutes entre le passage d'un état de détection à un autre (ex : de présent à absent)
// Valeurs conseillées : 20 en modePresence 3, 15 en modePrésence 2
var delay_minutes = 15;  // A mettre également à jour dans script_time_presence_ping.lua

// Temps de fermeture d'un volet en secondes
vTimeVoletFermeture = 19; 

/******************************************/
/**********   Fin du paramétrage  *********/
/******************************************/


// Initialisation des paramètres du script
vDomoticzLastUpdate = ""; 
vDomoticzAPIError = 0;
vDomoticzInitSwitchJS = 0;
TimeNowServer = new Date();  // Initialisation de l'heure serveur sur l'heure du client
// Statuts pour gérer les bouton de volets (animation + bouton commun au salon)
vDomoticzVoletsSalonGaucheStatut = "unknown"; vDomoticzVoletsSalonGaucheLastUpdate = 0;
vDomoticzVoletsSalonDroitStatut = "unknown";  vDomoticzVoletsSalonDroitLastUpdate = 0;
vDomoticzVoletsSdbStatut = "unknown";  vDomoticzVoletsSdbLastUpdate = 0;
vDomoticzVoletsChambreStatut = "unknown";  vDomoticzVoletsChambreLastUpdate = 0;


/* Fonction sleep */
function sleep(milliseconds){
    var waitUntil = new Date().getTime() + milliseconds;
    while(new Date().getTime() < waitUntil) true;
}

/* Fonction générique d'appel à l'API domoticz */
function DomoticzCallAPI(JSONParam, msgInfo, msgError) {

    $.ajax({
        url: "/json.htm?" + JSONParam,
        async: true,
        dataType: "json",
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == 'OK') { // Code retour de l'API Domoticz
                if (typeof msgInfo !== 'undefined') $.notify(msgInfo);
                DomoticzGetUpdatedAll(); // On met à jour l'interface
            }
            else {
                APIConnectionError(msgError);
            } 
        },
        error: function(jqXHR, textStatus, errorThrown) {
            APIConnectionError(msgError);
        }
    });
}


/* Fonction déclenchée lors d'un problème de connexion à l'API domoticz */
function APIConnectionError(msgError) {

    // Message par défaut si pas de message en argument de la fonction
    // Attention : Ne pas mettre de valeurs par défaut pour les arguments de fonction car cela casse la vue dashboard de Mac Os (ex : function APIConnectionError(msgError="toto") )
    msgError = (typeof msgError !== 'undefined') ? msgError : "Erreur de connexion à l'API domoticz";

    if ( vDomoticzAPIError === 0) {

        vDomoticzAPIError = 1;

        $( "#presencecouleur" ).css('background', '#363636');  // Remise à zéro de l'info de présence
        $.notify(msgError, "error");
        OpenOverlayPage("/");
    }
}


/* Fonction de mise à jour des variables Domoticz */
function UpdateDomoticzVariable(Name, Value, Type, msgInfo, msgError) {

/* Types variables :
    0 = Integer, e.g. -1, 1, 0, 2, 10 
    1 = Float, e.g. -1.1, 1.2, 3.1
    2 = String
    3 = Date in format DD/MM/YYYY
    4 = Time in 24 hr format HH:MM
    5 = DateTime (but the format is not checked) */

    $.ajax({
        url: "/json.htm?type=command&param=updateuservariable&vname=" + Name + "&vtype=" + Type + "&vvalue=" + Value,
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == "OK") { // Code retour de l'API Domoticz
                if (typeof msgInfo !== 'undefined') $.notify(msgInfo);
                DomoticzGetUpdatedVariables(); // On met à jour les variables de l'interface
            }
            else {
                if (typeof msgError !== 'undefined') $.notify(msgError, "error");
                DomoticzGetUpdatedVariables(); 
            } 
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (typeof msgError !== 'undefined') $.notify(msgError, "error");
        }
    });
}


/* Fonction de mise à jour des devices via bouton switch bootstrap */
function DomoticzToggleDeviceSwitch(DomoticzDeviceIDToggle, checkboxNameToggle, nameToggle) {

    var switchNewState;

    // Si le bouton passe de OFF à ON, on met à jour le device à On dans domoticz
    if($("[name='" + checkboxNameToggle + "']").bootstrapSwitch('state') === true) 
        switchNewState = "On";
    else 
        switchNewState = "Off";

    $.ajax({
        url: "/json.htm?type=command&param=switchlight&idx=" + DomoticzDeviceIDToggle + "&switchcmd=" + switchNewState,
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == "OK") { // Code retour de l'API Domoticz
                $.notify(nameToggle + " " + switchNewState);
                 // On resynchronise la valeur Domoticz du device et la valeur du switch affichée
                DomoticzGetUpdatedDevices();
            }
            else {
                $.notify("Erreur modification état " + nameToggle, "error");
                // On resynchronise la valeur Domoticz de la variable et la valeur de la liste déroulante
                DomoticzGetUpdatedDevices();
            } 
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.notify("Erreur modification état " + nameToggle, "error");
            // On resynchronise la valeur Domoticz du device et la valeur du switch affichée
            DomoticzGetUpdatedDevices();
        }
    });
}


/* Fonction de mise à jour de la variable alarmclock*/
function DomoticzSetAlarmClockValue() {

    // Protection : on ne fait pas la mise à jour de l'heure du reveil si on n'a pas toutes les données
    if( $( "#reveil_sel_hour" ).val() == "h" || $( "#reveil_sel_hour" ).val() == "" || $( "#reveil_sel_min" ).val() == "m" || $( "#reveil_sel_min" ).val() == "" ) 
        return;

    var alarmClockValue = $( "#reveil_sel_hour" ).val() + ":" + $( "#reveil_sel_min" ).val();

    $.ajax({
        url: "/json.htm?type=command&param=updateuservariable&vname=" + vDomoticzVar_Alarmclock + "&vtype=4&vvalue=" + alarmClockValue,
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == "OK") { // Code retour de l'API Domoticz
                $.notify("Heure du réveil fixée à " + alarmClockValue);
                 // On resynchronise la valeur Domoticz de la variable et la valeur de la liste déroulante
                DomoticzGetUpdatedVariables();
            }
            else {
                $.notify("Erreur modification heure réveil", "error");
                // On resynchronise la valeur Domoticz de la variable et la valeur de la liste déroulante
                DomoticzGetUpdatedVariables();
            } 
            
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.notify("Erreur modification heure réveil", "error");
            // On resynchronise la valeur Domoticz de la variable et la valeur de la liste déroulante
            DomoticzGetUpdatedVariables();
        }
    });
}


/* Fonction pour mettre la variable presence à 1 */
function DomoticzSetPresenceOn() {

    // Si connexion à la page à distance (=HTTPS), on demande confirmation
    if (  window.location.protocol == 'https:' ) {
        if (confirmCustom("Confirmer l'activation d'une présence à la maison ?") !== true) {
            return;
        }
    }

    $.ajax({
        url: "/json.htm?type=command&param=updateuservariable&vname=Script_Presence_Maison&vtype=0&vvalue=1",
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {

            if( data.status == "OK") { // Code retour de l'API Domoticz
                $.notify("Présence dans l'appartement confirmée");
                DomoticzGetUpdatedVariables();
            }
            else {
                $.notify("Erreur modification présence", "error");
            } 
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.notify("Erreur modification présence", "error");
        }
    });


    // On log l'action
    $.getJSON("/json.htm?type=command&param=addlogmessage&message=----- LUA: Présence forcée manuellement dans l'interface web -----");

}





/* Fonction de retour des statuts des devices */
function DomoticzGetUpdatedDevices() {

    // Connexion à l'API Domoticz JSON
    $.getJSON("/json.htm?type=devices&filter=all&used=true&order=Name&plan=0&lastupdate=" + vDomoticzLastUpdate, function( data, textStatus, jqXHR ) {


        // Si l'API renvoit OK
        if( typeof data.status != "undefined" && data.status == "OK" ) {

            TimeNowServer = new Date(data.ServerTime.substring(0,4), data.ServerTime.substring(5,7) - 1, data.ServerTime.substring(8,10), data.ServerTime.substring(11,13), data.ServerTime.substring(14,16), data.ServerTime.substring(17,20) ); 
            // Variable globale de la datetime du call API pour ne récupérer que les derniers changements
            vDomoticzLastUpdate = data.ActTime
            ;  

            // On parcourt le tableau de devices
            $.each(data.result, function( Index, Device ) {

                // On sépare la gestion des scenes et des devices
                if (Device.Type == "Scene") {

                }

                else if (Device.idx == vDomoticzIDTempSalon) { 
                    $( "#tempsalon" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditesalon" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempsalonimg", "#tempsalon");
                    SetCouleurHumidite(Device.Humidity, "#humiditesalon");
                    DateTempSalon = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));

                    var MinDiffTempSalon = (TimeNowServer.getTime() - DateTempSalon.getTime()) / (60*1000);

                    if (MinDiffTempSalon < 60 * 24) // en heures
                        $( "#timetempsalon" ).text( Device.LastUpdate.substring(11,16) );  // Heure mise à jour
                    else
                        $( "#timetempsalon" ).text( Device.LastUpdate.substring(8,10) + '/' + Device.LastUpdate.substring(5,7) ); // Date mise à jour
                }

                else if (Device.idx == vDomoticzIDTempChambre) {
                    $( "#tempchambre" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditechambre" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempchambreimg", "#tempchambre");
                    SetCouleurHumidite(Device.Humidity, "#humiditechambre");
                    DateTempChambre = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
    
                    var MinDiffTempChambre = (TimeNowServer.getTime() - DateTempChambre.getTime()) / (60*1000);

                    if(MinDiffTempChambre < 60 * 24) // en heures
                        $( "#timetempchambre" ).text( Device.LastUpdate.substring(11,16) );   // Heure mise à jour
                    else
                        $( "#timetempchambre" ).text( Device.LastUpdate.substring(8,10) + '/' + Device.LastUpdate.substring(5,7) ); // Date mise à jour 
                }

                else if (Device.idx == vDomoticzIDTempSdb) {
                    $( "#tempsdb" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditesdb" ).text( Device.Humidity  + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempsdbimg", "#tempsdb");
                    SetCouleurHumidite(Device.Humidity, "#humiditesdb");
                    DateTempSdb = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                
                    var MinDiffTempsSdb = (TimeNowServer.getTime() - DateTempSdb.getTime()) / (60*1000);

                    if (MinDiffTempsSdb < 60 * 24) // en heures
                        $( "#timetempsdb" ).text( Device.LastUpdate.substring(11,16) ); // Heure mise à jour
                    else
                        $( "#timetempsdb" ).text( Device.LastUpdate.substring(8,10) + '/' + Device.LastUpdate.substring(5,7) ); // Date mise à jour 
                }

                else if (Device.idx == vDomoticzIDTempDehors) {
                    $( "#tempdehors" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditedehors" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempdehorsimg", "#tempdehors");
                    SetCouleurHumidite(Device.Humidity, "#humiditedehors");
                    DateTempDehors = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                    
                    var MinDiffTempsDehors = (TimeNowServer.getTime() - DateTempDehors.getTime()) / (60*1000);

                    if (MinDiffTempsDehors < 60 * 24) // en heures
                        $( "#timetempdehors" ).text( Device.LastUpdate.substring(11,16) );  // Heure mise à jour
                    else
                        $( "#timetempdehors" ).text( Device.LastUpdate.substring(8,10) + '/' + Device.LastUpdate.substring(5,7) ); // Date mise à jour 
                }



                else if (Device.idx == vDomoticzIDVoletsSalonG && Device.LastUpdate != vDomoticzVoletsSalonGaucheLastUpdate) { // On s'assure que l'action n'est pas transmise 2 fois
                    
                    vDomoticzVoletsSalonGaucheLastUpdate = Device.LastUpdate;
                    var TimeVoletSalonGParts = Device.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVoletSalonG = new Date(parseInt(TimeVoletSalonGParts[1]), parseInt(TimeVoletSalonGParts[2]) - 1, parseInt(TimeVoletSalonGParts[3]), parseInt(TimeVoletSalonGParts[4]), parseInt(TimeVoletSalonGParts[5]), parseInt(TimeVoletSalonGParts[6]));
                    var TimeDiffVoletSalonG = Math.floor( (TimeNowServer.getTime() - TimeVoletSalonG.getTime()) / 1000 ) ; // Secondes depuis la dernière action sur le volet
                    
                    if(Device.Status == "Open") {
                        $( "#voletssalongaucheup" ).css( "color", "DarkGrey" ); 
                        $( "#voletssalongauchedown" ).css( "color", "Black" ); 
                        if(TimeDiffVoletSalonG < vTimeVoletFermeture && (vDomoticzVoletsSalonGaucheStatut == 'closed' || vDomoticzVoletsSalonGaucheStatut == 'unknown')) { // Clignotement du bouton
                            vDomoticzVoletsSalonGaucheStatut = 'opening';
                            EffetJSMouvementVolet( 'voletssalongaucheup', 'open', vTimeVoletFermeture - TimeDiffVoletSalonG);
                        }
                        else 
                            vDomoticzVoletsSalonGaucheStatut = 'open';
                    }
                    else {
                        $( "#voletssalongaucheup" ).css( "color", "Black" ); 
                        $( "#voletssalongauchedown" ).css( "color", "DarkGrey" ); 
                        if(TimeDiffVoletSalonG < vTimeVoletFermeture && (vDomoticzVoletsSalonGaucheStatut == 'open' || vDomoticzVoletsSalonGaucheStatut == 'unknown')) { // Clignotement du bouton
                            vDomoticzVoletsSalonGaucheStatut = 'closing';
                            EffetJSMouvementVolet( 'voletssalongauchedown', 'closed', vTimeVoletFermeture - TimeDiffVoletSalonG);
                        }
                        else
                            vDomoticzVoletsSalonGaucheStatut = 'closed';
                    }   
                }
                else if (Device.idx == vDomoticzIDVoletsSalonD && Device.LastUpdate != vDomoticzVoletsSalonDroitLastUpdate) {   // On s'assure que l'action n'est pas transmise 2 fois

                    vDomoticzVoletsSalonDroitLastUpdate = Device.LastUpdate;
                    var TimeVoletSalonDParts = Device.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVoletSalonD = new Date(parseInt(TimeVoletSalonDParts[1]), parseInt(TimeVoletSalonDParts[2]) - 1, parseInt(TimeVoletSalonDParts[3]), parseInt(TimeVoletSalonDParts[4]), parseInt(TimeVoletSalonDParts[5]), parseInt(TimeVoletSalonDParts[6]));
                    var TimeDiffVoletSalonD = Math.floor( (TimeNowServer.getTime() - TimeVoletSalonD.getTime()) / 1000 ) ; // Secondes depuis la dernière action sur le volet
                    
                    if(Device.Status == "Open") {
                        $( "#voletssalondroitup" ).css( "color", "DarkGrey" ); 
                        $( "#voletssalondroitdown" ).css( "color", "Black" ); 
                        if(TimeDiffVoletSalonD < vTimeVoletFermeture && (vDomoticzVoletsSalonDroitStatut == 'closed' || vDomoticzVoletsSalonDroitStatut == 'unknown')) { // Clignotement du bouton  
                            vDomoticzVoletsSalonDroitStatut = "opening";
                            EffetJSMouvementVolet( 'voletssalondroitup', 'open', vTimeVoletFermeture - TimeDiffVoletSalonD);
                        }
                        else
                            vDomoticzVoletsSalonDroitStatut = 'open';
                    }
                    else {
                         $( "#voletssalondroitup" ).css( "color", "Black" ); 
                         $( "#voletssalondroitdown" ).css( "color", "DarkGrey" ); 
                         if(TimeDiffVoletSalonD < vTimeVoletFermeture && (vDomoticzVoletsSalonDroitStatut == 'open' || vDomoticzVoletsSalonDroitStatut == 'unknown')) { // Clignotement du bouton  
                            vDomoticzVoletsSalonDroitStatut = "closing";
                            EffetJSMouvementVolet( 'voletssalondroitdown', 'closed', vTimeVoletFermeture - TimeDiffVoletSalonD);
                        }
                        else
                            vDomoticzVoletsSalonDroitStatut = "closed";
                    }
                }
                else if (Device.idx  == vDomoticzIDVoletsChambre && Device.LastUpdate != vDomoticzVoletsChambreLastUpdate) { // On s'assure que l'action n'est pas transmise 2 fois

                    vDomoticzVoletsChambreLastUpdate = Device.LastUpdate;
                    var TimeVoletChambreParts = Device.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVoletChambre = new Date(parseInt(TimeVoletChambreParts[1]), parseInt(TimeVoletChambreParts[2]) - 1, parseInt(TimeVoletChambreParts[3]), parseInt(TimeVoletChambreParts[4]), parseInt(TimeVoletChambreParts[5]), parseInt(TimeVoletChambreParts[6]));
                    var TimeDiffVoletChambre = Math.floor( (TimeNowServer.getTime() - TimeVoletChambre.getTime()) / 1000 ) ; // Secondes depuis la dernière action sur le volet

                    if(Device.Status == "Open") {
                        $( "#voletchambreup" ).css( "color", "DarkGrey" ); 
                        $( "#voletchambredown" ).css( "color", "Black" ); 
                        if(TimeDiffVoletChambre < vTimeVoletFermeture  && (vDomoticzVoletsChambreStatut == 'closed' || vDomoticzVoletsChambreStatut == 'unknown')) { // Clignotement du bouton
                            vDomoticzVoletsChambreStatut = "opening";
                            EffetJSMouvementVolet( 'voletchambreup', 'open', vTimeVoletFermeture - TimeDiffVoletChambre);
                        }
                        else
                            vDomoticzVoletsChambreStatut = "open";
                    }
                    else {
                        $( "#voletchambreup" ).css( "color", "Black" ); 
                        $( "#voletchambredown" ).css( "color", "DarkGrey" ); 
                        if(TimeDiffVoletChambre < vTimeVoletFermeture && (vDomoticzVoletsChambreStatut == 'open' || vDomoticzVoletsChambreStatut == 'unknown')) { // Clignotement du bouton  
                            vDomoticzVoletsChambreStatut = "closing";  
                            EffetJSMouvementVolet( 'voletchambredown', 'closed', vTimeVoletFermeture - TimeDiffVoletChambre);
                        }
                        else
                            vDomoticzVoletsChambreStatut = "closed";
                    }
                }
                else if (Device.idx == vDomoticzIDVoletsSdb && Device.LastUpdate != vDomoticzVoletsSdbLastUpdate) { // On s'assure que l'action n'est pas transmise 2 fois

                    vDomoticzVoletsSdbLastUpdate = Device.LastUpdate;
                    var TimeVoletSdbParts = Device.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVoletSdb = new Date(parseInt(TimeVoletSdbParts[1]), parseInt(TimeVoletSdbParts[2]) - 1, parseInt(TimeVoletSdbParts[3]), parseInt(TimeVoletSdbParts[4]), parseInt(TimeVoletSdbParts[5]), parseInt(TimeVoletSdbParts[6]));
                    var TimeDiffVoletSdb = Math.floor( (TimeNowServer.getTime() - TimeVoletSdb.getTime()) / 1000 ) ; // Secondes depuis la dernière action sur le volet

                    if(Device.Status == "Open") {
                        $( "#voletsdbup" ).css( "color", "DarkGrey" ); 
                        $( "#voletsdbdown" ).css( "color", "Black" ); 
                        if(TimeDiffVoletSdb < vTimeVoletFermeture && (vDomoticzVoletsSdbStatut == 'closed' || vDomoticzVoletsSdbStatut == 'unknown')) { // Clignotement du bouton  
                            vDomoticzVoletsSdbStatut = "opening";
                            EffetJSMouvementVolet( 'voletsdbup', 'open', vTimeVoletFermeture - TimeDiffVoletSdb);
                        }
                        else
                            vDomoticzVoletsSdbStatut = "open";
                    }
                    else {
                        $( "#voletsdbup" ).css( "color", "Black" ); 
                        $( "#voletsdbdown" ).css( "color", "DarkGrey" ); 
                        if(TimeDiffVoletSdb < vTimeVoletFermeture && (vDomoticzVoletsSdbStatut == 'open' || vDomoticzVoletsSdbStatut == 'unknown')) { // Clignotement du bouton 
                            vDomoticzVoletsSdbStatut = "closing";  
                            EffetJSMouvementVolet( 'voletsdbdown', 'closed', vTimeVoletFermeture - TimeDiffVoletSdb);
                        }
                        else
                            vDomoticzVoletsSdbStatut = "closed";
                    }
                }
                

                else if (Device.idx == vDomoticzIDChauffageSalonAutoPresence) {
                    if(Device.Status == "On") {
                        $( "#chauffagesalonautopresence" ).attr('class', 'btn btn-success btn-lg');
                    }
                    else {
                        $( "#chauffagesalonautopresence" ).attr('class', 'btn btn-default btn-lg');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageSalonConsigne) {
                    if(Device.Status == "On") {
                        $( "#chauffagesalonconsigne" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');
                        $( "#chauffagesalonmanuel" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                    }
                    else {
                        $( "#chauffagesalonconsigne" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                        $( "#chauffagesalonmanuel" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageSalonOnOff) {
                    if(Device.Status == "On") {
                        $( "#chauffagesalononff" ).attr('class', 'btn btn-primary btn-lg');
                        $( "#chauffagesalononff" ).text( "On" );

                        if ($( "#chauffagesalonconfort" ).text() == 'Confort') 
                            $( "#chauffagesalonconfort" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');
                        else
                            $( "#chauffagesalonconfort" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                    }
                    else {
                        $( "#chauffagesalononff" ).attr('class', 'btn btn-default btn-lg');
                        $( "#chauffagesalononff" ).text( "Off" );

                        $( "#chauffagesalonconfort" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageSalonConfort) {
                    if(Device.Status == "On") {
                        if ($( "#chauffagesalononff" ).text() == 'On')
                            $( "#chauffagesalonconfort" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');

                        $( "#chauffagesalonconfort" ).text( "Confort" );
                    }
                    else {
                        if ($( "#chauffagesalononff" ).text() == 'On')
                            $( "#chauffagesalonconfort" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                        
                        $( "#chauffagesalonconfort" ).text( "Eco" );
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageChambreAuto || Device.idx == vDomoticzIDChauffageSdbAuto) {
                    if(Device.Status == "On") {
                        $( "#chauffagechambreauto" ).attr('class', 'btn btn-success btn-lg');

                        $( "#chauffagesdbauto" ).attr('class', 'btn btn-success btn-lg');
                    }
                    else {
                        $( "#chauffagechambreauto" ).attr('class', 'btn btn-default btn-lg');

                        $( "#chauffagesdbauto" ).attr('class', 'btn btn-default btn-lg');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageChambreConsigne) {
                    if(Device.Status == "On") {
                        $( "#chauffagechambreconsigne" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');
                        $( "#chauffagechambremanuel" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                    }
                    else {
                        $( "#chauffagechambreconsigne" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                        $( "#chauffagechambremanuel" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageChambreOnOff) {
                    if(Device.Status == "On") {
                        $( "#chauffagechambreonoff" ).attr('class', 'btn btn-primary btn-lg');
                        $( "#chauffagechambreonoff" ).text( "On" );

                        if ($( "#chauffagechambreconfort" ).text() == 'Confort') 
                            $( "#chauffagechambreconfort" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');
                        else
                            $( "#chauffagechambreconfort" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                    }
                    else {
                        $( "#chauffagechambreonoff" ).attr('class', 'btn btn-default btn-lg');
                        $( "#chauffagechambreonoff" ).text( "Off" );

                        $( "#chauffagechambreconfort" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageChambreConfort) {
                    if(Device.Status == "On") {
                        if ($( "#chauffagechambreonoff" ).text() == 'On')
                            $( "#chauffagechambreconfort" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');

                        $( "#chauffagechambreconfort" ).text( "Confort" );
                    }
                    else {
                        if ($( "#chauffagechambreonoff" ).text() == 'On')
                            $( "#chauffagechambreconfort" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');

                        $( "#chauffagechambreconfort" ).text( "Eco" );
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageSdbConsigne) {
                    if(Device.Status == "On") {
                        $( "#chauffagesdbconsigne" ).attr('class', 'btn btn-primary btn-lg btn-lowpadding');
                        $( "#chauffagesdbmanuel" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                    }
                    else {
                        $( "#chauffagesdbconsigne" ).attr('class', 'btn btn-default btn-lg btn-lowpadding');
                        $( "#chauffagesdbmanuel" ).attr('class', 'btn btn-info btn-lg btn-lowpadding');
                    }
                }
                else if (Device.idx == vDomoticzIDChauffageSdbOnOff) {
                    if(Device.Status == "On") {
                        $( "#chauffagesdbonoff" ).attr('class', 'btn btn-primary btn-lg');
                        $( "#chauffagesdbonoff" ).text( "On" );
                    }
                    else {
                        $( "#chauffagesdbonoff" ).attr('class', 'btn btn-default btn-lg');
                        $( "#chauffagesdbonoff" ).text( "Off" );
                    }
                }

                else if (Device.idx == vDomoticzIDPrise) {
                    if (Device.Status == "On") {
                        $("[name='prise-checkbox']").bootstrapSwitch('state', true);
                    }
                    else {
                        $("[name='prise-checkbox']").bootstrapSwitch('state', false);
                    }
                }
                
                else if (Device.idx == vDomoticzIDReveil) {
                    if(Device.Status == "On") {
                        $("[name='reveil-checkbox']").bootstrapSwitch('state', true);
                    }
                    else {
                        $("[name='reveil-checkbox']").bootstrapSwitch('state', false);
                    }
                }

                else if (Device.idx == vDomoticzIDCamera) {
                    if(Device.Status == "On") {
                        $( "#cameraonoff" ).attr('class', 'btn btn-danger btn-md');
                        $( "#cameraonoff" ).text( "Caméra ON" );
                    }
                    else {
                        $( "#cameraonoff" ).attr('class', 'btn btn-default btn-md');
                        $( "#cameraonoff" ).text( "Caméra OFF" );
                    }
                }

                else if (Device.idx == vDomoticzIDPowerOffPrise2h) {
                }
                else if (Device.idx == vDomoticzIDLampeChambreColorChange) {
                }

            });


                    
             // Gestion de l'affichage du bouton commun central des 2 volets
            if(vDomoticzVoletsSalonDroitStatut == 'open' && vDomoticzVoletsSalonGaucheStatut == 'open') { 
                $( "#voletssalonup" ).css( "color", "DarkGrey" ); 
                $( "#voletssalondown" ).css( "color", "Black" ); 
            }
            else if(vDomoticzVoletsSalonDroitStatut == 'closed' && vDomoticzVoletsSalonGaucheStatut == 'closed') { 
                $( "#voletssalonup" ).css( "color", "Black" ); 
                $( "#voletssalondown" ).css( "color", "DarkGrey" ); 
            }
            else {
                $( "#voletssalonup" ).css( "color", "Black" ); 
                $( "#voletssalondown" ).css( "color", "Black" );  
            }


            // Mise à jour de la couleur des heures de rafraichissement des températures à chaque chargement des données
            var MinDiffTempSalon = (TimeNowServer.getTime() - DateTempSalon.getTime()) / (60*1000);
            if( MinDiffTempSalon < 10) // 10 min
                $( "#timetempsalon" ).css( "color", "grey" );
            else if (MinDiffTempSalon < 60)
                $( "#timetempsalon" ).css( "color", "orange" );
            else
                $( "#timetempsalon" ).css( "color", "red" );

            var MinDiffTempChambre = (TimeNowServer.getTime() - DateTempChambre.getTime()) / (60*1000);
            if( MinDiffTempChambre < 10) // 10 min
                $( "#timetempchambre" ).css( "color", "grey" );
            else if (MinDiffTempChambre < 60)
                $( "#timetempchambre" ).css( "color", "orange" );
            else
                $( "#timetempchambre" ).css( "color", "red" );

            var MinDiffTempsSdb = (TimeNowServer.getTime() - DateTempSdb.getTime()) / (60*1000);
            if( MinDiffTempsSdb < 10) // 10 min
                $( "#timetempsdb" ).css( "color", "grey" );
            else if (MinDiffTempsSdb < 60)
                $( "#timetempsdb" ).css( "color", "orange" );
            else
                $( "#timetempsdb" ).css( "color", "red" ); 

            var MinDiffTempsDehors = (TimeNowServer.getTime() - DateTempDehors.getTime()) / (60*1000);
            if( MinDiffTempsDehors < 10) // 10 min
                $( "#timetempdehors" ).css( "color", "grey" );
            else if (MinDiffTempsDehors < 60)
                $( "#timetempdehors" ).css( "color", "orange" );
            else
                $( "#timetempdehors" ).css( "color", "red" );


            // On active le JS des boutons switch à la fin pour éviter qu'ils soient exécutés trop tôt (et qu'un call json de modification soit exécuté)
            if (vDomoticzInitSwitchJS === 0) { 

                $('input[name="prise-checkbox"]').on('switchChange.bootstrapSwitch', function(event, state) {
                    DomoticzToggleDeviceSwitch(vDomoticzIDPrise, 'prise-checkbox', 'Prise Fibaro');
                });
                $('input[name="reveil-checkbox"]').on('switchChange.bootstrapSwitch', function(event, state) {
                    DomoticzToggleDeviceSwitch(vDomoticzIDReveil, 'reveil-checkbox', 'Réveil');
                });
                vDomoticzInitSwitchJS = 1;
            }
        }

        else { // Json invalide
              
            APIConnectionError();
        }
    })
    
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion à l'API
            
            APIConnectionError();
        });
}




/* Fonction de retour des valeurs des variables */
function DomoticzGetUpdatedVariables() {

    // Connexion à l'API Domoticz JSON des variables
    $.getJSON("/json.htm?type=command&param=getuservariables", function( data, textStatus, jqXHR ) {

        // Si l'API renvoit OK
        if( typeof data.status != "undefined" && data.status == "OK" ) {                

            // On parcourt le tableau de variable
            $.each(data.result, function( Index, Variable ) {

                if (Variable.Name == vDomoticzScript_Mode_Maison) {
                    if(Variable.Value == "auto") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-success btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletsauto" ).css('opacity', 1);
                        $( "#modevoletsmanuel" ).css('opacity', 1);
                        $( "#modevoletscanicule" ).css('opacity', 1);
                        $( "#chauffagesalonautopresence" ).css('opacity', 1);
                        $( "#chauffagechambreauto" ).css('opacity', 1);
                        $( "#chauffagesdbauto" ).css('opacity', 1);
                        $( "#chauffagesalonconsigne" ).css('opacity', 1);
                        $( "#chauffagechambreconsigne" ).css('opacity', 1);
                        $( "#chauffagesdbconsigne" ).css('opacity', 1);
                    }
                    else if(Variable.Value == "manuel") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-warning btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletsauto" ).css('opacity', 0.2);
                        $( "#modevoletsmanuel" ).css('opacity', 0.2);
                        $( "#modevoletscanicule" ).css('opacity', 0.2);
                        $( "#chauffagesalonautopresence" ).css('opacity', 0.2);
                        $( "#chauffagechambreauto" ).css('opacity', 0.2);
                        $( "#chauffagesdbauto" ).css('opacity', 0.2);
                        $( "#chauffagesalonconsigne" ).css('opacity', 1);
                        $( "#chauffagechambreconsigne" ).css('opacity', 1);
                        $( "#chauffagesdbconsigne" ).css('opacity', 1);
                    }
                    else if(Variable.Value == "absent") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-danger btn-lg');
                        $( "#modevoletsauto" ).css('opacity', 1);
                        $( "#modevoletsmanuel" ).css('opacity', 1);
                        $( "#modevoletscanicule" ).css('opacity', 1);
                        $( "#chauffagesalonautopresence" ).css('opacity', 0.2);
                        $( "#chauffagechambreauto" ).css('opacity', 0.2);
                        $( "#chauffagesdbauto" ).css('opacity', 0.2);
                        $( "#chauffagesalonconsigne" ).css('opacity', 0.2);
                        $( "#chauffagechambreconsigne" ).css('opacity', 0.2);
                        $( "#chauffagesdbconsigne" ).css('opacity', 0.2);
                    }
                }
                else if (Variable.Name == vDomoticzScript_Mode_Volets) {
                    vModeVolets = Variable.Value;
                    if(Variable.Value == "auto") {
                        if (typeof vDomoticzVoletsTardifs != 'undefined' && vDomoticzVoletsTardifs == 'on')
                            $( "#modevoletsauto" ).attr('class', 'btn btn-darkgreen btn-lg btn-medpadding');
                        else
                            $( "#modevoletsauto" ).attr('class', 'btn btn-success btn-lg btn-medpadding');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                    }
                    else if(Variable.Value == "manuel") {
                        $( "#modevoletsauto" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-warning btn-lg btn-medpadding');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                    }
                    else if(Variable.Value == "canicule") {
                        $( "#modevoletsauto" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-default btn-lg btn-medpadding');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-success btn-lg btn-medpadding');
                    }
                }
                else if (Variable.Name == vDomoticzScript_Mode_VoletsTardifs) {
                    vDomoticzVoletsTardifs = Variable.Value;
                    if(Variable.Value == "on") {
                        $( "#modevoletsauto" ).text('Auto tardif');
                        if(typeof vModeVolets != 'undefined' && vModeVolets == "auto")
                            $( "#modevoletsauto" ).attr('class', 'btn btn-darkgreen btn-lg btn-medpadding');
                    }
                    else if(Variable.Value == "off") {
                        $( "#modevoletsauto" ).text('Auto');
                        if(typeof vModeVolets != 'undefined' && vModeVolets == "auto")
                            $( "#modevoletsauto" ).attr('class', 'btn btn-success btn-lg btn-medpadding');
                    }
                }
                else if (Variable.Name == vDomoticzVar_Chauffage_salon_Consigne) {
                     vDomocitzConsigneSalon = Variable.Value;
                     $( "#consignesalon" ).text( vDomocitzConsigneSalon ); 
                }
                else if (Variable.Name == vDomoticzVar_Chauffage_sdb_Consigne) {
                     vDomocitzConsigneSdb = Variable.Value;
                     $( "#consignesdb" ).text( vDomocitzConsigneSdb ); 
                }
                else if (Variable.Name == vDomoticzVar_Chauffage_chambre_Consigne) {
                     vDomocitzConsigneChambre = Variable.Value;
                     $( "#consignechambre" ).text( vDomocitzConsigneChambre ); 
                }

                else if (Variable.Name == vDomoticzVar_Alarmclock) {
                    var AlarmClockParts = Variable.Value.match(/(\d+):(\d+)/);
                    $( "#reveil_sel_hour" ).val( AlarmClockParts[1] ); 
                    $( "#reveil_sel_min" ).val( AlarmClockParts[2] ); 
                    $('.selectpicker').selectpicker('render');
                }

                else if (Variable.Name == vDomoticzScript_Presence_Maison) {
                    
                    // Différences entre la mise à jour de la variable et maintenant
                    var TimeVariableParts = Variable.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVariable = new Date(parseInt(TimeVariableParts[1]), parseInt(TimeVariableParts[2]) - 1, parseInt(TimeVariableParts[3]), parseInt(TimeVariableParts[4]), parseInt(TimeVariableParts[5]), parseInt(TimeVariableParts[6]));
                    var PourcentDiff = Math.min(Math.max(Math.floor(100 - Math.floor( (TimeNowServer.getTime() - TimeVariable.getTime()) / ( 60 * 1000)) * 100 / delay_minutes), 0), 100); // Pourcentage avant la fin

                    if(Variable.Value == "1") {
                        //$( "#presencetexte" ).text( Variable.LastUpdate ); 
                        $( "#presencecouleur" ).css('background', 'linear-gradient(to right, #449d44, #449d44 ' + PourcentDiff + '%, #f0ad4e ' + PourcentDiff + '%, #f0ad4e)');
                    }
                    else if(Variable.Value == "-1") {
                        //$( "#presencetexte" ).text( Variable.LastUpdate ); 
                         $( "#presencecouleur" ).css('background', 'linear-gradient(to right, #f0ad4e, #f0ad4e ' + PourcentDiff + '%, #d9534f ' + PourcentDiff + '%, #d9534f)');
                    }
                    else if(Variable.Value == "0") {
                        //$( "#presencetexte" ).text( Variable.LastUpdate ); 
                        $( "#presencecouleur" ).css('background', '#d9534f');
                    }
                }

                else if(Variable.Name == "Info_VoletsSalonOn") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletssalonon" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsSalonOff") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletssalonoff" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsSdbOnWeekMorning") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletssdbweekmorningon" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsSdbOffWeekMorning") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletssdbweekmorningoff" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsSdbOff") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletssdboff" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsChambreOnWeek") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletschambreweekon" ).html( TimeDisplay );
                }
                else if(Variable.Name == "Info_VoletsChambreOff") {
                    TimeDisplay = "&Oslash;";
                    if (Variable.Value >= 0) 
                        TimeDisplay = Math.floor( Variable.Value / 60) + "h" + ( (Variable.Value % 60) < 10 ? '0' + (Variable.Value % 60) : (Variable.Value % 60) );
                    $( "#ivoletschambreoff" ).html( TimeDisplay );
                }




            });
        }

        else {  // Json invalide          
            APIConnectionError();
        }
    })
    
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion à l'API
            APIConnectionError();
        });
}



/* Fonction d'update des devices et des variables */
function DomoticzGetUpdatedAll() {

    DomoticzGetUpdatedDevices();
    DomoticzGetUpdatedVariables();
}




/* Fonction d'interpolation des couleurs RGB, t entre 0 et 1 (pour température et humidité) */
function interpolationRGB(HexCodeA, HexCodeB, t)
{

    // Capping de t entre 0 et 1
    if ( t < 0) {
        t = 0;
    }
    else if ( t > 1) {
        t = 1;
    }

    var bigintA = parseInt(HexCodeA.substring(1), 16);
    var rA = (bigintA >> 16) & 255;
    var gA = (bigintA >> 8) & 255;
    var bA = bigintA & 255;

    var bigintB = parseInt(HexCodeB.substring(1), 16);
    var rB = (bigintB >> 16) & 255;
    var gB = (bigintB >> 8) & 255;
    var bB = bigintB & 255;

    var rC = Math.round(rA + (rB - rA) * t);
    var gC = Math.round(gA + (gB - gA) * t);
    var bC = Math.round(bA + (bB - bA) * t);

    return "#" + ((1 << 24) + (rC << 16) + (gC << 8) + bC).toString(16).slice(1);
}


// Mise à jour des icônes et de la couleur de température en fonction de la température
function SetCouleurTemperature(Temperature, PieceId, TempTxtId) {

    var Temp0inf = "#6e6eff";
    var Temp5 = "#00b0ff";
    var Temp10 = "#00c194";
    var Temp15 = "#4cb64c";
    var Temp20 = "#fed066";
    var Temp25 = "#ffb87f";
    var Temp30 = "#FB6102";
    var Temp35sup = "#FF1000"

    if(Temperature <= 0) {
        $( PieceId ).attr("src", "dashboard/images/temp-ice.png");
        $( TempTxtId ).css("color", Temp0inf);
    }
    else if(Temperature <= 5) { 
        $( PieceId ).attr("src", "dashboard/images/temp-0-5.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp0inf, Temp5, (Temperature - 0) / 5) );
    }
    else if (Temperature <= 10) { 
        $( PieceId ).attr("src", "dashboard/images/temp-5-10.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp5, Temp10, (Temperature - 5) / 5) );
    }
    else if (Temperature <= 15) { 
        $( PieceId ).attr("src", "dashboard/images/temp-10-15.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp10, Temp15, (Temperature - 10) / 5) );
    }
    else if (Temperature <= 20) {
        $( PieceId ).attr("src", "dashboard/images/temp-15-20.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp15, Temp20, (Temperature - 15) / 5) );
    }
    else if (Temperature <= 25) {
        $( PieceId ).attr("src", "dashboard/images/temp-20-25.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp20, Temp25, (Temperature - 20) / 5) );
    }
    else if (Temperature <= 30) {
        $( PieceId ).attr("src", "dashboard/images/temp-25-30.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp25, Temp30, (Temperature - 25) / 5) );
    }
    else {
        $( PieceId ).attr("src", "dashboard/images/temp-gt-30.png");
        $( TempTxtId ).css("color", interpolationRGB(Temp30, Temp35sup, (Temperature - 30) / 5) ); // Max des couleurs à 35
    }
}

// Mise à jour de la couleur de l'hygromètre en fonction de l'humidité
function SetCouleurHumidite(Humidite, HumidTxtId) {

    Humidity35inf = "#ff884e";
    Humidity40 = "#FFD1B9";
    Humidity45 = "#FFFFFF";
    Humidity55 = "#FFFFFF";
    Humidity60 = "#93C9D8";
    Humidity65sup = "#31b0d5";

    if(Humidite <= 35) {
        $( HumidTxtId ).css("color", "#ff884e");
        $( HumidTxtId ).css("color", Humidity35inf);
    }
    else if (Humidite <= 40) {
        $( HumidTxtId ).css("color", interpolationRGB(Humidity35inf, Humidity40, (Humidite - 35) / 5) );
    }
    else if (Humidite <= 45) {
        $( HumidTxtId ).css("color", interpolationRGB(Humidity40, Humidity45, (Humidite - 40) / 5) );
    }
    else if (Humidite <= 55) {
        $( HumidTxtId ).css("color", Humidity55); 
    }
    else if (Humidite <= 60) {
        $( HumidTxtId ).css("color", interpolationRGB(Humidity55, Humidity60, (Humidite - 55) / 5) );
    }
    else if (Humidite <= 65) {
        $( HumidTxtId ).css("color", interpolationRGB(Humidity60, Humidity65sup, (Humidite - 60) / 5) );
    }
    else {
        $( HumidTxtId ).css("color", Humidity65sup); 
    }
}



function SetConsigneChauffage(Piece, Sens) {

    var ConsigneVarName, ConsigneVarValue;

    if(Piece == "salon") {
        if (typeof vDomocitzConsigneSalon != "undefined")
            ConsigneVarValue = parseFloat(vDomocitzConsigneSalon);
        ConsigneVarName = vDomoticzVar_Chauffage_salon_Consigne;
    }
    else if(Piece == "chambre") {
        if (typeof vDomocitzConsigneChambre != "undefined")
            ConsigneVarValue = parseFloat(vDomocitzConsigneChambre);
        ConsigneVarName = vDomoticzVar_Chauffage_chambre_Consigne;        
    }
    else if(Piece == "sdb") {
        if (typeof vDomocitzConsigneSdb != "undefined")
            ConsigneVarValue = parseFloat(vDomocitzConsigneSdb);
        ConsigneVarName = vDomoticzVar_Chauffage_sdb_Consigne;
    }
    else {  // pièce incorrecte
        return;
    }


    if (Sens == "up") {
        ConsigneVarValue = ConsigneVarValue + 0.1;
    }
    else if (Sens == "down") {
        ConsigneVarValue = ConsigneVarValue - 0.1;
    }
    else { // sens incorrect
        return;
    } 


    $.ajax({
        url: "/json.htm?type=command&param=updateuservariable&vname=" + ConsigneVarName + "&vtype=1&vvalue=" + ConsigneVarValue.toFixed(1),
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == "OK") { // Code retour de l'API Domoticz
                $.notify("Consigne chauffage " + Piece + " à " + ConsigneVarValue.toFixed(1) + " °C", { autoHideDelay: 1000 });
                DomoticzGetUpdatedVariables(); // On raffraichit le dashboard pour la partie mise à jour
            }
            else {
                $.notify("Erreur modification consigne chauffage " + Piece, "error");
            } 
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.notify("Erreur modification consigne chauffage " + Piece, "error");
        }
    });
}




// Module Velib
function GetVelibMAJ() {

    // 1ère station
    $.getJSON(VelibAPIURL + "18042" + "?contract=Paris&apiKey=" + VelibAPIKey, function( data, textStatus, jqXHR ) {
        if( typeof data.available_bikes != "undefined")
            $( "#velibtext1" ).html( data.available_bikes + " / " + data.bike_stands );
        else
            $( "#velibtext1" ).html( "<span style='font-size: 20px;color:grey;'>Erreur API</span>" );
    })
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion
            $( "#velibtext1" ).html( "<span style='font-size: 20px;color:grey;'>Erreur API</span>" );
        });

    // 2è station
    $.getJSON(VelibAPIURL + "9018" + "?contract=Paris&apiKey=" + VelibAPIKey, function( data, textStatus, jqXHR ) {
        
        if( typeof data.available_bikes != "undefined")
            $( "#velibtext2" ).html( data.available_bikes + " / " + data.bike_stands );
        else
            $( "#velibtext2" ).html( "<span style='font-size: 20px;color:grey;'>Erreur API</span>" );
    })
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion 
            $( "#velibtext2" ).html( "<span style='font-size: 20px;color:grey;'>Erreur API</span>" );
        });
}



// Module RATP de pgrimaud
// Doc https://github.com/pgrimaud/horaires-ratp-api
function InitRatpMAJ() {
    // 1ère ligne de metro 
    GetRatpMAJ( RatpLigne1, "#ratptext1");
    //2 è ligne de metro
    GetRatpMAJ( RatpLigne2, "#ratptext2");
}

function GetRatpMAJ(Ligne, TextID) {

    $.getJSON( RatpURL + Ligne , function( data, textStatus, jqXHR ) {

        if(typeof data.result != "undefined") {

            $( TextID ).html('<img src="dashboard/images/ratp/ratp_metro' + Ligne + '.png" alt="' + Ligne + '">&nbsp;');

            if ( data.result.slug == "normal" ) {
                $( TextID ).css("color", "white");
            }
            else if (data.result.slug == "critique" ) {
                $( TextID ).css("color", "red"); 
                $( TextID ).append( '<img alt="critique" src="dashboard/images/ratp/ratp_critique.png">&nbsp;' );
            }
            else if (data.result.slug == "alerte" ) {
                $( TextID ).css("color", "orange"); 
                $( TextID ).append( '<img alt="alerte" src="dashboard/images/ratp/ratp_alerte.png">&nbsp;' );
            }
            else if (data.result.slug == "normal_trav") {
                $( TextID ).css("color", "white");
                $( TextID ).append( '<img alt="critique" src="dashboard/images/ratp/ratp_travaux.png">&nbsp;' );
            }

            $( TextID ).append( data.result.message );
        }
    })
        
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion
        });
}





function GetAirParifMAJ() {

    // Liste de providers de JSONP qui pourraient être utilisés
    //      AllowOrigin.org  => site KO
    //      https://whateverorigin.herokuapp.com/
    //      AnyOrigin.com  => 404
    //      WhateverOrigin.org => Pb certificat https ?
    $.ajaxSetup({
        crossOrigin: true,
        // Code Google accessible en anonyme sur compte tcellerier@gmail.com, 20000 requêtes max / jour , 100 MB max / jour
        proxy: proxyGoogleCrossOrigin
    });

    $.getJSON( AirParifURL, function( data, textStatus, jqXHR ) { 
        
        // if(typeof data.status != "undefined" && data.status.http_code == "200") {

        var doc =document.implementation.createHTMLDocument('Domoticz AirParif');
        doc.documentElement.innerHTML = data;

        var docParse = doc.getElementById("home_indices_eu").getElementsByClassName("tooltip");

        // On parcourt chaque <div class=tooltip>
        for (var i = 0; i < 3; i++) {
            
            if ( typeof docParse[ i ] != "undefined"  && docParse[ i ].getAttribute("src").includes("medium") === true ) {
                $( "#airpariftext" + (i+1) ).text( "moyen" );
                $( "#airpariftext" + (i+1) ).css( "background", "#efc618" );
            }
            else if ( typeof docParse[ i ] != "undefined"  &&  docParse[ i ].getAttribute("src").includes("vlow") === true) {
                $( "#airpariftext" + (i+1) ).text( "très faible" );
                $( "#airpariftext" + (i+1) ).css( "background", "#83c175" );
            }
            else if ( typeof docParse[ i ] != "undefined"  &&  docParse[ i ].getAttribute("src").includes("low") === true) {
                $( "#airpariftext" + (i+1) ).text( "faible" );
                $( "#airpariftext" + (i+1) ).css( "background", "#bfd154" );
            }
            else if ( typeof docParse[ i ] != "undefined"  &&  docParse[ i ].getAttribute("src").includes("vhigh") === true ) {
                $( "#airpariftext" + (i+1) ).text( "très élevé" );
                $( "#airpariftext" + (i+1) ).css( "background", "#95161d" );
            } 
            else if ( typeof docParse[ i ] != "undefined"  &&  docParse[ i ].getAttribute("src").includes("high") === true ) {
                $( "#airpariftext" + (i+1) ).text( "élevé" );
                $( "#airpariftext" + (i+1) ).css( "background", "#f39913" );
            } 
            else {
                $( "#airpariftext" + (i+1) ).text( "à 11h" );
                $( "#airpariftext" + (i+1) ).css( "background", "" );
            } 
        }
    })

        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion
            
        });

    $.ajaxSetup({
        crossOrigin: false
    });
}



function GetMeteoFranceUneHeureMAJ() {

    // Liste de providers de JSONP qui pourraient être utilisés
    //      AllowOrigin.org  => site KO
    //      https://whateverorigin.herokuapp.com/
    //      AnyOrigin.com  => 404
    //      WhateverOrigin.org => Pb certificat https ?
    $.ajaxSetup({
        crossOrigin: true,
        // Code Google accessible en anonyme sur compte tcellerier@gmail.com, 20000 requêtes max / jour , 100 MB max / jour
        proxy: proxyGoogleCrossOrigin
    });

    $.getJSON( PluieUneHeureURL , function( data, textStatus, jqXHR ) { 
        
        data = JSON.parse( data ); // On parse en JSON le retour texte de l'API

        if ( typeof data.dataCadran != "undefined") {

            var DataPluie = data.dataCadran;
            var DatePluieHtmlHead = "";
            var DatePluieHtmlBody = "";

            // On parcourt chaque créneau de 5 min
            for (var i = 0; i < 12; i++) {
                if( i % 2 === 0) 
                    DatePluieHtmlHead = DatePluieHtmlHead + "<th><span class='graph-pluie-heure-time'></span></th>";
                else
                    DatePluieHtmlHead = DatePluieHtmlHead + "<th><span class='graph-pluie-heure-time'></span></th>";
                DatePluieHtmlBody = DatePluieHtmlBody + "<td style='background:#" + DataPluie[i].color + "' title='" + DataPluie[i].niveauPluieText + "'></td>";
            }

            $( "#pluie-title-txt" ).html( data.lastUpdate + "&nbsp;" ); // data.niveauPluieText 
            $( "#pluieuneheure" ).html( "<table  style='margin: 0px auto;'>\n<thead><tr>" + DatePluieHtmlHead + "</tr></thead>\n" +
                 "<tbody><tr class='table-pluie-heure-time'>" + DatePluieHtmlBody + "</tr></tbody>\n</table>" );
        }

    })
        
        .fail(function(jqXHR, textStatus, errorThrown) {  // Erreur de connexion
            
        });

    $.ajaxSetup({
        crossOrigin: false
    });
}


/* Fonction de rechargement du calendrier Google */
function ReloadCalendar() {
    $( '#calendar-iframe' ).attr( 'src', CalendarURL );
}


/* Fonction d'affichage d'une surcouche de page  */
function OpenOverlayPage(URL) {

    $( "#backgroundgrey" ).show();
    $( "#divoverlay" ).show();
    $( "#divoverlay" ).html( '<a href="#" class="closeButton"></a><object type="text/html" data="' + URL + '" style="width: 100%; height: 100%;"></object>' ); 

    // On cache la page au premier clic en dehors de la zone centrale
    $( '#backgroundgrey' ).one( "click", function() { 
        CloseOverlayPage();
    });
    // On cache la page au clic sur le bouton fermer
    $( '#divoverlay a' ).on( "click", function() { 
        CloseOverlayPage();
    });

    // La touche echap ferme l'overlay
    $(document).keyup( function(e) { 
        if (e.which === 27) CloseOverlayPage();
    });

    window.setTimeout(function() { CloseOverlayPage(); }, 5 * 60 * 1000 );  // On ferme automatiquement l'overlay au bout de 5 min
}

function CloseOverlayPage() {
    vDomoticzAPIError = 0;
    $( "#backgroundgrey" ).hide();
    $( '#divoverlay' ).fadeOut();
    $( "#divoverlay" ).html( '' );
    window.setTimeout(function() {  DomoticzGetUpdatedAll(); }, 1.5 * 1000 );  // On attends 1.5s pour tenter de recharger les données
}


/* Fonction de confirmation de restart de domoticz */
function RestartDomoticz() {

    if (confirmCustom("Redémarrer serveur Domoticz ?") !== true) {
        return;
    }

    $.ajax({
        url: "/json.htm?type=command&param=system_reboot",
        async: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            
            if( data.status == "OK") { // Code retour de l'API Domoticz
                $.notify("Reboot en cours ...", "warn");
            }
            else {
                $.notify("Erreur API domoticz : échec reboot", "error");
            }  

        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.notify("Erreur API domoticz : échec reboot", "error");
        }
    });
}


/* Fonction d'exécution régulière car le SetInterval ne semble par marcher sur la tablette */
function SetTimeoutRecursive(TheFunction, Delay_seconds, InitialLoad) {
    $( "html" ).stop(true,true);  // Workaround pour que la fonction s'exécute bien périodiquement (et pas qu'1 fois toutes les 15 min)
    if(InitialLoad == 1) TheFunction();
    window.setTimeout(function() { SetTimeoutRecursive(TheFunction, Delay_seconds, 1); }, Delay_seconds * 1000 ); 
}


// Passe en plein écran et inversement
//   Besoin d'un évènement (ex : clic) pour fonctionner
function toggleFullScreen() { 

    if (!document.fullscreenElement &&    // alternative standard method
       !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } 
        else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } 
        else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } 
    else {
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } 
        else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } 
        else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
    }
}



// Fonction de gestion des alertes selon la situation
function confirmCustom(confirmTxt) {

    // Si la page n'est pas exécutée en mode standalone Android  (si lancée depuis un raccourci sur le bureau, la page est considérée comme une application à part entière)
    if ( window.matchMedia('(display-mode: standalone)').matches === false) {
        return confirm(confirmTxt);
    } 
    else {
        $.notify("Fonction non disponible dans le mode \"application indépendante\"\nOuvrez la page web depuis un navigateur standard", "error");
        return false;
    }
}


/* Fonction de mise en forme des boutons de volets lorsque les volets sont dans un état de mouvement. 1 itération = 1 seconde */
function EffetJSMouvementVolet(id_volet, etatCible, secondes) {

    if(id_volet == "voletssalongaucheup" || id_volet == "voletssalongauchedown")
        voletStatus = vDomoticzVoletsSalonGaucheStatut; 
    else if (id_volet == "voletssalondroitup" || id_volet == "voletssalondroitdown")
        voletStatus = vDomoticzVoletsSalonDroitStatut; 
    else if (id_volet == "voletchambreup" || id_volet == "voletchambredown" )
        voletStatus = vDomoticzVoletsChambreStatut; 
    else if (id_volet == "voletsdbup" || id_volet == "voletsdbdown")
        voletStatus = vDomoticzVoletsSdbStatut; 

    console.log(id_volet + " cible " + etatCible + ", " + secondes + " secondes");
    if(secondes > 1 && voletStatus != "closed" && voletStatus != "open") { // On continue le clignotement que si le volet n'a pas été arrété entre temps

        $( '#' + id_volet ).css('color', '#c12e2a');
        $( '#' + id_volet ).attr('class', 'glyphicon glyphicon-pause');
        window.setTimeout(function() {  $( '#' + id_volet ).css('color', 'DarkGrey'); }, 500 ); // On remet la couleur après 500 ms
        window.setTimeout(function() { EffetJSMouvementVolet(id_volet, etatCible, secondes - 1); }, 1000);
    }

    else { // On arrête le clignotement
        
        if(id_volet == "voletssalongaucheup" || id_volet == "voletssalondroitup" || id_volet == "voletchambreup" || id_volet == "voletsdbup")
            $( '#' + id_volet ).attr('class', 'glyphicon glyphicon-arrow-up');
        else
            $( '#' + id_volet ).attr('class', 'glyphicon glyphicon-arrow-down');

        if(id_volet == "voletssalongaucheup" || id_volet == "voletssalongauchedown")
            vDomoticzVoletsSalonGaucheStatut = etatCible; 
        else if (id_volet == "voletssalondroitup" || id_volet == "voletssalondroitdown")
            vDomoticzVoletsSalonDroitStatut = etatCible; 
        else if (id_volet == "voletchambreup" || id_volet == "voletchambredown" )
            vDomoticzVoletsChambreStatut = etatCible; 
        else if (id_volet == "voletsdbup" || id_volet == "voletsdbdown")
            vDomoticzVoletsSdbStatut = etatCible; 

        // Gestion de l'affichage du bouton commun central des 2 volets
        if(vDomoticzVoletsSalonDroitStatut == 'open' && vDomoticzVoletsSalonGaucheStatut == 'open') { 
            $( "#voletssalonup" ).css( "color", "DarkGrey" ); 
            $( "#voletssalondown" ).css( "color", "Black" ); 
        }
        else if(vDomoticzVoletsSalonDroitStatut == 'closed' && vDomoticzVoletsSalonGaucheStatut == 'closed') { 
            $( "#voletssalonup" ).css( "color", "Black" ); 
            $( "#voletssalondown" ).css( "color", "DarkGrey" ); 
        }
        else {
            $( "#voletssalonup" ).css( "color", "Black" ); 
            $( "#voletssalondown" ).css( "color", "Black" );  
        }

        console.log(etatCible);
    }
}



/* Fonction d'affichage en alternance du calendrier et des paramètres Domoticz */
function ToggleShowCalendar() {

    if( $( "#blocmodule-calendar" ).is(":visible") ) {
        $( "#blocmodule-calendar" ).hide();
        $( "#blocmodule-parameters" ).show();
        $( "#blocmodule-calendar-title1" ).html( '<img class="blocmodule-title-logo" id="parameters-title" src="dashboard/images/parameters.png" alt="Param"> Param.' );
        $( "#blocmodule-calendar-title2" ).html( '<span class="glyphicon glyphicon glyphicon-hand-right" id="voletssalondown"  aria-hidden="true"></span> Calendrier' );
    }
    else {   
        $( "#blocmodule-parameters" ).hide();
        $( "#blocmodule-calendar" ).show();
        $( "#blocmodule-calendar-title1" ).html( '<img class="blocmodule-title-logo" id="calendrier-title" src="dashboard/images/calendrier.png" alt="Calendrier">Calendrier' );
        $( "#blocmodule-calendar-title2" ).html( '<span class="glyphicon glyphicon glyphicon-hand-right" id="voletssalondown"  aria-hidden="true"></span> Param.' );
    }
}



/* Exécution lorsque la page est totalement chargée */
$(document).ready(function(){ 

    // Initialisation boutons Switch Bootstrap
    $.fn.bootstrapSwitch.defaults.indeterminate = true; // Par défaut : état non déterminé
    $.fn.bootstrapSwitch.defaults.onColor = 'info';
    $.fn.bootstrapSwitch.defaults.offColor = 'warning';
    // $("[name='prise-checkbox']").bootstrapSwitch('size', 'large');
    $("[name='reveil-checkbox']").bootstrapSwitch('size', 'small');

    // Initialisation du JS des listes déroulantes
    $('#reveil_sel_hour').on('changed.bs.select', function (event, clickedIndex, newValue, oldValue) {
        DomoticzSetAlarmClockValue();  // Ok car n'exécute par d'évènement lors de l'initialisation de la 1ere valeur
    });
    $('#reveil_sel_min').on('changed.bs.select', function (event, clickedIndex, newValue, oldValue) {
        DomoticzSetAlarmClockValue(); // Ok car n'exécute par d'évènement lors de l'initialisation de la 1ere valeur
    });

    // Paramétrage des notifications
    $.notify.defaults({ className: "info", position: "left top" });
  

    // On lance les fonctions de mise à jour à intervalles réguliers (en secondes)
    SetTimeoutRecursive(DomoticzGetUpdatedAll, 30, 1 ); 
 
    // Initialisation digiclock
    $('#digiclock').jdigiclock({
        imagesPath : 'dashboard/jdigiclock/images/',
        am_pm : false,
        weatherLocationCode : '615702',
        weatherMetric : 'C',
        weatherUpdate : '60'
    });


    SetTimeoutRecursive(GetVelibMAJ, 120, 1 ); // 2 min, API Velib officielle
    SetTimeoutRecursive(InitRatpMAJ, 300, 1 ); // 5 min, API ratp par Pierre Grimaud 
    

    SetTimeoutRecursive(GetAirParifMAJ, 2700, 1 );  // 45 Min, besoin d'un proxy pour le cross origin
    SetTimeoutRecursive(GetMeteoFranceUneHeureMAJ, 300, 1 ); // 5 Min , besoin d'un proxy pour le cross origin 

    SetTimeoutRecursive(ReloadCalendar, 7200, 1 );  // 2h

});
