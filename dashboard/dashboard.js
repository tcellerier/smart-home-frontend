/*  Fonctions Dommoticz */


/********************************************/
/**********   Début du paramétrage  *********/
/********************************************/

// ID des Devices Domoticz
vDomoticzIDVoletsSalon = 45;
vDomoticzIDVoletsChambre = 46;
vDomoticzIDVoletsSdb = 48;
vDomoticzIDTempSalon = 107;
vDomoticzIDTempChambre = 70;
vDomoticzIDTempSdb = 108;
vDomoticzIDTempDehors = 122;
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

// ID des scenes Domoticz
vDomoticsSceneBlanc100 = 5;
vDomoticsSceneBlanc10 = 6;
vDomoticsSceneBlanc3 = 14;
vDomoticsSceneRouge = 9;
vDomoticsSceneRose = 7;
vDomoticsSceneViolet = 8;
vDomoticsSceneBleu = 4;
vDomoticsSceneCyan = 13;
vDomoticsSceneVert = 12;
vDomoticsSceneJaune = 11;
vDomoticsSceneOrange = 10;

// Noms des variables domoticz
vDomoticzVar_Mode_Maison = "Var_Mode_Maison";
vDomoticzVar_Mode_Volets = "Var_Mode_Volets";
vDomoticzVar_Chauffage_sdb_Consigne = "Var_Chauffage_sdb_Consigne";
vDomoticzVar_Chauffage_salon_Consigne = "Var_Chauffage_salon_Consigne";
vDomoticzVar_Chauffage_chambre_Consigne = "Var_Chauffage_chambre_Consigne";
vDomoticzVar_Alarmclock = "Var_Alarmclock";
vDomoticzScript_Presence_Maison = "Script_Presence_Maison";


// Module Pluie 1h (API non documentée) pour le 9e, besoin d'un proxy pour le cross origin
PluieUneHeureURL = "http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/751090";

// Module Vélib
VelibAPIKey = "3496355ea83da762fa3cae313a27882b5b062bd7"; // Clef d'identification à l'API
VelibAPIURL = "https://api.jcdecaux.com/vls/v1/stations/";

// Module AirParif (parse page html)
AirParifURL = "http://www.airparif.asso.fr";

// Module RATP, API retro engineered par Pierre Grimaud
RatpURL = "https://api-ratp.pierre-grimaud.fr/v2/traffic/metros/";
RatpLigne1 = "2";
RatpLigne2 = "12";


/******************************************/
/**********   Fin du paramétrage  *********/
/******************************************/


// Initialisation des paramètres du script
vDomoticzLastUpdate = ""; 
vDomoticzAPIError = 0;
vDomoticzInitSwitchJS = 0;

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

            // On parcourt le tableau de devices
            $.each(data.result, function( Index, Device ) {

                // On sépare la gestion des scenes et des devices
                if (Device.Type == "Scene") {

                }

                else if (Device.idx == vDomoticzIDVoletsSalon) {
                    if(Device.Status == "Open") {
                        $( "#voletssalonup" ).css( "color", "DarkGrey" ); 
                        $( "#voletssalondown" ).css( "color", "Black" ); 
                    }
                    else {
                         $( "#voletssalonup" ).css( "color", "Black" ); 
                         $( "#voletssalondown" ).css( "color", "DarkGrey" ); 
                    }
                }
                else if (Device.idx == vDomoticzIDVoletsChambre) {
                    if(Device.Status == "Open") {
                        $( "#voletchambreup" ).css( "color", "DarkGrey" ); 
                        $( "#voletchambredown" ).css( "color", "Black" ); 
                    }
                    else {
                         $( "#voletchambreup" ).css( "color", "Black" ); 
                         $( "#voletchambredown" ).css( "color", "DarkGrey" ); 
                    }
                }
                else if (Device.idx == vDomoticzIDVoletsSdb) {
                    if(Device.Status == "Open") {
                        $( "#voletsdbup" ).css( "color", "DarkGrey" ); 
                        $( "#voletsdbdown" ).css( "color", "Black" ); 
                    }
                    else {
                         $( "#voletsdbup" ).css( "color", "Black" ); 
                         $( "#voletsdbdown" ).css( "color", "DarkGrey" ); 
                    }
                }

                else if (Device.idx == vDomoticzIDTempSalon) { 
                    $( "#tempsalon" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditesalon" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempsalonimg", "#tempsalon");
                    SetCouleurHumidite(Device.Humidity, "#humiditesalon");

                    $( "#timetempsalon" ).text( Device.LastUpdate.substring(11,16) ); 
                    var DateTempSalon = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                    var TimeNow = new Date(); 
                    var HourDiff = (TimeNow.getTime() - DateTempSalon.getTime()) / (3600*1000);
                    if( HourDiff < 1)
                        $( "#timetempsalon" ).css( "color", "grey" );
                    else
                        $( "#timetempsalon" ).css( "color", "red" );
                }
                else if (Device.idx == vDomoticzIDTempChambre) {
                    $( "#tempchambre" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditechambre" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempchambreimg", "#tempchambre");
                    SetCouleurHumidite(Device.Humidity, "#humiditechambre");

                    $( "#timetempchambre" ).text( Device.LastUpdate.substring(11,16) );        
                    var DateTempChambre = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                    var TimeNow = new Date(); 
                    var HourDiff = (TimeNow.getTime() - DateTempChambre.getTime()) / (3600*1000);
                    if( HourDiff < 1)
                        $( "#timetempchambre" ).css( "color", "grey" );
                    else
                        $( "#timetempchambre" ).css( "color", "red" );
                }
                else if (Device.idx == vDomoticzIDTempSdb) {
                    $( "#tempsdb" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditesdb" ).text( Device.Humidity  + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempsdbimg", "#tempsdb");
                    SetCouleurHumidite(Device.Humidity, "#humiditesdb");

                    $( "#timetempsdb" ).text( Device.LastUpdate.substring(11,16) ); 
                    var DateTempSdb = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                    var TimeNow = new Date(); 
                    var HourDiff = (TimeNow.getTime() - DateTempSdb.getTime()) / (3600*1000);
                    if( HourDiff < 1)
                        $( "#timetempsdb" ).css( "color", "grey" );
                    else
                        $( "#timetempsdb" ).css( "color", "red" ); 
                }
                else if (Device.idx == vDomoticzIDTempDehors) {
                    $( "#tempdehors" ).text( Device.Temp.toFixed(1) ); 
                    $( "#humiditedehors" ).text( Device.Humidity + ' %' ); 
                    SetCouleurTemperature(Device.Temp, "#tempdehorsimg", "#tempdehors");
                    SetCouleurHumidite(Device.Humidity, "#humiditedehors");

                    $( "#timetempdehors" ).text( Device.LastUpdate.substring(11,16) ); 
                    var DateTempDehors = new Date(Device.LastUpdate.substring(0,4), Device.LastUpdate.substring(5,7) - 1, Device.LastUpdate.substring(8,10), Device.LastUpdate.substring(11,13), Device.LastUpdate.substring(14,16));
                    var TimeNow = new Date(); 
                    var HourDiff = (TimeNow.getTime() - DateTempDehors.getTime()) / (3600*1000);
                    if( HourDiff < 1)
                        $( "#timetempdehors" ).css( "color", "grey" );
                    else
                        $( "#timetempdehors" ).css( "color", "red" );
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

                else if (Device.idx == vDomoticzIDPowerOffPrise2h) {
                }
                else if (Device.idx == vDomoticzIDLampeChambreColorChange) {
                }

            });

            // Variable globale de la datetime du call API pour ne récupérer que les derniers changements
            vDomoticzLastUpdate = data.ActTime; 

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

                if (Variable.Name == vDomoticzVar_Mode_Maison) {
                    if(Variable.Value == "auto") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-success btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-default btn-lg');
                    }
                    else if(Variable.Value == "manuel") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-warning btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-default btn-lg');
                    }
                    else if(Variable.Value == "absent") {
                        $( "#modemaisonauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modemaisonabsent" ).attr('class', 'btn btn-danger btn-lg');
                    }
                }
                else if (Variable.Name == vDomoticzVar_Mode_Volets) {
                    if(Variable.Value == "auto") {
                        $( "#modevoletsauto" ).attr('class', 'btn btn-success btn-lg');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-default btn-lg');
                    }
                    else if(Variable.Value == "manuel") {
                        $( "#modevoletsauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-warning btn-lg');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-default btn-lg');
                    }
                    else if(Variable.Value == "canicule") {
                        $( "#modevoletsauto" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletsmanuel" ).attr('class', 'btn btn-default btn-lg');
                        $( "#modevoletscanicule" ).attr('class', 'btn btn-success btn-lg');
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
                    var delay_minutes = 20; 
                    var TimeVariableParts = Variable.LastUpdate.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
                    var TimeVariable = new Date(parseInt(TimeVariableParts[1]), parseInt(TimeVariableParts[2]) - 1, parseInt(TimeVariableParts[3]), parseInt(TimeVariableParts[4]), parseInt(TimeVariableParts[5]), parseInt(TimeVariableParts[6]));
                    var TimeNow = new Date(); 
                    var PourcentDiff = Math.min(Math.max(Math.floor(100 - Math.floor( (TimeNow.getTime() - TimeVariable.getTime()) / ( 60 * 1000)) * 100 / delay_minutes), 0), 100); // Pourcentage avant la fin

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

    DomoticzGetUpdatedVariables();
    DomoticzGetUpdatedDevices();
  
}



// Mise à jour des icônes et de la couleur de température en fonction de la température
function SetCouleurTemperature(Temperature, PieceId, TempTxtId) {

    if(Temperature <= 0) {
        $( PieceId ).attr("src", "dashboard/images/temp-ice.png");
        $( TempTxtId ).css("color", "#6e6eff");
    }
    else if(Temperature < 5) { 
        $( PieceId ).attr("src", "dashboard/images/temp-0-5.png");
        $( TempTxtId ).css("color", "#00b0ff");
    }
    else if (Temperature < 10) { 
        $( PieceId ).attr("src", "dashboard/images/temp-5-10.png");
        $( TempTxtId ).css("color", "#00c194");
    }
    else if (Temperature < 15) { 
        $( PieceId ).attr("src", "dashboard/images/temp-10-15.png");
        $( TempTxtId ).css("color", "#4cb64c");
    }
    else if (Temperature < 20) {
        $( PieceId ).attr("src", "dashboard/images/temp-15-20.png");
        $( TempTxtId ).css("color", "#fed066");
    }
    else if (Temperature < 25) {
        $( PieceId ).attr("src", "dashboard/images/temp-20-25.png");
        $( TempTxtId ).css("color", "#ffb87f");
    }
    else if (Temperature < 30) {
        $( PieceId ).attr("src", "dashboard/images/temp-25-30.png");
        $( TempTxtId ).css("color", "#FB6102");
    }
    else {
        $( PieceId ).attr("src", "dashboard/images/temp-gt-30.png");
        $( TempTxtId ).css("color", "#FF1000");
    }
}

// Mise à jour de la couleur de l'hygromètre en fonction de l'humidité
function SetCouleurHumidite(Humidite, HumidTxtId) {
    if(Humidite < 35) {
        $( HumidTxtId ).css("color", "#ff884e");
    }
    else if (Humidite < 40) {
        $( HumidTxtId ).css("color", "#FFD1B9");
    }
    else if (Humidite <= 60) {
        $( HumidTxtId ).css("color", "white");
    }
    else if (Humidite <= 65) {
        $( HumidTxtId ).css("color", "#93C9D8"); 
    }
    else {
        $( HumidTxtId ).css("color", "#31b0d5"); 
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
            $( "#velibtext1" ).html( "<span style='font-size: 20px;color:grey;'>Erreur API</span>" );
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

        if(typeof data.response != "undefined") {

            $( TextID ).html('<img src="dashboard/images/ratp/ratp_metro' + Ligne + '.png" alt="' + Ligne + '">&nbsp;');

            if ( data.response.slug == "normal" ) {
                $( TextID ).css("color", "white");
            }
            else if (data.response.slug == "critique" ) {
                $( TextID ).css("color", "red"); 
                $( TextID ).append( '<img alt="critique" src="dashboard/images/ratp/ratp_critique.png">&nbsp;' );
            }
            else if (data.response.slug == "alerte" ) {
                $( TextID ).css("color", "orange"); 
                $( TextID ).append( '<img alt="alerte" src="dashboard/images/ratp/ratp_alerte.png">&nbsp;' );
            }
            else if (data.response.slug == "normal_trav") {
                $( TextID ).css("color", "white");
                $( TextID ).append( '<img alt="critique" src="dashboard/images/ratp/ratp_travaux.png">&nbsp;' );
            }

            $( TextID ).append( data.response.message );
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
        proxy: "https://script.google.com/macros/s/AKfycbw4oDw8QJj8w72Ibj6GOTnlyBVNTJjiCWJ-UVUMlqLy7u2_b9o/exec"
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
        proxy: "https://script.google.com/macros/s/AKfycbw4oDw8QJj8w72Ibj6GOTnlyBVNTJjiCWJ-UVUMlqLy7u2_b9o/exec"
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
                DatePluieHtmlBody = DatePluieHtmlBody + "<td style='background:#" + DataPluie[i].color + "'></td>";
            }

            $( "#pluie-title-txt" ).text( data.lastUpdate); // data.niveauPluieText 
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





/* Fonction d'affichage d'une surcouche de page  */
function OpenOverlayPage(URL) {

    $( "#backgroundgrey" ).show();
    $( "#divoverlay" ).show();
    $( "#subdivoverlay" ).html( '<object type="text/html" data="' + URL + '" style="width: 100%; height: 100%;"></object>' ); 

    // On cache la page au premier clic en dehors de la zone centrale
    $( '#backgroundgrey' ).one( "click", function() { 
        CloseOverlayPage()
    });
    // On cache la page au clic sur le bouton fermer
    $( '#divoverlay a' ).on( "click", function() { 
        CloseOverlayPage()
    });

    window.setTimeout(function() { CloseOverlayPage(); }, 15 * 60 * 1000 );  // On ferme automatiquement l'overlay au bout de 15 min
}

function CloseOverlayPage() {
    vDomoticzAPIError = 0;
    $( "#backgroundgrey" ).hide();
    $( '#divoverlay' ).fadeOut();
    $( "#subdivoverlay" ).html( '' );
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
function SetTimeoutRecursive(TheFunction, Delay_seconds) {
    $( "html" ).stop(true,true);  // Workaround pour que la fonction s'exécute bien périodiquement (et pas qu'1 fois toutes les 15 min)
    TheFunction();
    window.setTimeout(function() { SetTimeoutRecursive(TheFunction, Delay_seconds); }, Delay_seconds * 1000 ); 
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




/* Exécution lorsque la page est totalement chargée */
$(document).ready(function(){ 

    // Initialisation boutons Switch Bootstrap
    $.fn.bootstrapSwitch.defaults.indeterminate = true; // Par défaut : état non déterminé
    $.fn.bootstrapSwitch.defaults.onColor = 'info';
    $.fn.bootstrapSwitch.defaults.offColor = 'warning';
    $("[name='prise-checkbox']").bootstrapSwitch('size', 'large');
    $("[name='reveil-checkbox']").bootstrapSwitch('size', 'medium');

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
    SetTimeoutRecursive(DomoticzGetUpdatedAll, 30 ); 
 
   // Initialisation digiclock
    $('#digiclock').jdigiclock({
        imagesPath : 'dashboard/jdigiclock/images/',
        am_pm : false,
        weatherLocationCode : '615702',
        weatherMetric : 'C',
        weatherUpdate : '60'
    });


    SetTimeoutRecursive(GetVelibMAJ, 120 ); // 2 min, API Velib officielle
    SetTimeoutRecursive(InitRatpMAJ, 300 ); // 5 min, API retro engineered par Pierre Grimaud 
    

    SetTimeoutRecursive(GetAirParifMAJ, 2700 );  // 45 Min, besoin d'un proxy pour le cross origin
    SetTimeoutRecursive(GetMeteoFranceUneHeureMAJ, 900 ); // 15 Min , besoin d'un proxy pour le cross origin

});

