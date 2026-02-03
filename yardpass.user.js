// ==UserScript==
// @name         Amazon YMS Yard Pass 2.0
// @namespace    http://tampermonkey.net/
// @version      0.46
// @description  Generate bilingual yard passes from YMS for multiple instances
// @author       PAD2 David Smith (dnrsmith)
// @match        *://trans-logistics-eu.amazon.com/*
// @match        *://www.amazonlogistics.eu/*
// @updateURL    https://drive-render.corp.amazon.com/view/dnrsmith@/Yard%20Pass%20V2/Amazon%20YMS%20Yard%20Pass%202.0.js
// @downloadURL  https://drive-render.corp.amazon.com/view/dnrsmith@/Yard%20Pass%20V2/Amazon%20YMS%20Yard%20Pass%202.0.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const VERSION = '0.46';

    // Printer Configuration - Adjust these for your Zebra ZD621
    const PRINTER_CONFIG = {
        paperWidth: '102mm',
        marginTop: '2mm',
        marginBottom: '2mm',
        marginSides: '3mm'
    };

    const validNonVridIds = [
        'NON_INVENTORY',
        'MAINTENANCE',
        'OTHER',
        'EMPTY_PICKUP',
        'EMPTY_DROP'
    ];

    // Driver Action Options
    const DRIVER_ACTIONS = {
        PARK_AND_WAIT: 'park_and_wait',
        DOCK_AND_WAIT: 'dock_and_wait',
        PICKUP_AND_EXIT: 'pickup_and_exit',
        DROP_AND_SOLO_EXIT: 'drop_and_solo_exit',
        SWAP_BODY_EXCHANGE: 'swap_body_exchange',
        OTHER: 'other'
    };

    // Site language storage (persists across sessions)
    let siteLanguage = 'en'; // Default site language
    try {
        const savedSiteLanguage = localStorage.getItem('yardPassSiteLanguage');
        if (savedSiteLanguage) {
            siteLanguage = savedSiteLanguage;
        }
    } catch (e) {
        console.log('Could not load site language from storage');
    }

    // Function to save site language
    function saveSiteLanguage(lang) {
        siteLanguage = lang;
        try {
            localStorage.setItem('yardPassSiteLanguage', lang);
        } catch (e) {
            console.log('Could not save site language to storage');
        }
    }

    // Modal position storage (persists during session)
    let lastModalPosition = {
        x: 0,
        y: 0,
        hasBeenMoved: false
    };

    // Try to load saved position from localStorage
    try {
        const savedPosition = localStorage.getItem('yardPassModalPosition');
        if (savedPosition) {
            lastModalPosition = JSON.parse(savedPosition);
        }
    } catch (e) {
        console.log('Could not load modal position from storage');
    }

    // Translations for all supported languages
    const translations = {
        en: {
            yardPass: 'YARD PASS',
            vridIsaTrailer: '📦 VRID / ISA (Trailer):',
            vridIsaSwapBody: '📦 VRID / ISA (Swap Body):',
            vridIsaTruck: '📦 VRID / ISA (Truck):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 Trailer ID:',
            trailerIds: '🎯 Trailer IDs:',
            swapBodyId: '📦 Swap Body ID:',
            swapBodyIds: '📦 Swap Body IDs:',
            truckId: '🚛 Truck ID:',
            dockAt: 'Dock at',
            outbound: 'Outbound',
            inbound: 'Inbound',
            door: 'Door',
            dropTrailerAt: 'Drop trailer at',
            dropSwapBodyAt: 'Drop swap body at',
            parkAt: 'Park at',
            andWaitInLounge: 'and wait in Trucker Lounge',
            dropAndExit: 'Drop trailer and exit yard',
            dropSwapBodyAndExit: 'Drop swap body and exit yard',
            pickUpAndExit: 'Pick up trailer and exit yard',
            pickUpSwapBodyAndExit: 'Pick up swap body and exit yard',
            printed: 'Printed:',
            printedBy: 'Printed by:',
            selectLanguage: 'Select Driver Language',
            selectSiteLanguage: 'Select Site Language',
            cancel: 'Cancel',
            pagerNo: '📟 Pager No.',
            pickUpTrailer: '🚛 Pick up Trailer',
            pickUpSwapBody: '📦 Pick up Swap Body',
            welcomeTo: 'Welcome to Amazon',
            tip1: 'Please wear your safety vest closed.',
            tip2: 'Please always place the wheel chock under the wheel of your truck.',
            tip3: 'Always listen to the yard marshals.',
            tip4: 'Report to the trucker lounge once you have docked or parked.',
            whatShouldDriverDo: 'What should the driver do?',
            parkAndWaitOption: '🅿️ Park up and wait in the trucker lounge',
            dockAndWaitOption: '🚛 Dock trailer and wait in the trucker lounge',
            pickUpAndExitOption: '🚛 Pick up trailer and exit',
            pickUpSwapBodyAndExitOption: '📦 Pick up swap body and exit',
            dropAndSoloExitOption: '🚪 Drop off and solo exit',
            otherOption: '✏️ Other (custom instruction)',
            enterCustomInstruction: 'Enter custom instruction:',
            customInstruction: 'Special Instruction:',
            connectToTrailerAt: 'Connect to trailer at',
            connectToSwapBodyAt: 'Connect to swap body at',
            soloExit: 'Exit yard (solo)',
            swapBodyOperation: 'Swap Body Operation',
            dropEmpty: 'Drop empty',
            pickUpLoaded: 'Pick up',
            swapBody: 'swap body',
            swapBodies: 'swap bodies',
            dropXEmpty: 'Drop {x} empty {body}',
            pickUpX: 'Pick up {x} {body}',
            selectSwapBodyAction: 'Select Swap Body Operation',
            currentSiteLanguage: 'Site Language',
            changeSiteLanguage: '⚙️ Change Site Language'
        },
        de: {
            yardPass: 'YARD PASS',
            vridIsaTrailer: '📦 VRID / ISA (Anhänger):',
            vridIsaSwapBody: '📦 VRID / ISA (Wechselbrücke):',
            vridIsaTruck: '📦 VRID / ISA (LKW):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 Anhänger ID:',
            trailerIds: '🎯 Anhänger IDs:',
            swapBodyId: '📦 Wechselbrücke ID:',
            swapBodyIds: '📦 Wechselbrücken IDs:',
            truckId: '🚛 LKW ID:',
            dockAt: 'Andocken an',
            outbound: 'Ausgang',
            inbound: 'Eingang',
            door: 'Tor',
            dropTrailerAt: 'Trailer abstellen bei',
            dropSwapBodyAt: 'Wechselbrücke abstellen bei',
            parkAt: 'Parken bei',
            andWaitInLounge: 'und in der Fahrer-Lounge warten',
            dropAndExit: 'Trailer abstellen und Gelände verlassen',
            dropSwapBodyAndExit: 'Wechselbrücke abstellen und Gelände verlassen',
            pickUpAndExit: 'Anhänger abholen und Gelände verlassen',
            pickUpSwapBodyAndExit: 'Wechselbrücke abholen und Gelände verlassen',
            printed: 'Gedruckt:',
            printedBy: 'Gedruckt von:',
            selectLanguage: 'Fahrersprache wählen',
            selectSiteLanguage: 'Standortsprache wählen',
            cancel: 'Abbrechen',
            pagerNo: '📟 Pager Nr.',
            pickUpTrailer: '🚛 Anhänger abholen',
            pickUpSwapBody: '📦 Wechselbrücke abholen',
            welcomeTo: 'Willkommen bei Amazon',
            tip1: 'Bitte tragen Sie Ihre Sicherheitsweste geschlossen.',
            tip2: 'Bitte legen Sie immer den Unterlegkeil unter das Rad Ihres LKWs.',
            tip3: 'Hören Sie immer auf die Yard Marshals.',
            tip4: 'Melden Sie sich in der Fahrer-Lounge, sobald Sie angedockt oder geparkt haben.',
            whatShouldDriverDo: 'Was soll der Fahrer tun?',
            parkAndWaitOption: '🅿️ Parken und in der Fahrer-Lounge warten',
            dockAndWaitOption: '🚛 Anhänger andocken und in der Fahrer-Lounge warten',
            pickUpAndExitOption: '🚛 Anhänger abholen und ausfahren',
            pickUpSwapBodyAndExitOption: '📦 Wechselbrücke abholen und ausfahren',
            dropAndSoloExitOption: '🚪 Abstellen und solo ausfahren',
            otherOption: '✏️ Andere (benutzerdefinierte Anweisung)',
            enterCustomInstruction: 'Benutzerdefinierte Anweisung eingeben:',
            customInstruction: 'Sonderanweisung:',
            connectToTrailerAt: 'Anhänger ankoppeln bei',
            connectToSwapBodyAt: 'Wechselbrücke ankoppeln bei',
            soloExit: 'Gelände verlassen (solo)',
            swapBodyOperation: 'Wechselbrücken-Operation',
            dropEmpty: 'Leere abstellen',
            pickUpLoaded: 'Abholen',
            swapBody: 'Wechselbrücke',
            swapBodies: 'Wechselbrücken',
            dropXEmpty: '{x} leere {body} abstellen',
            pickUpX: '{x} {body} abholen',
            selectSwapBodyAction: 'Wechselbrücken-Operation wählen',
            currentSiteLanguage: 'Standortsprache',
            changeSiteLanguage: '⚙️ Standortsprache ändern'
        },
        fr: {
            yardPass: 'PASS DE COUR',
            vridIsaTrailer: '📦 VRID / ISA (Remorque):',
            vridIsaSwapBody: '📦 VRID / ISA (Caisse mobile):',
            vridIsaTruck: '📦 VRID / ISA (Camion):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Remorque:',
            trailerIds: '🎯 IDs Remorques:',
            swapBodyId: '📦 ID Caisse mobile:',
            swapBodyIds: '📦 IDs Caisses mobiles:',
            truckId: '🚛 ID Camion:',
            dockAt: 'Accoster au',
            outbound: 'Sortie',
            inbound: 'Entrée',
            door: 'Porte',
            dropTrailerAt: 'Déposer la remorque à',
            dropSwapBodyAt: 'Déposer la caisse mobile à',
            parkAt: 'Garer à',
            andWaitInLounge: 'et attendre dans le salon des chauffeurs',
            dropAndExit: 'Déposer la remorque et quitter le site',
            dropSwapBodyAndExit: 'Déposer la caisse mobile et quitter le site',
            pickUpAndExit: 'Récupérer la remorque et quitter le site',
            pickUpSwapBodyAndExit: 'Récupérer la caisse mobile et quitter le site',
            printed: 'Imprimé:',
            printedBy: 'Imprimé par:',
            selectLanguage: 'Langue du chauffeur',
            selectSiteLanguage: 'Langue du site',
            cancel: 'Annuler',
            pagerNo: '📟 N° de Bipeur',
            pickUpTrailer: '🚛 Récupérer la remorque',
            pickUpSwapBody: '📦 Récupérer la caisse mobile',
            welcomeTo: 'Bienvenue chez Amazon',
            tip1: 'Veuillez porter votre gilet de sécurité fermé.',
            tip2: 'Veuillez toujours placer la cale sous la roue de votre camion.',
            tip3: 'Écoutez toujours les Yard Marshals.',
            tip4: 'Présentez-vous au salon des chauffeurs après avoir accosté ou stationné.',
            whatShouldDriverDo: 'Que doit faire le chauffeur?',
            parkAndWaitOption: '🅿️ Se garer et attendre dans le salon des chauffeurs',
            dockAndWaitOption: '🚛 Accoster la remorque et attendre dans le salon des chauffeurs',
            pickUpAndExitOption: '🚛 Récupérer la remorque et sortir',
            pickUpSwapBodyAndExitOption: '📦 Récupérer la caisse mobile et sortir',
            dropAndSoloExitOption: '🚪 Déposer et sortir seul',
            otherOption: '✏️ Autre (instruction personnalisée)',
            enterCustomInstruction: 'Entrez l\'instruction personnalisée:',
            customInstruction: 'Instruction spéciale:',
            connectToTrailerAt: 'Se connecter à la remorque à',
            connectToSwapBodyAt: 'Se connecter à la caisse mobile à',
            soloExit: 'Quitter le site (seul)',
            swapBodyOperation: 'Opération Caisse Mobile',
            dropEmpty: 'Déposer vide',
            pickUpLoaded: 'Récupérer',
            swapBody: 'caisse mobile',
            swapBodies: 'caisses mobiles',
            dropXEmpty: 'Déposer {x} {body} vide(s)',
            pickUpX: 'Récupérer {x} {body}',
            selectSwapBodyAction: 'Sélectionner l\'opération',
            currentSiteLanguage: 'Langue du site',
            changeSiteLanguage: '⚙️ Changer la langue du site'
        },
        es: {
            yardPass: 'PASE DE PATIO',
            vridIsaTrailer: '📦 VRID / ISA (Remolque):',
            vridIsaSwapBody: '📦 VRID / ISA (Caja móvil):',
            vridIsaTruck: '📦 VRID / ISA (Camión):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Remolque:',
            trailerIds: '🎯 IDs Remolques:',
            swapBodyId: '📦 ID Caja móvil:',
            swapBodyIds: '📦 IDs Cajas móviles:',
            truckId: '🚛 ID Camión:',
            dockAt: 'Atracar en',
            outbound: 'Salida',
            inbound: 'Entrada',
            door: 'Puerta',
            dropTrailerAt: 'Dejar remolque en',
            dropSwapBodyAt: 'Dejar caja móvil en',
            parkAt: 'Estacionar en',
            andWaitInLounge: 'y esperar en la sala de conductores',
            dropAndExit: 'Dejar remolque y salir del patio',
            dropSwapBodyAndExit: 'Dejar caja móvil y salir del patio',
            pickUpAndExit: 'Recoger remolque y salir del patio',
            pickUpSwapBodyAndExit: 'Recoger caja móvil y salir del patio',
            printed: 'Impreso:',
            printedBy: 'Impreso por:',
            selectLanguage: 'Idioma del conductor',
            selectSiteLanguage: 'Idioma del sitio',
            cancel: 'Cancelar',
            pagerNo: '📟 N° de Buscapersonas',
            pickUpTrailer: '🚛 Recoger remolque',
            pickUpSwapBody: '📦 Recoger caja móvil',
            welcomeTo: 'Bienvenido a Amazon',
            tip1: 'Por favor, lleve su chaleco de seguridad cerrado.',
            tip2: 'Por favor, siempre coloque la cuña debajo de la rueda de su camión.',
            tip3: 'Siempre escuche a los Yard Marshals.',
            tip4: 'Preséntese en la sala de conductores después de atracar o estacionar.',
            whatShouldDriverDo: '¿Qué debe hacer el conductor?',
            parkAndWaitOption: '🅿️ Estacionar y esperar en la sala de conductores',
            dockAndWaitOption: '🚛 Atracar remolque y esperar en la sala de conductores',
            pickUpAndExitOption: '🚛 Recoger remolque y salir',
            pickUpSwapBodyAndExitOption: '📦 Recoger caja móvil y salir',
            dropAndSoloExitOption: '🚪 Dejar y salir solo',
            otherOption: '✏️ Otro (instrucción personalizada)',
            enterCustomInstruction: 'Ingrese instrucción personalizada:',
            customInstruction: 'Instrucción especial:',
            connectToTrailerAt: 'Conectar al remolque en',
            connectToSwapBodyAt: 'Conectar a la caja móvil en',
            soloExit: 'Salir del patio (solo)',
            swapBodyOperation: 'Operación de Caja Móvil',
            dropEmpty: 'Dejar vacía',
            pickUpLoaded: 'Recoger',
            swapBody: 'caja móvil',
            swapBodies: 'cajas móviles',
            dropXEmpty: 'Dejar {x} {body} vacía(s)',
            pickUpX: 'Recoger {x} {body}',
            selectSwapBodyAction: 'Seleccionar operación',
            currentSiteLanguage: 'Idioma del sitio',
            changeSiteLanguage: '⚙️ Cambiar idioma del sitio'
        },
        it: {
            yardPass: 'PASS PIAZZALE',
            vridIsaTrailer: '📦 VRID / ISA (Rimorchio):',
            vridIsaSwapBody: '📦 VRID / ISA (Cassa mobile):',
            vridIsaTruck: '📦 VRID / ISA (Camion):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Rimorchio:',
            trailerIds: '🎯 ID Rimorchi:',
            swapBodyId: '📦 ID Cassa mobile:',
            swapBodyIds: '📦 ID Casse mobili:',
            truckId: '🚛 ID Camion:',
            dockAt: 'Attraccare a',
            outbound: 'Uscita',
            inbound: 'Entrata',
            door: 'Porta',
            dropTrailerAt: 'Lasciare rimorchio a',
            dropSwapBodyAt: 'Lasciare cassa mobile a',
            parkAt: 'Parcheggiare a',
            andWaitInLounge: 'e attendere nella sala autisti',
            dropAndExit: 'Lasciare rimorchio e uscire dal piazzale',
            dropSwapBodyAndExit: 'Lasciare cassa mobile e uscire dal piazzale',
            pickUpAndExit: 'Ritirare rimorchio e uscire dal piazzale',
            pickUpSwapBodyAndExit: 'Ritirare cassa mobile e uscire dal piazzale',
            printed: 'Stampato:',
            printedBy: 'Stampato da:',
            selectLanguage: 'Lingua dell\'autista',
            selectSiteLanguage: 'Lingua del sito',
            cancel: 'Annulla',
            pagerNo: '📟 N° Cercapersone',
            pickUpTrailer: '🚛 Ritirare rimorchio',
            pickUpSwapBody: '📦 Ritirare cassa mobile',
            welcomeTo: 'Benvenuto in Amazon',
            tip1: 'Si prega di indossare il giubbotto di sicurezza chiuso.',
            tip2: 'Si prega di posizionare sempre il cuneo sotto la ruota del camion.',
            tip3: 'Ascoltare sempre i Yard Marshals.',
            tip4: 'Presentarsi nella sala autisti dopo aver attraccato o parcheggiato.',
            whatShouldDriverDo: 'Cosa deve fare l\'autista?',
            parkAndWaitOption: '🅿️ Parcheggiare e attendere nella sala autisti',
            dockAndWaitOption: '🚛 Attraccare il rimorchio e attendere nella sala autisti',
            pickUpAndExitOption: '🚛 Ritirare rimorchio e uscire',
            pickUpSwapBodyAndExitOption: '📦 Ritirare cassa mobile e uscire',
            dropAndSoloExitOption: '🚪 Lasciare e uscire da solo',
            otherOption: '✏️ Altro (istruzione personalizzata)',
            enterCustomInstruction: 'Inserire istruzione personalizzata:',
            customInstruction: 'Istruzione speciale:',
            connectToTrailerAt: 'Collegare al rimorchio a',
            connectToSwapBodyAt: 'Collegare alla cassa mobile a',
            soloExit: 'Uscire dal piazzale (solo)',
            swapBodyOperation: 'Operazione Cassa Mobile',
            dropEmpty: 'Lasciare vuota',
            pickUpLoaded: 'Ritirare',
            swapBody: 'cassa mobile',
            swapBodies: 'casse mobili',
            dropXEmpty: 'Lasciare {x} {body} vuota/e',
            pickUpX: 'Ritirare {x} {body}',
            selectSwapBodyAction: 'Seleziona operazione',
            currentSiteLanguage: 'Lingua del sito',
            changeSiteLanguage: '⚙️ Cambia lingua del sito'
        },
        tr: {
            yardPass: 'SAHA GEÇİŞ KARTI',
            vridIsaTrailer: '📦 VRID / ISA (Römork):',
            vridIsaSwapBody: '📦 VRID / ISA (Swap Kasa):',
            vridIsaTruck: '📦 VRID / ISA (Kamyon):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 Römork ID:',
            trailerIds: '🎯 Römork IDleri:',
            swapBodyId: '📦 Swap Kasa ID:',
            swapBodyIds: '📦 Swap Kasa IDleri:',
            truckId: '🚛 Kamyon ID:',
            dockAt: 'Yanaş',
            outbound: 'Çıkış',
            inbound: 'Giriş',
            door: 'Kapı',
            dropTrailerAt: 'Römorku bırak',
            dropSwapBodyAt: 'Swap kasayı bırak',
            parkAt: 'Park et',
            andWaitInLounge: 've Şoför Dinlenme Odasında bekle',
            dropAndExit: 'Römorku bırak ve sahadan çık',
            dropSwapBodyAndExit: 'Swap kasayı bırak ve sahadan çık',
            pickUpAndExit: 'Römork al ve sahadan çık',
            pickUpSwapBodyAndExit: 'Swap kasa al ve sahadan çık',
            printed: 'Basıldı:',
            printedBy: 'Basan:',
            selectLanguage: 'Sürücü Dili Seçin',
            selectSiteLanguage: 'Site Dili Seçin',
            cancel: 'İptal',
            pagerNo: '📟 Çağrı Cihazı No',
            pickUpTrailer: '🚛 Römork Al',
            pickUpSwapBody: '📦 Swap Kasa Al',
            welcomeTo: 'Amazon\'a Hoş Geldiniz',
            tip1: 'Lütfen güvenlik yeleğinizi kapalı giyin.',
            tip2: 'Lütfen her zaman takozu kamyonunuzun tekerleğinin altına yerleştirin.',
            tip3: 'Her zaman Yard Marshals\'ı dinleyin.',
            tip4: 'Yanaştıktan veya park ettikten sonra şoför dinlenme odasına bildirin.',
            whatShouldDriverDo: 'Sürücü ne yapmalı?',
            parkAndWaitOption: '🅿️ Park et ve şoför dinlenme odasında bekle',
            dockAndWaitOption: '🚛 Römorku yanaştır ve şoför dinlenme odasında bekle',
            pickUpAndExitOption: '🚛 Römork al ve çık',
            pickUpSwapBodyAndExitOption: '📦 Swap kasa al ve çık',
            dropAndSoloExitOption: '🚪 Bırak ve tek başına çık',
            otherOption: '✏️ Diğer (özel talimat)',
            enterCustomInstruction: 'Özel talimat girin:',
            customInstruction: 'Özel Talimat:',
            connectToTrailerAt: 'Römorka bağlan',
            connectToSwapBodyAt: 'Swap kasaya bağlan',
            soloExit: 'Sahadan çık (solo)',
            swapBodyOperation: 'Swap Kasa Operasyonu',
            dropEmpty: 'Boş bırak',
            pickUpLoaded: 'Al',
            swapBody: 'swap kasa',
            swapBodies: 'swap kasalar',
            dropXEmpty: '{x} boş {body} bırak',
            pickUpX: '{x} {body} al',
            selectSwapBodyAction: 'Swap Kasa Operasyonu Seç',
            currentSiteLanguage: 'Site Dili',
            changeSiteLanguage: '⚙️ Site Dilini Değiştir'
        },
        ar: {
            yardPass: 'تصريح الساحة',
            vridIsaTrailer: '📦 VRID / ISA (مقطورة):',
            vridIsaSwapBody: '📦 VRID / ISA (صندوق متبادل):',
            vridIsaTruck: '📦 VRID / ISA (شاحنة):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 معرف المقطورة:',
            trailerIds: '🎯 معرفات المقطورات:',
            swapBodyId: '📦 معرف الصندوق المتبادل:',
            swapBodyIds: '📦 معرفات الصناديق المتبادلة:',
            truckId: '🚛 معرف الشاحنة:',
            dockAt: 'الرسو في',
            outbound: 'صادر',
            inbound: 'وارد',
            door: 'باب',
            dropTrailerAt: 'إنزال المقطورة في',
            dropSwapBodyAt: 'إنزال الصندوق المتبادل في',
            parkAt: 'الوقوف في',
            andWaitInLounge: 'والانتظار في صالة السائقين',
            dropAndExit: 'إنزال المقطورة والخروج من الساحة',
            dropSwapBodyAndExit: 'إنزال الصندوق المتبادل والخروج من الساحة',
            pickUpAndExit: 'استلام المقطورة والخروج من الساحة',
            pickUpSwapBodyAndExit: 'استلام الصندوق المتبادل والخروج من الساحة',
            printed: 'طُبع:',
            printedBy: 'طُبع بواسطة:',
            selectLanguage: 'اختر لغة السائق',
            selectSiteLanguage: 'اختر لغة الموقع',
            cancel: 'إلغاء',
            pagerNo: '📟 رقم جهاز النداء',
            pickUpTrailer: '🚛 استلام المقطورة',
            pickUpSwapBody: '📦 استلام الصندوق المتبادل',
            welcomeTo: 'مرحباً بك في أمازون',
            tip1: 'يرجى ارتداء سترة السلامة مغلقة.',
            tip2: 'يرجى وضع حاجز العجلة دائماً تحت عجلة شاحنتك.',
            tip3: 'استمع دائماً إلى مشرفي الساحة.',
            tip4: 'توجه إلى صالة السائقين بعد الرسو أو الوقوف.',
            whatShouldDriverDo: 'ماذا يجب أن يفعل السائق؟',
            parkAndWaitOption: '🅿️ الوقوف والانتظار في صالة السائقين',
            dockAndWaitOption: '🚛 رسو المقطورة والانتظار في صالة السائقين',
            pickUpAndExitOption: '🚛 استلام المقطورة والخروج',
            pickUpSwapBodyAndExitOption: '📦 استلام الصندوق المتبادل والخروج',
            dropAndSoloExitOption: '🚪 التسليم والخروج منفرداً',
            otherOption: '✏️ أخرى (تعليمات مخصصة)',
            enterCustomInstruction: 'أدخل التعليمات المخصصة:',
            customInstruction: 'تعليمات خاصة:',
            connectToTrailerAt: 'الاتصال بالمقطورة في',
            connectToSwapBodyAt: 'الاتصال بالصندوق المتبادل في',
            soloExit: 'الخروج من الساحة (منفرداً)',
            swapBodyOperation: 'عملية الصندوق المتبادل',
            dropEmpty: 'إنزال فارغ',
            pickUpLoaded: 'استلام',
            swapBody: 'صندوق متبادل',
            swapBodies: 'صناديق متبادلة',
            dropXEmpty: 'إنزال {x} {body} فارغ',
            pickUpX: 'استلام {x} {body}',
            selectSwapBodyAction: 'اختر العملية',
            currentSiteLanguage: 'لغة الموقع',
            changeSiteLanguage: '⚙️ تغيير لغة الموقع'
        },
        bg: {
            yardPass: 'ПРОПУСК ЗА ДВОРА',
            vridIsaTrailer: '📦 VRID / ISA (Ремарке):',
            vridIsaSwapBody: '📦 VRID / ISA (Сменяема каросерия):',
            vridIsaTruck: '📦 VRID / ISA (Камион):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID на ремарке:',
            trailerIds: '🎯 ID на ремаркета:',
            swapBodyId: '📦 ID на сменяема каросерия:',
            swapBodyIds: '📦 ID на сменяеми каросерии:',
            truckId: '🚛 ID на камион:',
            dockAt: 'Докиране на',
            outbound: 'Изходящ',
            inbound: 'Входящ',
            door: 'Врата',
            dropTrailerAt: 'Оставете ремаркето на',
            dropSwapBodyAt: 'Оставете сменяемата каросерия на',
            parkAt: 'Паркирайте на',
            andWaitInLounge: 'и изчакайте в стаята за шофьори',
            dropAndExit: 'Оставете ремаркето и напуснете двора',
            dropSwapBodyAndExit: 'Оставете сменяемата каросерия и напуснете двора',
            pickUpAndExit: 'Вземете ремарке и напуснете двора',
            pickUpSwapBodyAndExit: 'Вземете сменяема каросерия и напуснете двора',
            printed: 'Отпечатано:',
            printedBy: 'Отпечатано от:',
            selectLanguage: 'Изберете език на шофьора',
            selectSiteLanguage: 'Изберете език на сайта',
            cancel: 'Отказ',
            pagerNo: '📟 Пейджър №',
            pickUpTrailer: '🚛 Вземете ремарке',
            pickUpSwapBody: '📦 Вземете сменяема каросерия',
            welcomeTo: 'Добре дошли в Amazon',
            tip1: 'Моля, носете предпазната си жилетка закопчана.',
            tip2: 'Моля, винаги поставяйте стопорния клин под колелото на камиона.',
            tip3: 'Винаги слушайте Yard Marshals.',
            tip4: 'Отидете в стаята за шофьори след докиране или паркиране.',
            whatShouldDriverDo: 'Какво трябва да направи шофьорът?',
            parkAndWaitOption: '🅿️ Паркирайте и изчакайте в стаята за шофьори',
            dockAndWaitOption: '🚛 Докирайте ремаркето и изчакайте в стаята за шофьори',
            pickUpAndExitOption: '🚛 Вземете ремарке и излезте',
            pickUpSwapBodyAndExitOption: '📦 Вземете сменяема каросерия и излезте',
            dropAndSoloExitOption: '🚪 Оставете и излезте сами',
            otherOption: '✏️ Друго (персонализирана инструкция)',
            enterCustomInstruction: 'Въведете персонализирана инструкция:',
            customInstruction: 'Специална инструкция:',
            connectToTrailerAt: 'Свържете се с ремаркето на',
            connectToSwapBodyAt: 'Свържете се със сменяемата каросерия на',
            soloExit: 'Напуснете двора (сам)',
            swapBodyOperation: 'Операция със сменяема каросерия',
            dropEmpty: 'Оставете празна',
            pickUpLoaded: 'Вземете',
            swapBody: 'сменяема каросерия',
            swapBodies: 'сменяеми каросерии',
            dropXEmpty: 'Оставете {x} празна/и {body}',
            pickUpX: 'Вземете {x} {body}',
            selectSwapBodyAction: 'Изберете операция',
            currentSiteLanguage: 'Език на сайта',
            changeSiteLanguage: '⚙️ Промяна на езика на сайта'
        },
        pl: {
            yardPass: 'PRZEPUSTKA',
            vridIsaTrailer: '📦 VRID / ISA (Przyczepa):',
            vridIsaSwapBody: '📦 VRID / ISA (Nadwozie wymienne):',
            vridIsaTruck: '📦 VRID / ISA (Ciężarówka):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Przyczepy:',
            trailerIds: '🎯 ID Przyczep:',
            swapBodyId: '📦 ID Nadwozia wymiennego:',
            swapBodyIds: '📦 ID Nadwozi wymiennych:',
            truckId: '🚛 ID Ciężarówki:',
            dockAt: 'Zadokuj przy',
            outbound: 'Wyjazd',
            inbound: 'Przyjazd',
            door: 'Brama',
            dropTrailerAt: 'Zostaw przyczepę przy',
            dropSwapBodyAt: 'Zostaw nadwozie wymienne przy',
            parkAt: 'Parkuj przy',
            andWaitInLounge: 'i czekaj w poczekalni dla kierowców',
            dropAndExit: 'Zostaw przyczepę i opuść teren',
            dropSwapBodyAndExit: 'Zostaw nadwozie wymienne i opuść teren',
            pickUpAndExit: 'Odbierz przyczepę i opuść teren',
            pickUpSwapBodyAndExit: 'Odbierz nadwozie wymienne i opuść teren',
            printed: 'Wydrukowano:',
            printedBy: 'Wydrukował:',
            selectLanguage: 'Wybierz język kierowcy',
            selectSiteLanguage: 'Wybierz język witryny',
            cancel: 'Anuluj',
            pagerNo: '📟 Nr Pagera',
            pickUpTrailer: '🚛 Odbierz przyczepę',
            pickUpSwapBody: '📦 Odbierz nadwozie wymienne',
            welcomeTo: 'Witamy w Amazon',
            tip1: 'Proszę nosić kamizelkę odblaskową zapiętą.',
            tip2: 'Proszę zawsze umieszczać klin pod kołem ciężarówki.',
            tip3: 'Zawsze słuchaj Yard Marshals.',
            tip4: 'Zgłoś się do poczekalni dla kierowców po zadokowaniu lub zaparkowaniu.',
            whatShouldDriverDo: 'Co powinien zrobić kierowca?',
            parkAndWaitOption: '🅿️ Zaparkuj i czekaj w poczekalni dla kierowców',
            dockAndWaitOption: '🚛 Zadokuj przyczepę i czekaj w poczekalni dla kierowców',
            pickUpAndExitOption: '🚛 Odbierz przyczepę i wyjedź',
            pickUpSwapBodyAndExitOption: '📦 Odbierz nadwozie wymienne i wyjedź',
            dropAndSoloExitOption: '🚪 Zostaw i wyjedź samemu',
            otherOption: '✏️ Inne (niestandardowa instrukcja)',
            enterCustomInstruction: 'Wprowadź niestandardową instrukcję:',
            customInstruction: 'Specjalna instrukcja:',
            connectToTrailerAt: 'Podłącz do przyczepy przy',
            connectToSwapBodyAt: 'Podłącz do nadwozia wymiennego przy',
            soloExit: 'Opuść teren (sam)',
            swapBodyOperation: 'Operacja nadwozia wymiennego',
            dropEmpty: 'Zostaw puste',
            pickUpLoaded: 'Odbierz',
            swapBody: 'nadwozie wymienne',
            swapBodies: 'nadwozia wymienne',
            dropXEmpty: 'Zostaw {x} puste {body}',
            pickUpX: 'Odbierz {x} {body}',
            selectSwapBodyAction: 'Wybierz operację',
            currentSiteLanguage: 'Język witryny',
            changeSiteLanguage: '⚙️ Zmień język witryny'
        },
        ru: {
            yardPass: 'ПРОПУСК',
            vridIsaTrailer: '📦 VRID / ISA (Прицеп):',
            vridIsaSwapBody: '📦 VRID / ISA (Сменный кузов):',
            vridIsaTruck: '📦 VRID / ISA (Грузовик):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Прицепа:',
            trailerIds: '🎯 ID Прицепов:',
            swapBodyId: '📦 ID Сменного кузова:',
            swapBodyIds: '📦 ID Сменных кузовов:',
            truckId: '🚛 ID Грузовика:',
            dockAt: 'Причалить к',
            outbound: 'Выезд',
            inbound: 'Въезд',
            door: 'Ворота',
            dropTrailerAt: 'Оставить прицеп у',
            dropSwapBodyAt: 'Оставить сменный кузов у',
            parkAt: 'Парковать у',
            andWaitInLounge: 'и ждать в комнате отдыха для водителей',
            dropAndExit: 'Оставить прицеп и покинуть территорию',
            dropSwapBodyAndExit: 'Оставить сменный кузов и покинуть территорию',
            pickUpAndExit: 'Забрать прицеп и покинуть территорию',
            pickUpSwapBodyAndExit: 'Забрать сменный кузов и покинуть территорию',
            printed: 'Напечатано:',
            printedBy: 'Напечатал:',
            selectLanguage: 'Выберите язык водителя',
            selectSiteLanguage: 'Выберите язык сайта',
            cancel: 'Отмена',
            pagerNo: '📟 № Пейджера',
            pickUpTrailer: '🚛 Забрать прицеп',
            pickUpSwapBody: '📦 Забрать сменный кузов',
            welcomeTo: 'Добро пожаловать в Amazon',
            tip1: 'Пожалуйста, носите защитный жилет застёгнутым.',
            tip2: 'Пожалуйста, всегда подкладывайте противооткатный упор под колесо грузовика.',
            tip3: 'Всегда слушайте Yard Marshals.',
            tip4: 'После стыковки или парковки пройдите в комнату отдыха для водителей.',
            whatShouldDriverDo: 'Что должен делать водитель?',
            parkAndWaitOption: '🅿️ Припарковаться и ждать в комнате отдыха',
            dockAndWaitOption: '🚛 Пристыковать прицеп и ждать в комнате отдыха',
            pickUpAndExitOption: '🚛 Забрать прицеп и выехать',
            pickUpSwapBodyAndExitOption: '📦 Забрать сменный кузов и выехать',
            dropAndSoloExitOption: '🚪 Оставить и выехать одному',
            otherOption: '✏️ Другое (особая инструкция)',
            enterCustomInstruction: 'Введите особую инструкцию:',
            customInstruction: 'Особая инструкция:',
            connectToTrailerAt: 'Подключиться к прицепу у',
            connectToSwapBodyAt: 'Подключиться к сменному кузову у',
            soloExit: 'Покинуть территорию (один)',
            swapBodyOperation: 'Операция сменного кузова',
            dropEmpty: 'Оставить пустой',
            pickUpLoaded: 'Забрать',
            swapBody: 'сменный кузов',
            swapBodies: 'сменных кузова',
            dropXEmpty: 'Оставить {x} пустых {body}',
            pickUpX: 'Забрать {x} {body}',
            selectSwapBodyAction: 'Выберите операцию',
            currentSiteLanguage: 'Язык сайта',
            changeSiteLanguage: '⚙️ Изменить язык сайта'
        },
        ro: {
            yardPass: 'PERMIS DE CURTE',
            vridIsaTrailer: '📦 VRID / ISA (Remorcă):',
            vridIsaSwapBody: '📦 VRID / ISA (Caroserie interschimbabilă):',
            vridIsaTruck: '📦 VRID / ISA (Camion):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Remorcă:',
            trailerIds: '🎯 ID Remorci:',
            swapBodyId: '📦 ID Caroserie interschimbabilă:',
            swapBodyIds: '📦 ID Caroserii interschimbabile:',
            truckId: '🚛 ID Camion:',
            dockAt: 'Andocare la',
            outbound: 'Ieșire',
            inbound: 'Intrare',
            door: 'Poartă',
            dropTrailerAt: 'Lasă remorca la',
            dropSwapBodyAt: 'Lasă caroseria interschimbabilă la',
            parkAt: 'Parchează la',
            andWaitInLounge: 'și așteaptă în sala de așteptare pentru șoferi',
            dropAndExit: 'Lasă remorca și părăsește curtea',
            dropSwapBodyAndExit: 'Lasă caroseria interschimbabilă și părăsește curtea',
            pickUpAndExit: 'Ridică remorca și părăsește curtea',
            pickUpSwapBodyAndExit: 'Ridică caroseria interschimbabilă și părăsește curtea',
            printed: 'Tipărit:',
            printedBy: 'Tipărit de:',
            selectLanguage: 'Selectați limba șoferului',
            selectSiteLanguage: 'Selectați limba site-ului',
            cancel: 'Anulare',
            pagerNo: '📟 Nr. Pager',
            pickUpTrailer: '🚛 Ridică remorca',
            pickUpSwapBody: '📦 Ridică caroseria interschimbabilă',
            welcomeTo: 'Bine ați venit la Amazon',
            tip1: 'Vă rugăm să purtați vesta de siguranță închisă.',
            tip2: 'Vă rugăm să puneți întotdeauna pana de blocare sub roata camionului.',
            tip3: 'Ascultați întotdeauna de Yard Marshals.',
            tip4: 'Prezentați-vă la sala de așteptare pentru șoferi după ce ați andocat sau parcat.',
            whatShouldDriverDo: 'Ce ar trebui să facă șoferul?',
            parkAndWaitOption: '🅿️ Parchează și așteaptă în sala de așteptare',
            dockAndWaitOption: '🚛 Andochează remorca și așteaptă în sala de așteptare',
            pickUpAndExitOption: '🚛 Ridică remorca și ieși',
            pickUpSwapBodyAndExitOption: '📦 Ridică caroseria interschimbabilă și ieși',
            dropAndSoloExitOption: '🚪 Lasă și ieși singur',
            otherOption: '✏️ Altele (instrucțiune personalizată)',
            enterCustomInstruction: 'Introduceți instrucțiunea personalizată:',
            customInstruction: 'Instrucțiune specială:',
            connectToTrailerAt: 'Conectați-vă la remorcă la',
            connectToSwapBodyAt: 'Conectați-vă la caroseria interschimbabilă la',
            soloExit: 'Părăsiți curtea (singur)',
            swapBodyOperation: 'Operațiune caroserie interschimbabilă',
            dropEmpty: 'Lasă goală',
            pickUpLoaded: 'Ridică',
            swapBody: 'caroserie interschimbabilă',
            swapBodies: 'caroserii interschimbabile',
            dropXEmpty: 'Lasă {x} {body} goală/e',
            pickUpX: 'Ridică {x} {body}',
            selectSwapBodyAction: 'Selectați operațiunea',
            currentSiteLanguage: 'Limba site-ului',
            changeSiteLanguage: '⚙️ Schimbați limba site-ului'
        },
        uk: {
            yardPass: 'ПЕРЕПУСТКА',
            vridIsaTrailer: '📦 VRID / ISA (Причіп):',
            vridIsaSwapBody: '📦 VRID / ISA (Змінний кузов):',
            vridIsaTruck: '📦 VRID / ISA (Вантажівка):',
            vridIsa: '📦 VRID / ISA:',
            trailerId: '🎯 ID Причепа:',
            trailerIds: '🎯 ID Причепів:',
            swapBodyId: '📦 ID Змінного кузова:',
            swapBodyIds: '📦 ID Змінних кузовів:',
            truckId: '🚛 ID Вантажівки:',
            dockAt: 'Причалити до',
            outbound: 'Виїзд',
            inbound: 'Вʼїзд',
            door: 'Ворота',
            dropTrailerAt: 'Залишити причіп біля',
            dropSwapBodyAt: 'Залишити змінний кузов біля',
            parkAt: 'Паркувати біля',
            andWaitInLounge: 'і чекати в кімнаті відпочинку для водіїв',
            dropAndExit: 'Залишити причіп і покинути територію',
            dropSwapBodyAndExit: 'Залишити змінний кузов і покинути територію',
            pickUpAndExit: 'Забрати причіп і покинути територію',
            pickUpSwapBodyAndExit: 'Забрати змінний кузов і покинути територію',
            printed: 'Надруковано:',
            printedBy: 'Надрукував:',
            selectLanguage: 'Оберіть мову водія',
            selectSiteLanguage: 'Оберіть мову сайту',
            cancel: 'Скасувати',
            pagerNo: '📟 № Пейджера',
            pickUpTrailer: '🚛 Забрати причіп',
            pickUpSwapBody: '📦 Забрати змінний кузов',
            welcomeTo: 'Ласкаво просимо до Amazon',
            tip1: 'Будь ласка, носіть захисний жилет застебнутим.',
            tip2: 'Будь ласка, завжди підкладайте противідкотний упор під колесо вантажівки.',
            tip3: 'Завжди слухайте Yard Marshals.',
            tip4: 'Після стикування або паркування пройдіть до кімнати відпочинку для водіїв.',
            whatShouldDriverDo: 'Що повинен робити водій?',
            parkAndWaitOption: '🅿️ Припаркуватися і чекати в кімнаті відпочинку',
            dockAndWaitOption: '🚛 Пристикувати причіп і чекати в кімнаті відпочинку',
            pickUpAndExitOption: '🚛 Забрати причіп і виїхати',
            pickUpSwapBodyAndExitOption: '📦 Забрати змінний кузов і виїхати',
            dropAndSoloExitOption: '🚪 Залишити і виїхати самому',
            otherOption: '✏️ Інше (особлива інструкція)',
            enterCustomInstruction: 'Введіть особливу інструкцію:',
            customInstruction: 'Особлива інструкція:',
            connectToTrailerAt: 'Підключитися до причепа біля',
            connectToSwapBodyAt: 'Підключитися до змінного кузова біля',
            soloExit: 'Покинути територію (сам)',
            swapBodyOperation: 'Операція змінного кузова',
            dropEmpty: 'Залишити порожній',
            pickUpLoaded: 'Забрати',
            swapBody: 'змінний кузов',
            swapBodies: 'змінних кузова',
            dropXEmpty: 'Залишити {x} порожніх {body}',
            pickUpX: 'Забрати {x} {body}',
            selectSwapBodyAction: 'Виберіть операцію',
            currentSiteLanguage: 'Мова сайту',
            changeSiteLanguage: '⚙️ Змінити мову сайту'
        }
    };

    const languageNames = {
        en: '🇬🇧 English',
        de: '🇩🇪 Deutsch',
        fr: '🇫🇷 Français',
        es: '🇪🇸 Español',
        it: '🇮🇹 Italiano',
        tr: '🇹🇷 Türkçe',
        ar: '🇸🇦 العربية',
        bg: '🇧🇬 Bulgarian',
        pl: '🇵🇱 Polski',
        ru: '🇷🇺 Russian',
        ro: '🇷🇴 Romanian',
        uk: '🇺🇦 Ukrainian'
    };
     // Equipment type categorization
    const trailerCompatibleTypes = ['TRACTOR'];
    const attachableTypes = ['TRAILER', 'SWAP_BODY'];

    // Equipment type constants
    const EQUIP_TYPE_TRAILER = 'TRAILER';
    const EQUIP_TYPE_SWAP_BODY = 'SWAP_BODY';

    function isTrailerCompatible(equipType) {
        return trailerCompatibleTypes.some(type => equipType.includes(type));
    }

    function isAttachable(equipType) {
        return attachableTypes.some(type => equipType.includes(type));
    }

    function isSwapBody(equipType) {
        return equipType.includes('SWAP_BODY');
    }

    function isTrailer(equipType) {
        return equipType.includes('TRAILER') && !equipType.includes('SWAP_BODY');
    }

    function isBoxTruck(equipType) {
        return equipType === 'BOX_TRUCK' ||
               (equipType.toUpperCase().includes('BOX_TRUCK') && !equipType.toUpperCase().includes('TRAILER'));
    }

    function isInboundLoad(row) {
        const location = row.querySelector('input[placeholder="Search"]')?.value || '';
        const accountType = row.querySelector('.column.wrap-text.simple-sides-padding')?.textContent || '';
        return location.startsWith('IB') || accountType.includes('Inbound');
    }

    function getUserInfo() {
        const emailElement = document.querySelector('.a-color-secondary.a-text-bold');
        return emailElement ? emailElement.textContent.trim() : 'Unknown user';
    }

    // Draggable modal functionality with position memory
    function makeDraggable(modalContent, modal) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = lastModalPosition.hasBeenMoved ? lastModalPosition.x : 0;
        let yOffset = lastModalPosition.hasBeenMoved ? lastModalPosition.y : 0;

        if (lastModalPosition.hasBeenMoved) {
            modalContent.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        }

        const dragHandle = modalContent.querySelector('.modal-drag-handle') || modalContent;

        dragHandle.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === dragHandle || dragHandle.contains(e.target)) {
                isDragging = true;
                modalContent.style.cursor = 'grabbing';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                modalContent.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd(e) {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                lastModalPosition = {
                    x: xOffset,
                    y: yOffset,
                    hasBeenMoved: true
                };
                try {
                    localStorage.setItem('yardPassModalPosition', JSON.stringify(lastModalPosition));
                } catch (err) {
                    console.log('Could not save modal position to storage');
                }
            }
            isDragging = false;
            modalContent.style.cursor = 'grab';
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        .copy-button {
            cursor: pointer;
            margin-left: 4px;
            padding: 2px;
            vertical-align: middle;
            opacity: 0.7;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
            position: relative;
            z-index: 1000;
            background: none;
            border: none;
            min-width: 16px;
            min-height: 16px;
        }
        .copy-button:hover {
            opacity: 1;
            background-color: rgba(0,0,0,0.1);
            border-radius: 3px;
        }
        .copy-success {
            background-color: #0f8 !important;
            border-radius: 3px;
            transition: background-color 0.3s;
        }
        .copy-button svg {
            width: 14px;
            height: 14px;
            vertical-align: middle;
            fill: currentColor;
        }
        .language-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .language-modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            min-width: 350px;
            max-width: 550px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            cursor: grab;
            user-select: none;
            position: relative;
        }
        .language-modal-content:active {
            cursor: grabbing;
        }
        .modal-drag-handle {
            padding: 10px 0;
            margin-bottom: 10px;
            border-bottom: 2px solid #eee;
            cursor: grab;
        }
        .modal-drag-handle:active {
            cursor: grabbing;
        }
        .drag-hint {
            font-size: 11px;
            color: #999;
            text-align: center;
            margin-bottom: 5px;
        }
        .language-modal-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            color: #232f3e;
        }
        .language-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        .language-btn {
            padding: 12px 16px;
            border: 2px solid #ddd;
            border-radius: 6px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            text-align: center;
        }
        .language-btn:hover {
            background: #ff9900;
            border-color: #ff9900;
            color: white;
        }
        .language-btn.selected {
            background: #232f3e;
            border-color: #232f3e;
            color: white;
        }
        .language-cancel-btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 6px;
            background: #ddd;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .language-cancel-btn:hover {
            background: #ccc;
        }
        .language-cancel-btn[title]:hover {
            background: #5a6268;
        }
        .site-language-indicator {
            background: #e7f3ff;
            border: 2px solid #007bff;
            border-radius: 6px;
            padding: 10px 15px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .site-language-label {
            font-size: 14px;
            color: #004085;
            font-weight: 500;
        }
        .site-language-value {
            font-size: 14px;
            font-weight: bold;
            color: #004085;
        }
        .change-site-lang-btn {
            padding: 8px 15px;
            border: 2px solid #007bff;
            border-radius: 6px;
            background: white;
            color: #007bff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            margin-bottom: 15px;
            width: 100%;
        }
        .change-site-lang-btn:hover {
            background: #007bff;
            color: white;
        }
        .driver-action-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .driver-action-modal-content {
            background: white;
            padding: 25px;
            border-radius: 8px;
            min-width: 400px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            cursor: grab;
            user-select: none;
            position: relative;
        }
        .driver-action-modal-content:active {
            cursor: grabbing;
        }
        .driver-action-modal-title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            color: #232f3e;
        }
        .driver-action-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 15px;
        }
        .driver-action-btn {
            padding: 15px 20px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.2s;
            text-align: left;
        }
        .driver-action-btn:hover {
            background: #ff9900;
            border-color: #ff9900;
            color: white;
        }
        .driver-action-btn.park-wait:hover,
        .driver-action-btn.dock-wait:hover {
            background: #28a745;
            border-color: #28a745;
        }
        .driver-action-btn.pickup-exit:hover {
            background: #007bff;
            border-color: #007bff;
        }
        .driver-action-btn.drop-solo-exit:hover {
            background: #dc3545;
            border-color: #dc3545;
        }
        .driver-action-btn.other:hover {
            background: #6c757d;
            border-color: #6c757d;
        }
        .custom-instruction-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            margin-top: 10px;
            display: none;
            cursor: text;
        }
        .custom-instruction-input.visible {
            display: block;
        }
        .custom-instruction-submit {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 6px;
            background: #ff9900;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
            display: none;
        }
        .custom-instruction-submit.visible {
            display: block;
        }
        .custom-instruction-submit:hover {
            background: #e88a00;
        }
        .swap-body-modal-content {
            background: white;
            padding: 25px;
            border-radius: 8px;
            min-width: 450px;
            max-width: 550px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            cursor: grab;
            user-select: none;
            position: relative;
        }
        .swap-body-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        .swap-body-btn {
            padding: 12px 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            text-align: center;
        }
        .swap-body-btn:hover {
            background: #17a2b8;
            border-color: #17a2b8;
            color: white;
        }
        .swap-body-btn.exchange:hover {
            background: #28a745;
            border-color: #28a745;
        }
        .swap-body-btn.drop-only:hover {
            background: #ffc107;
            border-color: #ffc107;
            color: #212529;
        }
        .swap-body-btn.pickup-only:hover {
            background: #007bff;
            border-color: #007bff;
        }
        .swap-body-section-title {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            margin: 15px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
        }
        .section-divider {
            border-top: 2px solid #eee;
            margin: 15px 0;
            padding-top: 10px;
        }
        .language-section-title {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);

    function createCopyButton(textToCopy) {
        const button = document.createElement('button');
        button.innerHTML = `
            <svg viewBox="0 0 16 16" width="16" height="16">
                <path d="M2 2h8v2h2V2c0-1.1-.9-2-2-2H2C.9 0 0 .9 0 2v8c0 1.1.9 2 2 2h2v-2H2V2z"/>
                <path d="M6 6v8c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2zm2 0h8v8H8V6z"/>
            </svg>`;
        button.className = 'copy-button';
        button.title = 'Copy Load ID';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(textToCopy).then(() => {
                button.classList.add('copy-success');
                setTimeout(() => button.classList.remove('copy-success'), 500);
            });
        });

        return button;
    }

    function addCopyButtonToLoadId(container) {
        const loadIdElement = container.querySelector('[data-testid="displayableLoadIdentifier"]');
        if (!loadIdElement) {
            return;
        }

        if (loadIdElement.querySelector('.copy-button')) {
            return;
        }

        const vridElement = loadIdElement.querySelector('p[title^="VRID"]');
        const isaElement = loadIdElement.querySelector('p[title^="ISA"]');
        const otherElement = loadIdElement.querySelector('p.css-198b8k6');

        let targetElement = null;
        let textContent = '';

        if (vridElement) {
            targetElement = vridElement;
            textContent = vridElement.textContent.trim().replace('VRID ', '').replace('ISA ', '');
        } else if (isaElement) {
            targetElement = isaElement;
            textContent = isaElement.textContent.trim().replace('VRID ', '').replace('ISA ', '');
        } else if (otherElement) {
            targetElement = otherElement;
            textContent = otherElement.textContent.replace('Scheduled', '').trim();
        }

        if (targetElement && textContent && textContent !== '---') {
            const copyBtn = createCopyButton(textContent);
            targetElement.style.position = 'relative';
            targetElement.appendChild(copyBtn);
        }
    }

    // Check if we need to ask the driver action question
    function needsDriverActionQuestion(data) {
        // BOX_TRUCK (rigid trucks like 7.5t, 18t) don't need the driver action question
        if (data.truck.isBoxTruck) {
            return false;
        }

        // Use the ORIGINAL truck VRID status (before copying from trailer)
        const truckHasVrid = data.truck.hasOwnVrid;

        // Condition 1: Single unit (truck alone) with VRID - needs to pick up something
        if (data.isSingleUnit && truckHasVrid) {
            return true;
        }

        // Check if truck is going to parking (not a dock)
        const truckIsGoingToParking = !isDockLocation(data.truck.spot);

        // Condition 2a: Trailer has different VRID and TRUCK is going to parking (combi tour)
        const hasDifferentVridAndTruckParking = truckHasVrid && data.attachables.some(attachable => {
            const attachableHasVrid = attachable.vrid && attachable.vrid !== '---' && attachable.vrid.trim() !== '';
            const isDifferentVrid = attachableHasVrid && attachable.vrid !== data.truck.vrid;
            return isDifferentVrid && truckIsGoingToParking;
        });

        // Condition 2b: Trailer has no VRID (but truck has VRID) and truck is going to parking
        const trailerHasNoVridAndTruckParking = truckHasVrid && truckIsGoingToParking &&
            data.attachables.length > 0 &&
            data.attachables.every(attachable => {
                return !attachable.vrid || attachable.vrid === '---' || attachable.vrid.trim() === '';
            });

        // Condition 3: Trailer has VRID but truck doesn't - driver might drop and solo exit
        const trailerHasVridTruckDoesnt = !truckHasVrid && data.attachables.some(attachable => {
            const attachableHasVrid = attachable.vrid && attachable.vrid !== '---' && attachable.vrid.trim() !== '';
            return attachableHasVrid;
        });

        return hasDifferentVridAndTruckParking || trailerHasNoVridAndTruckParking || trailerHasVridTruckDoesnt;
    }

    // Check if swap body operation modal is needed
    function needsSwapBodyOperationQuestion(data) {
        return data.hasSwapBodies;
    }

    // Determine which options to show in driver action modal
    function getDriverActionOptions(data) {
        const options = {
            showParkAndWait: false,
            showDockAndWait: false,
            showPickupAndExit: false,
            showDropAndSoloExit: false,
            showOther: true
        };

        const truckHasVrid = data.truck.hasOwnVrid;
        const attachableHasVrid = data.attachables.some(attachable => {
            return attachable.vrid && attachable.vrid !== '---' && attachable.vrid.trim() !== '';
        });

        // Check if going to dock or parking
        const isGoingToDock = isDockLocation(data.truck.spot) ||
            data.attachables.some(a => isDockLocation(a.spot));
        const isGoingToParking = !isDockLocation(data.truck.spot);

        // Single unit with VRID - show pickup and exit
        if (data.isSingleUnit && truckHasVrid) {
            options.showParkAndWait = true;
            options.showPickupAndExit = true;
        }

        // Truck has VRID (combi tour scenarios) - show pickup and exit
        if (truckHasVrid && !data.isSingleUnit) {
            options.showParkAndWait = true;
            options.showPickupAndExit = true;
        }

        // Trailer has VRID but truck doesn't - KEY SCENARIO
        if (!truckHasVrid && attachableHasVrid) {
            // If going to dock - show "Dock and Wait" option
            if (isGoingToDock) {
                options.showDockAndWait = true;
            }
            // If going to parking - show "Park and Wait" option
            if (isGoingToParking) {
                options.showParkAndWait = true;
            }
            // Always show drop and solo exit for this scenario
            options.showDropAndSoloExit = true;
            options.showPickupAndExit = false; // Can't pick up if they don't have a VRID
        }

        return options;
    }

    // Show Site Language Selection Modal
    function showSiteLanguageModal(callback) {
        const modal = document.createElement('div');
        modal.className = 'language-modal';

        const content = document.createElement('div');
        content.className = 'language-modal-content';

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'modal-drag-handle';

        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = '⋮⋮ Drag to move ⋮⋮';

        const title = document.createElement('div');
        title.className = 'language-modal-title';
        title.textContent = '⚙️ Select Site Language';

        dragHandle.appendChild(dragHint);
        dragHandle.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'language-grid';

        Object.keys(languageNames).forEach(langCode => {
            const btn = document.createElement('button');
            btn.className = 'language-btn';
            if (langCode === siteLanguage) {
                btn.classList.add('selected');
            }
            btn.textContent = languageNames[langCode];
            btn.addEventListener('click', () => {
                saveSiteLanguage(langCode);
                document.body.removeChild(modal);
                callback(langCode);
            });
            grid.appendChild(btn);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'language-cancel-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(null);
        });

        content.appendChild(dragHandle);
        content.appendChild(grid);
        content.appendChild(cancelBtn);
        modal.appendChild(content);

        // Make modal draggable
        makeDraggable(content, modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                callback(null);
            }
        });

        document.body.appendChild(modal);
    }

    function showSwapBodyOperationModal(data, callback) {
        const modal = document.createElement('div');
        modal.className = 'driver-action-modal';

        const content = document.createElement('div');
        content.className = 'swap-body-modal-content';

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'modal-drag-handle';

        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = '⋮⋮ Drag to move ⋮⋮';

        const title = document.createElement('div');
        title.className = 'driver-action-modal-title';
        title.textContent = '📦 Select Swap Body Operation';

        dragHandle.appendChild(dragHint);
        dragHandle.appendChild(title);

        const options = document.createElement('div');
        options.className = 'driver-action-options';

        // Section: Exchange Operations
        const exchangeTitle = document.createElement('div');
        exchangeTitle.className = 'swap-body-section-title';
        exchangeTitle.textContent = '🔄 Exchange Operations';

        const exchangeGrid = document.createElement('div');
        exchangeGrid.className = 'swap-body-grid';

        // 1-for-1 exchange
        const exchange1for1Btn = document.createElement('button');
        exchange1for1Btn.className = 'swap-body-btn exchange';
        exchange1for1Btn.innerHTML = '🔄 Drop 1 empty<br>→ Pick up 1';
        exchange1for1Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 1, pickupCount: 1 });
        });

        // 2-for-2 exchange
        const exchange2for2Btn = document.createElement('button');
        exchange2for2Btn.className = 'swap-body-btn exchange';
        exchange2for2Btn.innerHTML = '🔄 Drop 2 empty<br>→ Pick up 2';
        exchange2for2Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 2, pickupCount: 2 });
        });

        // 1-for-2 exchange
        const exchange1for2Btn = document.createElement('button');
        exchange1for2Btn.className = 'swap-body-btn exchange';
        exchange1for2Btn.innerHTML = '🔄 Drop 1 empty<br>→ Pick up 2';
        exchange1for2Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 1, pickupCount: 2 });
        });

        // 2-for-1 exchange
        const exchange2for1Btn = document.createElement('button');
        exchange2for1Btn.className = 'swap-body-btn exchange';
        exchange2for1Btn.innerHTML = '🔄 Drop 2 empty<br>→ Pick up 1';
        exchange2for1Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 2, pickupCount: 1 });
        });

        exchangeGrid.appendChild(exchange1for1Btn);
        exchangeGrid.appendChild(exchange2for2Btn);
        exchangeGrid.appendChild(exchange1for2Btn);
        exchangeGrid.appendChild(exchange2for1Btn);

        // Section: Drop Only Operations
        const dropTitle = document.createElement('div');
        dropTitle.className = 'swap-body-section-title';
        dropTitle.textContent = '⬇️ Drop Only';

        const dropGrid = document.createElement('div');
        dropGrid.className = 'swap-body-grid';

        // Drop 1 only
        const drop1Btn = document.createElement('button');
        drop1Btn.className = 'swap-body-btn drop-only';
        drop1Btn.innerHTML = '⬇️ Drop 1 empty only';
        drop1Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 1, pickupCount: 0 });
        });

        // Drop 2 only
        const drop2Btn = document.createElement('button');
        drop2Btn.className = 'swap-body-btn drop-only';
        drop2Btn.innerHTML = '⬇️ Drop 2 empty only';
        drop2Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 2, pickupCount: 0 });
        });

        dropGrid.appendChild(drop1Btn);
        dropGrid.appendChild(drop2Btn);

        // Section: Pick Up Only Operations
        const pickupTitle = document.createElement('div');
        pickupTitle.className = 'swap-body-section-title';
        pickupTitle.textContent = '⬆️ Pick Up Only';

        const pickupGrid = document.createElement('div');
        pickupGrid.className = 'swap-body-grid';

        // Pickup 1 only
        const pickup1Btn = document.createElement('button');
        pickup1Btn.className = 'swap-body-btn pickup-only';
        pickup1Btn.innerHTML = '⬆️ Pick up 1 only';
        pickup1Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 0, pickupCount: 1 });
        });

        // Pickup 2 only
        const pickup2Btn = document.createElement('button');
        pickup2Btn.className = 'swap-body-btn pickup-only';
        pickup2Btn.innerHTML = '⬆️ Pick up 2 only';
        pickup2Btn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({ action: DRIVER_ACTIONS.SWAP_BODY_EXCHANGE, dropCount: 0, pickupCount: 2 });
        });

        pickupGrid.appendChild(pickup1Btn);
        pickupGrid.appendChild(pickup2Btn);

        // Section: Other
        const otherTitle = document.createElement('div');
        otherTitle.className = 'swap-body-section-title';
        otherTitle.textContent = '✏️ Other';

        // Custom instruction option
        const otherBtn = document.createElement('button');
        otherBtn.className = 'driver-action-btn other';
        otherBtn.innerHTML = '✏️ Custom instruction';
        otherBtn.style.width = '100%';

        // Custom instruction input
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'custom-instruction-input';
        customInput.placeholder = 'Enter custom instruction...';

        // Submit button for custom instruction
        const submitBtn = document.createElement('button');
        submitBtn.className = 'custom-instruction-submit';
        submitBtn.textContent = 'Use Custom Instruction';

        otherBtn.addEventListener('click', () => {
            customInput.classList.add('visible');
            submitBtn.classList.add('visible');
            customInput.focus();
        });

        submitBtn.addEventListener('click', () => {
            const customText = customInput.value.trim();
            if (customText) {
                document.body.removeChild(modal);
                callback({ action: DRIVER_ACTIONS.OTHER, customInstruction: customText });
            } else {
                customInput.style.borderColor = '#dc3545';
                customInput.placeholder = 'Please enter an instruction...';
            }
        });

        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'language-cancel-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.style.marginTop = '15px';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        content.appendChild(dragHandle);
        content.appendChild(exchangeTitle);
        content.appendChild(exchangeGrid);
        content.appendChild(dropTitle);
        content.appendChild(dropGrid);
        content.appendChild(pickupTitle);
        content.appendChild(pickupGrid);
        content.appendChild(otherTitle);
        content.appendChild(otherBtn);
        content.appendChild(customInput);
        content.appendChild(submitBtn);
        content.appendChild(cancelBtn);
        modal.appendChild(content);

        // Make modal draggable
        makeDraggable(content, modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    function showSwapBodyDriverActionModal(data, swapBodyResult, callback) {
        const modal = document.createElement('div');
        modal.className = 'driver-action-modal';

        const content = document.createElement('div');
        content.className = 'driver-action-modal-content';

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'modal-drag-handle';

        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = '⋮⋮ Drag to move ⋮⋮';

        const title = document.createElement('div');
        title.className = 'driver-action-modal-title';
        title.textContent = '🚛 What should the driver do after?';

        dragHandle.appendChild(dragHint);
        dragHandle.appendChild(title);

        const options = document.createElement('div');
        options.className = 'driver-action-options';

        // Option 1: Park and Wait
        const parkWaitBtn = document.createElement('button');
        parkWaitBtn.className = 'driver-action-btn park-wait';
        parkWaitBtn.innerHTML = '🅿️ <strong>1.</strong> Park up and wait in the trucker lounge';
        parkWaitBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({
                ...swapBodyResult,
                driverAction: DRIVER_ACTIONS.PARK_AND_WAIT
            });
        });

        // Option 2: Collect/Pick up and Exit
        const pickupExitBtn = document.createElement('button');
        pickupExitBtn.className = 'driver-action-btn pickup-exit';
        pickupExitBtn.innerHTML = '📦 <strong>2.</strong> Collect swap body and exit';
        pickupExitBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback({
                ...swapBodyResult,
                driverAction: DRIVER_ACTIONS.PICKUP_AND_EXIT
            });
        });

        // Option 3: Other
        const otherBtn = document.createElement('button');
        otherBtn.className = 'driver-action-btn other';
        otherBtn.innerHTML = '✏️ <strong>3.</strong> Other (custom instruction)';

        // Custom instruction input
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'custom-instruction-input';
        customInput.placeholder = 'Enter custom instruction...';

        // Submit button for custom instruction
        const submitBtn = document.createElement('button');
        submitBtn.className = 'custom-instruction-submit';
        submitBtn.textContent = 'Use Custom Instruction';

        otherBtn.addEventListener('click', () => {
            customInput.classList.add('visible');
            submitBtn.classList.add('visible');
            customInput.focus();
        });

        submitBtn.addEventListener('click', () => {
            const customText = customInput.value.trim();
            if (customText) {
                document.body.removeChild(modal);
                callback({
                    ...swapBodyResult,
                    driverAction: DRIVER_ACTIONS.OTHER,
                    customInstruction: customText
                });
            } else {
                customInput.style.borderColor = '#dc3545';
                customInput.placeholder = 'Please enter an instruction...';
            }
        });

        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'language-cancel-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.style.marginTop = '15px';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        options.appendChild(parkWaitBtn);
        options.appendChild(pickupExitBtn);
        options.appendChild(otherBtn);

        content.appendChild(dragHandle);
        content.appendChild(options);
        content.appendChild(customInput);
        content.appendChild(submitBtn);
        content.appendChild(cancelBtn);
        modal.appendChild(content);

        // Make modal draggable
        makeDraggable(content, modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    function showDriverActionModal(data, callback) {
        const modal = document.createElement('div');
        modal.className = 'driver-action-modal';

        const content = document.createElement('div');
        content.className = 'driver-action-modal-content';

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'modal-drag-handle';

        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = '⋮⋮ Drag to move ⋮⋮';

        const title = document.createElement('div');
        title.className = 'driver-action-modal-title';
        title.textContent = '🚛 What should the driver do?';

        dragHandle.appendChild(dragHint);
        dragHandle.appendChild(title);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'driver-action-options';

        // Get which options to show
        const actionOptions = getDriverActionOptions(data);

        const hasOnlySwapBodies = data.hasSwapBodies && !data.hasTrailers;

        let optionNumber = 1;

        // Option: Park and Wait (always shown)
        if (actionOptions.showParkAndWait) {
            const parkWaitBtn = document.createElement('button');
            parkWaitBtn.className = 'driver-action-btn park-wait';
            parkWaitBtn.innerHTML = `🅿️ <strong>${optionNumber}.</strong> Park up and wait in the trucker lounge`;
            parkWaitBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                callback({ action: DRIVER_ACTIONS.PARK_AND_WAIT });
            });
            optionsDiv.appendChild(parkWaitBtn);
            optionNumber++;
        }

        // Option: Pick up and Exit
        if (actionOptions.showPickupAndExit) {
            const pickupExitBtn = document.createElement('button');
            pickupExitBtn.className = 'driver-action-btn pickup-exit';
            const equipmentType = hasOnlySwapBodies ? 'swap body' : 'trailer';
            pickupExitBtn.innerHTML = `🚛 <strong>${optionNumber}.</strong> Pick up ${equipmentType} and exit`;
            pickupExitBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                callback({ action: DRIVER_ACTIONS.PICKUP_AND_EXIT });
            });
            optionsDiv.appendChild(pickupExitBtn);
            optionNumber++;
        }

        // Option: Dock and Wait (NEW - for docking scenarios where trailer has VRID but truck doesn't)
        if (actionOptions.showDockAndWait) {
            const dockWaitBtn = document.createElement('button');
            dockWaitBtn.className = 'driver-action-btn dock-wait';
            dockWaitBtn.innerHTML = `🚛 <strong>${optionNumber}.</strong> Dock trailer and wait in the trucker lounge`;
            dockWaitBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                callback({ action: DRIVER_ACTIONS.DOCK_AND_WAIT });
            });
            optionsDiv.appendChild(dockWaitBtn);
            optionNumber++;
        }

        // Option: Drop and Solo Exit (NEW - for trailer with VRID, truck without)
        if (actionOptions.showDropAndSoloExit) {
            const dropSoloExitBtn = document.createElement('button');
            dropSoloExitBtn.className = 'driver-action-btn drop-solo-exit';
            dropSoloExitBtn.innerHTML = `🚪 <strong>${optionNumber}.</strong> Drop off and solo exit`;
            dropSoloExitBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                callback({ action: DRIVER_ACTIONS.DROP_AND_SOLO_EXIT });
            });
            optionsDiv.appendChild(dropSoloExitBtn);
            optionNumber++;
        }

        // Option: Other (always shown)
        if (actionOptions.showOther) {
            const otherBtn = document.createElement('button');
            otherBtn.className = 'driver-action-btn other';
            otherBtn.innerHTML = `✏️ <strong>${optionNumber}.</strong> Other (custom instruction)`;

            // Custom instruction input
            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.className = 'custom-instruction-input';
            customInput.placeholder = 'Enter custom instruction...';

            // Submit button for custom instruction
            const submitBtn = document.createElement('button');
            submitBtn.className = 'custom-instruction-submit';
            submitBtn.textContent = 'Use Custom Instruction';

            otherBtn.addEventListener('click', () => {
                customInput.classList.add('visible');
                submitBtn.classList.add('visible');
                customInput.focus();
            });

            submitBtn.addEventListener('click', () => {
                const customText = customInput.value.trim();
                if (customText) {
                    document.body.removeChild(modal);
                    callback({ action: DRIVER_ACTIONS.OTHER, customInstruction: customText });
                } else {
                    customInput.style.borderColor = '#dc3545';
                    customInput.placeholder = 'Please enter an instruction...';
                }
            });

            customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitBtn.click();
                }
            });

            optionsDiv.appendChild(otherBtn);
            content.appendChild(dragHandle);
            content.appendChild(optionsDiv);
            content.appendChild(customInput);
            content.appendChild(submitBtn);
        } else {
            content.appendChild(dragHandle);
            content.appendChild(optionsDiv);
        }

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'language-cancel-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.style.marginTop = '15px';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        content.appendChild(cancelBtn);
        modal.appendChild(content);

        // Make modal draggable
        makeDraggable(content, modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    // UPDATED: Language modal now shows site language and allows changing it
    function showLanguageModal(callback) {
        const modal = document.createElement('div');
        modal.className = 'language-modal';

        const content = document.createElement('div');
        content.className = 'language-modal-content';

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'modal-drag-handle';

        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = '⋮⋮ Drag to move ⋮⋮';

        const title = document.createElement('div');
        title.className = 'language-modal-title';
        title.textContent = '🌐 Select Driver Language';

        dragHandle.appendChild(dragHint);
        dragHandle.appendChild(title);

        // Site language indicator
        const siteLanguageIndicator = document.createElement('div');
        siteLanguageIndicator.className = 'site-language-indicator';

        const siteLanguageLabel = document.createElement('span');
        siteLanguageLabel.className = 'site-language-label';
        siteLanguageLabel.textContent = '🏢 Site Language:';

        const siteLanguageValue = document.createElement('span');
        siteLanguageValue.className = 'site-language-value';
        siteLanguageValue.textContent = languageNames[siteLanguage];

        siteLanguageIndicator.appendChild(siteLanguageLabel);
        siteLanguageIndicator.appendChild(siteLanguageValue);

        // Change site language button
        const changeSiteLangBtn = document.createElement('button');
        changeSiteLangBtn.className = 'change-site-lang-btn';
        changeSiteLangBtn.textContent = '⚙️ Change Site Language';
        changeSiteLangBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            showSiteLanguageModal((newSiteLang) => {
                if (newSiteLang) {
                    // Re-open the driver language modal with updated site language
                    showLanguageModal(callback);
                } else {
                    // User cancelled, re-open the driver language modal
                    showLanguageModal(callback);
                }
            });
        });

        // Driver language section title
        const driverLangTitle = document.createElement('div');
        driverLangTitle.className = 'language-section-title';
        driverLangTitle.textContent = '🚛 Select driver\'s preferred language:';

        const grid = document.createElement('div');
        grid.className = 'language-grid';

        Object.keys(languageNames).forEach(langCode => {
            const btn = document.createElement('button');
            btn.className = 'language-btn';
            btn.textContent = languageNames[langCode];
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
                callback(langCode);
            });
            grid.appendChild(btn);
        });

        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'language-cancel-btn';
        cancelBtn.textContent = '❌ Cancel / Abbrechen';
        cancelBtn.style.flex = '1';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        const resetPosBtn = document.createElement('button');
        resetPosBtn.className = 'language-cancel-btn';
        resetPosBtn.textContent = '🎯 Center';
        resetPosBtn.title = 'Reset modal position to center';
        resetPosBtn.style.cssText = 'flex: 0 0 80px; background: #6c757d; color: white;';
        resetPosBtn.addEventListener('click', () => {
            content.style.transform = 'translate(0px, 0px)';
            lastModalPosition = { x: 0, y: 0, hasBeenMoved: false };
            try {
                localStorage.removeItem('yardPassModalPosition');
            } catch (err) {}
        });

        buttonRow.appendChild(cancelBtn);
        buttonRow.appendChild(resetPosBtn);

        content.appendChild(dragHandle);
        content.appendChild(siteLanguageIndicator);
        content.appendChild(changeSiteLangBtn);
        content.appendChild(driverLangTitle);
        content.appendChild(grid);
        content.appendChild(buttonRow);
        modal.appendChild(content);

        // Make modal draggable
        makeDraggable(content, modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }
     function createPrintButtons() {
        const instances = document.querySelectorAll('.gate-operation-summary-new');

        instances.forEach((instance, index) => {
            const footer = instance.querySelector('[data-testid="gateOperationSummaryFooter"]');
            if (!footer) {
                return;
            }

            const buttonContainer = footer.querySelector('.css-ooy9n5');
            if (!buttonContainer) {
                return;
            }

            if (buttonContainer.querySelector('[data-testid="yardPassButton"]')) {
                return;
            }

            const printBtn = document.createElement('button');
            printBtn.setAttribute('data-testid', 'yardPassButton');
            printBtn.setAttribute('title', `Yard Pass Generator v${VERSION} (prints to system default printer)`);
            printBtn.className = 'css-1c9kgxj';
            Object.assign(printBtn.style, {
                backgroundColor: '#FFEB3B',
                color: '#000000',
                marginRight: '8px'
            });

            printBtn.innerHTML = `
                <span class="css-147c4zy">
                    <span aria-label="" role="img" aria-hidden="true" class="css-34iy07">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M13 4V1H3v3H0v7h3v3h10v-3h3V4h-3zm-1-2v2H4V2h8zM4 14v-4h8v4H4z" fill="currentColor"/>
                        </svg>
                    </span>
                </span>
                <span>Yard Pass</span>
            `;

            printBtn.addEventListener('click', () => handlePrintForInstance(instance));
            buttonContainer.insertBefore(printBtn, buttonContainer.firstChild);

            const checkInBtn = instance.querySelector('[data-testid="checkInButton"]');
            if (checkInBtn && !checkInBtn.disabled) {
                checkInBtn.disabled = true;
                checkInBtn.title = 'Please print Yard Pass before checking in';
                checkInBtn.style.cursor = 'not-allowed';
            }

            const loadIdContainers = instance.querySelectorAll('.loading-indicator');
            loadIdContainers.forEach(addCopyButtonToLoadId);
        });
    }

    function isValidLoadId(loadIdText) {
        if (!loadIdText) return false;

        const upperLoadId = loadIdText.toString().toUpperCase();

        if (upperLoadId.startsWith('VRID') || upperLoadId.startsWith('ISA')) return true;

        return validNonVridIds.includes(upperLoadId);
    }

    function isDockLocation(location) {
        return location && (location.startsWith('OB') || location.startsWith('IB'));
    }

    function extractLoadId(row) {
        const loadIdElement = row.querySelector('[data-testid="displayableLoadIdentifier"] p[title^="VRID"], [data-testid="displayableLoadIdentifier"] p[title^="ISA"]');
        if (loadIdElement) return loadIdElement.textContent;

        const otherIdElement = row.querySelector('[data-testid="displayableLoadIdentifier"] p');
        return otherIdElement?.textContent?.replace('Scheduled', '').trim() || '---';
    }

    function extractBothLoadIds(row) {
        const vridElement = row.querySelector('[data-testid="displayableLoadIdentifier"] p[title^="VRID"]');
        const isaElement = row.querySelector('[data-testid="displayableLoadIdentifier"] p[title^="ISA"]');

        return {
            vrid: vridElement ? vridElement.textContent.trim() : null,
            isa: isaElement ? isaElement.textContent.trim() : null
        };
    }

    function validateInstanceData(instance, driverAction = null) {
        const errors = [];
        const equipmentRows = instance.querySelectorAll('[data-testid="gateOperationEquipmentRow"]');

        // Determine if this is a drop and exit scenario based on driver action
        const isDropAndExit = driverAction && driverAction.action === DRIVER_ACTIONS.DROP_AND_SOLO_EXIT;

        equipmentRows.forEach(row => {
            const equipType = row.querySelector('[data-testid="equipmentTypeImage"]')?.alt || '';
            const locationInput = row.querySelector('input[placeholder="Search"]');

            if (!isAttachable(equipType)) {
                if (!locationInput?.value) {
                    errors.push(`Missing parking location for ${equipType}`);
                }
            }

            if (isAttachable(equipType)) {
                const loadIdText = extractLoadId(row);
                if (!isValidLoadId(loadIdText)) {
                    errors.push(`Missing or invalid Load ID for ${equipType}`);
                }
            }
        });

        return errors;
    }

    function extractInstanceData(instance) {
        const data = {
            truck: { plate: null, spot: null, loadId: null, vrid: null, isa: null, hasOwnVrid: false },
            trailers: [],
            swapBodies: [],
            attachables: [],
            isSingleUnit: false,
            hasTrailers: false,
            hasSwapBodies: false,
            siteCode: getSiteCode(),
            gateOpId: instance.querySelector('.gate-operation-identifier')?.textContent || '',
            printTime: new Date().toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
            printedBy: getUserInfo()
        };

        const rows = instance.querySelectorAll('[data-testid="gateOperationEquipmentRow"]');

        rows.forEach(row => {
            const equipType = row.querySelector('[data-testid="equipmentTypeImage"]')?.alt || '';

            if (isTrailerCompatible(equipType) || (!isTrailerCompatible(equipType) && !isAttachable(equipType))) {
                data.truck.plate = row.querySelector('[data-testid="licensePlateNumber"]')?.textContent || '---';
                const spotInput = row.querySelector('input[placeholder="Search"]');
                data.truck.spot = spotInput ? spotInput.value : '---';

                // Always extract truck's own VRID/ISA first
                data.truck.loadId = extractLoadId(row);
                const truckBothIds = extractBothLoadIds(row);
                data.truck.vrid = truckBothIds.vrid;
                data.truck.isa = truckBothIds.isa;
                // Track if truck has its own VRID (BEFORE any copying from trailer)
                data.truck.hasOwnVrid = !!(data.truck.vrid && data.truck.vrid !== '---' && data.truck.vrid.trim() !== '');

                data.truck.isDock = isDockLocation(data.truck.spot);
                data.truck.isBoxTruck = isBoxTruck(equipType);
            } else if (isAttachable(equipType)) {
                const attachableData = {
                    id: row.querySelector('[data-testid="trailerId"]')?.textContent || '---',
                    spot: null,
                    loadId: null,
                    vrid: null,
                    isa: null,
                    isDock: false,
                    equipmentType: isSwapBody(equipType) ? EQUIP_TYPE_SWAP_BODY : EQUIP_TYPE_TRAILER
                };
                const spotInput = row.querySelector('input[placeholder="Search"]');
                attachableData.spot = spotInput ? spotInput.value : '---';
                attachableData.loadId = extractLoadId(row);
                const bothIds = extractBothLoadIds(row);
                attachableData.vrid = bothIds.vrid;
                attachableData.isa = bothIds.isa;
                attachableData.isDock = isDockLocation(attachableData.spot);

                data.attachables.push(attachableData);

                if (attachableData.equipmentType === EQUIP_TYPE_SWAP_BODY) {
                    data.swapBodies.push(attachableData);
                    data.hasSwapBodies = true;
                } else {
                    data.trailers.push(attachableData);
                    data.hasTrailers = true;
                }

                // Only copy from trailer if truck doesn't have its own VRID
                const truckHasOwnVrid = data.truck.vrid && data.truck.vrid !== '---' && data.truck.vrid.trim() !== '';
                if (!truckHasOwnVrid && (attachableData.vrid || attachableData.isa)) {
                    data.truck.loadId = attachableData.loadId;
                    data.truck.vrid = attachableData.vrid;
                    data.truck.isa = attachableData.isa;
                }
            }
        });

        data.isSingleUnit = data.attachables.length === 0;

        if (data.trailers.length > 0) {
            data.trailer = data.trailers[0];
        } else if (data.swapBodies.length > 0) {
            data.trailer = data.swapBodies[0];
        } else {
            data.trailer = { id: null, spot: null, loadId: null, vrid: null, isa: null };
        }

        return data;
    }

    function getSiteCode() {
        const hash = window.location.hash;
        if (hash) {
            return hash.split('/')[1];
        }
        return window.location.pathname.split('/')[3];
    }

    function handlePrintForInstance(instance) {
        const data = extractInstanceData(instance);

        // Check if swap body operation modal is needed (for swap bodies)
        if (needsSwapBodyOperationQuestion(data)) {
            showSwapBodyOperationModal(data, (swapBodyResult) => {
                const isDropOnly = swapBodyResult.dropCount > 0 && swapBodyResult.pickupCount === 0;

                if (isDropOnly) {
                    const errors = validateInstanceData(instance, swapBodyResult);
                    if (errors.length > 0) {
                        alert('Please resolve the following before printing:\n\n' + errors.join('\n'));
                        return;
                    }

                    showLanguageModal((selectedLang) => {
                        generateYardPass(data, selectedLang, swapBodyResult);

                        const checkInBtn = instance.querySelector('[data-testid="checkInButton"]');
                        if (checkInBtn) {
                            checkInBtn.disabled = false;
                            checkInBtn.title = '';
                            checkInBtn.style.cursor = 'pointer';
                        }
                    });
                } else {
                    showSwapBodyDriverActionModal(data, swapBodyResult, (finalResult) => {
                        const errors = validateInstanceData(instance, finalResult);
                        if (errors.length > 0) {
                            alert('Please resolve the following before printing:\n\n' + errors.join('\n'));
                            return;
                        }

                        showLanguageModal((selectedLang) => {
                            generateYardPass(data, selectedLang, finalResult);

                            const checkInBtn = instance.querySelector('[data-testid="checkInButton"]');
                            if (checkInBtn) {
                                checkInBtn.disabled = false;
                                checkInBtn.title = '';
                                checkInBtn.style.cursor = 'pointer';
                            }
                        });
                    });
                }
            });
        }
        // Check if we need to ask driver action question
        else if (needsDriverActionQuestion(data)) {
            showDriverActionModal(data, (driverActionResult) => {
                const errors = validateInstanceData(instance, driverActionResult);
                if (errors.length > 0) {
                    alert('Please resolve the following before printing:\n\n' + errors.join('\n'));
                    return;
                }

                showLanguageModal((selectedLang) => {
                    generateYardPass(data, selectedLang, driverActionResult);

                    const checkInBtn = instance.querySelector('[data-testid="checkInButton"]');
                    if (checkInBtn) {
                        checkInBtn.disabled = false;
                        checkInBtn.title = '';
                        checkInBtn.style.cursor = 'pointer';
                    }
                });
            });
        } else {
            const errors = validateInstanceData(instance, null);
            if (errors.length > 0) {
                alert('Please resolve the following before printing:\n\n' + errors.join('\n'));
                return;
            }

            showLanguageModal((selectedLang) => {
                generateYardPass(data, selectedLang, null);

                const checkInBtn = instance.querySelector('[data-testid="checkInButton"]');
                if (checkInBtn) {
                    checkInBtn.disabled = false;
                    checkInBtn.title = '';
                    checkInBtn.style.cursor = 'pointer';
                }
            });
        }
    }

    // Helper function to generate bilingual text
    function getBilingualText(driverLang, siteL, key) {
        const driverText = translations[driverLang][key];
        const siteText = translations[siteL][key];

        // If same language, return just one
        if (driverLang === siteL) {
            return driverText;
        }

        // Return bilingual format
        return `${driverText}<br><span class="site-lang-text">${siteText}</span>`;
    }

    // Helper function to generate bilingual instruction (without HTML, just separator)
    function getBilingualInstruction(driverLang, siteL, key) {
        const driverText = translations[driverLang][key];
        const siteText = translations[siteL][key];

        if (driverLang === siteL) {
            return driverText;
        }

        return `${driverText} / ${siteText}`;
    }

    function generateSwapBodyInstructionHtml(driverT, siteT, driverAction, driverLang, siteL) {
        if (!driverAction || driverAction.action !== DRIVER_ACTIONS.SWAP_BODY_EXCHANGE) {
            return '';
        }

        const dropCount = driverAction.dropCount || 0;
        const pickupCount = driverAction.pickupCount || 0;

        let instructionClass = '';

        // Generate instruction for driver language
        const driverDropBodyWord = dropCount === 1 ? driverT.swapBody : driverT.swapBodies;
        const driverPickupBodyWord = pickupCount === 1 ? driverT.swapBody : driverT.swapBodies;

        // Generate instruction for site language
        const siteDropBodyWord = dropCount === 1 ? siteT.swapBody : siteT.swapBodies;
        const sitePickupBodyWord = pickupCount === 1 ? siteT.swapBody : siteT.swapBodies;

        let driverInstructionText = '';
        let siteInstructionText = '';

        if (dropCount > 0 && pickupCount > 0) {
            const driverDropText = driverT.dropXEmpty.replace('{x}', dropCount).replace('{body}', driverDropBodyWord);
            const driverPickupText = driverT.pickUpX.replace('{x}', pickupCount).replace('{body}', driverPickupBodyWord);
            driverInstructionText = `${driverDropText} → ${driverPickupText}`;

            const siteDropText = siteT.dropXEmpty.replace('{x}', dropCount).replace('{body}', siteDropBodyWord);
            const sitePickupText = siteT.pickUpX.replace('{x}', pickupCount).replace('{body}', sitePickupBodyWord);
            siteInstructionText = `${siteDropText} → ${sitePickupText}`;

            instructionClass = 'swap-instruction exchange';
        } else if (dropCount > 0 && pickupCount === 0) {
            driverInstructionText = driverT.dropXEmpty.replace('{x}', dropCount).replace('{body}', driverDropBodyWord);
            siteInstructionText = siteT.dropXEmpty.replace('{x}', dropCount).replace('{body}', siteDropBodyWord);
            instructionClass = 'swap-instruction drop-only';
        } else if (dropCount === 0 && pickupCount > 0) {
            driverInstructionText = driverT.pickUpX.replace('{x}', pickupCount).replace('{body}', driverPickupBodyWord);
            siteInstructionText = siteT.pickUpX.replace('{x}', pickupCount).replace('{body}', sitePickupBodyWord);
            instructionClass = 'swap-instruction pickup-only';
        }

        if (driverInstructionText) {
            const labelText = driverLang === siteL
                ? driverT.swapBodyOperation
                : `${driverT.swapBodyOperation} / ${siteT.swapBodyOperation}`;

            const instructionContent = driverLang === siteL
                ? driverInstructionText
                : `${driverInstructionText}<br><span class="site-lang-text">${siteInstructionText}</span>`;

            return `
            <div class="info-box">
                <div class="info-label">📦 ${labelText}:</div>
                <div class="${instructionClass}">${instructionContent}</div>
            </div>
            `;
        }

        return '';
    }

    function generateYardPass(data, driverLang, driverAction = null) {
        const driverT = translations[driverLang];
        const siteL = siteLanguage;
        const siteT = translations[siteL];

        const isDriverRTL = driverLang === 'ar';
        const isSiteRTL = siteL === 'ar';
        const cfg = PRINTER_CONFIG;

        // Check if languages are different (need bilingual)
        const isBilingual = driverLang !== siteL;

        const allSameLocation = data.attachables.length > 0 &&
            data.attachables.every(item => item.spot === data.truck.spot);

        const trailers = data.trailers;
        const swapBodies = data.swapBodies;

        const trailerIds = trailers.map(t => t.id).filter(id => id && id !== '---');
        const swapBodyIds = swapBodies.map(s => s.id).filter(id => id && id !== '---');

        const trailerVrids = trailers.map(t => t.vrid).filter(v => v);
        const trailerIsas = trailers.map(t => t.isa).filter(i => i);
        const swapBodyVrids = swapBodies.map(s => s.vrid).filter(v => v);
        const swapBodyIsas = swapBodies.map(s => s.isa).filter(i => i);

        const truckVrid = data.truck.vrid || '';
        const allAttachableVrids = [...trailerVrids, ...swapBodyVrids];
        const truckAndAttachableVridMatch = allAttachableVrids.length > 0 &&
            allAttachableVrids.every(vrid => vrid === truckVrid) &&
            truckVrid !== '';

        const showCombinedVrid = truckAndAttachableVridMatch &&
            trailerIsas.length === 0 && swapBodyIsas.length === 0;

        // Determine driver actions
        const isPickupAndExit = driverAction && (
            driverAction.action === DRIVER_ACTIONS.PICKUP_AND_EXIT ||
            driverAction.driverAction === DRIVER_ACTIONS.PICKUP_AND_EXIT
        );
        const isDropAndSoloExitAction = driverAction && driverAction.action === DRIVER_ACTIONS.DROP_AND_SOLO_EXIT;
        const isDockAndWaitAction = driverAction && driverAction.action === DRIVER_ACTIONS.DOCK_AND_WAIT;
        const isParkAndWaitAction = driverAction && driverAction.action === DRIVER_ACTIONS.PARK_AND_WAIT;
        const isSwapBodyExchange = driverAction && driverAction.action === DRIVER_ACTIONS.SWAP_BODY_EXCHANGE;
        const swapBodyParkAndWait = driverAction && driverAction.driverAction === DRIVER_ACTIONS.PARK_AND_WAIT;
        const swapBodyCustomInstruction = driverAction && driverAction.driverAction === DRIVER_ACTIONS.OTHER;

        // Check if this is a "drop only" swap body operation
        const isSwapBodyDropOnly = isSwapBodyExchange &&
            driverAction.dropCount > 0 &&
            driverAction.pickupCount === 0;

        // Check if this is a "pickup only" swap body operation
        const isSwapBodyPickupOnly = isSwapBodyExchange &&
            driverAction.dropCount === 0 &&
            driverAction.pickupCount > 0;

        // Determine what type of equipment we have for pick up box
        const hasOnlySwapBodies = data.hasSwapBodies && !data.hasTrailers;
        const hasOnlyTrailers = data.hasTrailers && !data.hasSwapBodies;

        // Combi Tour with truck at dock
        const isCombiTourTruckAtDock = !isDropAndSoloExitAction && !isSwapBodyExchange && data.attachables.some(attachable => {
            const truckHasVrid = data.truck.hasOwnVrid;
            const attachableHasVrid = attachable.vrid && attachable.vrid !== '---' && attachable.vrid.trim() !== '';
            const differentVrids = truckHasVrid && attachableHasVrid && data.truck.vrid !== attachable.vrid;
            const truckAtDock = isDockLocation(data.truck.spot);
            const differentLocations = data.truck.spot !== attachable.spot;
            return differentVrids && truckAtDock && differentLocations;
        });

        // Generate attachable sections HTML
        let attachableSectionsHtml = '';

        // --- SWAP BODY OPERATION INSTRUCTION (if applicable) ---
        if (isSwapBodyExchange) {
            attachableSectionsHtml += generateSwapBodyInstructionHtml(driverT, siteT, driverAction, driverLang, siteL);
        }

        // --- TRAILERS SECTION ---
        if (trailers.length > 0) {
            if ((isDropAndSoloExitAction || !showCombinedVrid) && (trailerVrids.length > 0 || trailerIsas.length > 0)) {
                const labelText = isBilingual
                    ? `${driverT.vridIsaTrailer}<br><span class="site-lang-text">${siteT.vridIsaTrailer}</span>`
                    : driverT.vridIsaTrailer;

                attachableSectionsHtml += `
                <div class="info-box">
                    <div class="info-label">${labelText}</div>
                    <div class="key-info">
                        ${trailerVrids.length > 0 ? trailerVrids.join(' / ') : ''}
                        ${trailerVrids.length > 0 && trailerIsas.length > 0 ? '<br>' : ''}
                        ${trailerIsas.length > 0 ? trailerIsas.join(' / ') : ''}
                    </div>
                </div>
                `;
            }

            if (trailerIds.length > 0) {
                const labelKey = trailerIds.length > 1 ? 'trailerIds' : 'trailerId';
                const labelText = isBilingual
                    ? `${driverT[labelKey]}<br><span class="site-lang-text">${siteT[labelKey]}</span>`
                    : driverT[labelKey];

                attachableSectionsHtml += `
                <div class="info-box">
                    <div class="info-label">${labelText}</div>
                    <div class="key-info">${trailerIds.join(' / ')}</div>
                </div>
                `;
            }

            if (!allSameLocation || isDropAndSoloExitAction) {
                const uniqueTrailerSpots = [...new Set(trailers.map(t => t.spot))];
                if (uniqueTrailerSpots.length === 1) {
                    const trailerSpot = uniqueTrailerSpots[0];
                    if (isDockLocation(trailerSpot)) {
                        const dockType = trailerSpot.startsWith('OB') ? 'outbound' : 'inbound';
                        const dockNumber = trailerSpot.substring(2);

                        const driverDockInstruction = `${driverT.dockAt} ${driverT[dockType]} ${driverT.door} ${dockNumber}`;
                        const siteDockInstruction = `${siteT.dockAt} ${siteT[dockType]} ${siteT.door} ${dockNumber}`;
                        const instructionText = isBilingual
                            ? `${driverDockInstruction}<br><span class="site-lang-text">${siteDockInstruction}</span>`
                            : driverDockInstruction;

                        const exitText = isBilingual
                            ? `${driverT.dropAndExit}<br><span class="site-lang-text">${siteT.dropAndExit}</span>`
                            : driverT.dropAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="location-instruction">${instructionText}</div>
                            <div class="location-value">${trailerSpot}</div>
                            ${isDropAndSoloExitAction ? `<div class="exit-instruction">${exitText}</div>` : ''}
                        </div>
                        `;
                    } else {
                        const instructionText = isBilingual
                            ? `${driverT.dropTrailerAt}<br><span class="site-lang-text">${siteT.dropTrailerAt}</span>`
                            : driverT.dropTrailerAt;

                        const exitText = isBilingual
                            ? `${driverT.dropAndExit}<br><span class="site-lang-text">${siteT.dropAndExit}</span>`
                            : driverT.dropAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="location-instruction">${instructionText}</div>
                            <div class="location-value">${trailerSpot}</div>
                            ${isDropAndSoloExitAction ? `<div class="exit-instruction">${exitText}</div>` : ''}
                        </div>
                        `;
                    }
                } else if (uniqueTrailerSpots.length > 1) {
                    trailers.forEach((trailer) => {
                        if (trailer.spot !== data.truck.spot || isDropAndSoloExitAction) {
                            const isDock = isDockLocation(trailer.spot);
                            let driverInstruction, siteInstruction;
                            if (isDock) {
                                const dockType = trailer.spot.startsWith('OB') ? 'outbound' : 'inbound';
                                const dockNumber = trailer.spot.substring(2);
                                driverInstruction = `${driverT.dockAt} ${driverT[dockType]} ${driverT.door} ${dockNumber}`;
                                siteInstruction = `${siteT.dockAt} ${siteT[dockType]} ${siteT.door} ${dockNumber}`;
                            } else {
                                driverInstruction = driverT.dropTrailerAt;
                                siteInstruction = siteT.dropTrailerAt;
                            }

                            const instructionText = isBilingual
                                ? `${driverInstruction}<br><span class="site-lang-text">${siteInstruction}</span>`
                                : driverInstruction;

                            attachableSectionsHtml += `
                            <div class="info-box">
                                <div class="info-label">${trailer.id}:</div>
                                <div class="location-instruction">${instructionText}</div>
                                <div class="location-value">${trailer.spot}</div>
                            </div>
                            `;
                        }
                    });
                    if (isDropAndSoloExitAction) {
                        const exitText = isBilingual
                            ? `${driverT.dropAndExit}<br><span class="site-lang-text">${siteT.dropAndExit}</span>`
                            : driverT.dropAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="exit-instruction">${exitText}</div>
                        </div>
                        `;
                    }
                }
            }
        }

        // --- SWAP BODIES SECTION ---
        if (swapBodies.length > 0) {
            if ((isDropAndSoloExitAction || !showCombinedVrid) && (swapBodyVrids.length > 0 || swapBodyIsas.length > 0)) {
                const labelText = isBilingual
                    ? `${driverT.vridIsaSwapBody}<br><span class="site-lang-text">${siteT.vridIsaSwapBody}</span>`
                    : driverT.vridIsaSwapBody;

                attachableSectionsHtml += `
                <div class="info-box">
                    <div class="info-label">${labelText}</div>
                    <div class="key-info">
                        ${swapBodyVrids.length > 0 ? swapBodyVrids.join(' / ') : ''}
                        ${swapBodyVrids.length > 0 && swapBodyIsas.length > 0 ? '<br>' : ''}
                        ${swapBodyIsas.length > 0 ? swapBodyIsas.join(' / ') : ''}
                    </div>
                </div>
                `;
            }

            if (swapBodyIds.length > 0) {
                const labelKey = swapBodyIds.length > 1 ? 'swapBodyIds' : 'swapBodyId';
                const labelText = isBilingual
                    ? `${driverT[labelKey]}<br><span class="site-lang-text">${siteT[labelKey]}</span>`
                    : driverT[labelKey];

                attachableSectionsHtml += `
                <div class="info-box">
                    <div class="info-label">${labelText}</div>
                    <div class="key-info">${swapBodyIds.join(' / ')}</div>
                </div>
                `;
            }

            if (!allSameLocation || isDropAndSoloExitAction) {
                const uniqueSwapBodySpots = [...new Set(swapBodies.map(s => s.spot))];
                if (uniqueSwapBodySpots.length === 1) {
                    const swapBodySpot = uniqueSwapBodySpots[0];
                    if (isDockLocation(swapBodySpot)) {
                        const dockType = swapBodySpot.startsWith('OB') ? 'outbound' : 'inbound';
                        const dockNumber = swapBodySpot.substring(2);

                        const driverDockInstruction = `${driverT.dockAt} ${driverT[dockType]} ${driverT.door} ${dockNumber}`;
                        const siteDockInstruction = `${siteT.dockAt} ${siteT[dockType]} ${siteT.door} ${dockNumber}`;
                        const instructionText = isBilingual
                            ? `${driverDockInstruction}<br><span class="site-lang-text">${siteDockInstruction}</span>`
                            : driverDockInstruction;

                        const exitText = isBilingual
                            ? `${driverT.dropSwapBodyAndExit}<br><span class="site-lang-text">${siteT.dropSwapBodyAndExit}</span>`
                            : driverT.dropSwapBodyAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="location-instruction">${instructionText}</div>
                            <div class="location-value">${swapBodySpot}</div>
                            ${isDropAndSoloExitAction ? `<div class="exit-instruction">${exitText}</div>` : ''}
                        </div>
                        `;
                    } else {
                        const instructionText = isBilingual
                            ? `${driverT.dropSwapBodyAt}<br><span class="site-lang-text">${siteT.dropSwapBodyAt}</span>`
                            : driverT.dropSwapBodyAt;

                        const exitText = isBilingual
                            ? `${driverT.dropSwapBodyAndExit}<br><span class="site-lang-text">${siteT.dropSwapBodyAndExit}</span>`
                            : driverT.dropSwapBodyAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="location-instruction">${instructionText}</div>
                            <div class="location-value">${swapBodySpot}</div>
                            ${isDropAndSoloExitAction ? `<div class="exit-instruction">${exitText}</div>` : ''}
                        </div>
                        `;
                    }
                } else if (uniqueSwapBodySpots.length > 1) {
                    swapBodies.forEach((swapBody) => {
                        if (swapBody.spot !== data.truck.spot || isDropAndSoloExitAction) {
                            const isDock = isDockLocation(swapBody.spot);
                            let driverInstruction, siteInstruction;
                            if (isDock) {
                                const dockType = swapBody.spot.startsWith('OB') ? 'outbound' : 'inbound';
                                const dockNumber = swapBody.spot.substring(2);
                                driverInstruction = `${driverT.dockAt} ${driverT[dockType]} ${driverT.door} ${dockNumber}`;
                                siteInstruction = `${siteT.dockAt} ${siteT[dockType]} ${siteT.door} ${dockNumber}`;
                            } else {
                                driverInstruction = driverT.dropSwapBodyAt;
                                siteInstruction = siteT.dropSwapBodyAt;
                            }

                            const instructionText = isBilingual
                                ? `${driverInstruction}<br><span class="site-lang-text">${siteInstruction}</span>`
                                : driverInstruction;

                            attachableSectionsHtml += `
                            <div class="info-box">
                                <div class="info-label">${swapBody.id}:</div>
                                <div class="location-instruction">${instructionText}</div>
                                <div class="location-value">${swapBody.spot}</div>
                            </div>
                            `;
                        }
                    });
                    if (isDropAndSoloExitAction) {
                        const exitText = isBilingual
                            ? `${driverT.dropSwapBodyAndExit}<br><span class="site-lang-text">${siteT.dropSwapBodyAndExit}</span>`
                            : driverT.dropSwapBodyAndExit;

                        attachableSectionsHtml += `
                        <div class="info-box">
                            <div class="exit-instruction">${exitText}</div>
                        </div>
                        `;
                    }
                }
            }
        }

        // Generate VRID section for truck (or combined if same as attachables)
        let vridSectionHtml = '';
        if (!isDropAndSoloExitAction) {
            // For swap body operations, always show truck VRID
            if (isSwapBodyExchange) {
                const truckHasVrid = data.truck.vrid && data.truck.vrid !== '---' && data.truck.vrid.trim() !== '';
                if (truckHasVrid) {
                    const labelText = isBilingual
                        ? `${driverT.vridIsaTruck}<br><span class="site-lang-text">${siteT.vridIsaTruck}</span>`
                        : driverT.vridIsaTruck;

                    vridSectionHtml = `
                    <div class="info-box">
                        <div class="info-label">${labelText}</div>
                        <div class="key-info">${data.truck.vrid || data.truck.loadId || '---'}</div>
                    </div>
                    `;
                }
            } else if (showCombinedVrid) {
                const labelText = isBilingual
                    ? `${driverT.vridIsa}<br><span class="site-lang-text">${siteT.vridIsa}</span>`
                    : driverT.vridIsa;

                vridSectionHtml = `
                <div class="info-box">
                    <div class="info-label">${labelText}</div>
                    <div class="key-info">${data.truck.vrid || data.truck.loadId || '---'}</div>
                </div>
                `;
            } else if (data.truck.vrid || data.truck.loadId) {
                // Only show truck VRID section if truck actually has its own VRID
                const truckHasOwnVrid = data.truck.vrid && data.truck.vrid !== '---' && data.truck.vrid.trim() !== '';
                if (truckHasOwnVrid) {
                    const labelText = isBilingual
                        ? `${driverT.vridIsaTruck}<br><span class="site-lang-text">${siteT.vridIsaTruck}</span>`
                        : driverT.vridIsaTruck;

                    vridSectionHtml = `
                    <div class="info-box">
                        <div class="info-label">${labelText}</div>
                        <div class="key-info">${data.truck.vrid || data.truck.loadId || '---'}</div>
                    </div>
                    `;
                }
            }
        }

        // Generate truck section HTML
        let truckSectionHtml = '';

        // Determine the driver action instruction
        let driverActionInstruction = '';
        if (driverAction) {
            if (driverAction.action === DRIVER_ACTIONS.PARK_AND_WAIT) {
                // Will be handled by normal park flow with wait instruction
            } else if (driverAction.action === DRIVER_ACTIONS.PICKUP_AND_EXIT) {
                const driverPickupExitText = hasOnlySwapBodies ? driverT.pickUpSwapBodyAndExit : driverT.pickUpAndExit;
                const sitePickupExitText = hasOnlySwapBodies ? siteT.pickUpSwapBodyAndExit : siteT.pickUpAndExit;
                const exitText = isBilingual
                    ? `${driverPickupExitText}<br><span class="site-lang-text">${sitePickupExitText}</span>`
                    : driverPickupExitText;
                driverActionInstruction = `<div class="exit-instruction">${exitText}</div>`;
            } else if (driverAction.action === DRIVER_ACTIONS.DROP_AND_SOLO_EXIT) {
                const exitText = isBilingual
                    ? `${driverT.soloExit}<br><span class="site-lang-text">${siteT.soloExit}</span>`
                    : driverT.soloExit;
                driverActionInstruction = `<div class="exit-instruction">${exitText}</div>`;
            } else if (driverAction.action === DRIVER_ACTIONS.OTHER && driverAction.customInstruction) {
                const labelText = isBilingual
                    ? `${driverT.customInstruction}<br><span class="site-lang-text">${siteT.customInstruction}</span>`
                    : driverT.customInstruction;
                driverActionInstruction = `
                <div class="custom-instruction-box">
                    <div class="info-label">${labelText}</div>
                    <div class="custom-instruction-text">${driverAction.customInstruction}</div>
                </div>
                `;
            }
        }

        if (!isDropAndSoloExitAction) {
            let driverTruckInstruction, siteTruckInstruction;

            // If pickup and exit is selected, use "Connect to trailer/swap body at"
            if (isPickupAndExit) {
                driverTruckInstruction = hasOnlySwapBodies ? driverT.connectToSwapBodyAt : driverT.connectToTrailerAt;
                siteTruckInstruction = hasOnlySwapBodies ? siteT.connectToSwapBodyAt : siteT.connectToTrailerAt;
            } else if (isCombiTourTruckAtDock) {
                driverTruckInstruction = hasOnlySwapBodies ? driverT.connectToSwapBodyAt : driverT.connectToTrailerAt;
                siteTruckInstruction = hasOnlySwapBodies ? siteT.connectToSwapBodyAt : siteT.connectToTrailerAt;
            } else if (isSwapBodyDropOnly) {
                driverTruckInstruction = driverT.dropSwapBodyAt;
                siteTruckInstruction = siteT.dropSwapBodyAt;
            } else if (isDockLocation(data.truck.spot)) {
                const dockType = data.truck.spot.startsWith('OB') ? 'outbound' : 'inbound';
                const dockNumber = data.truck.spot.substring(2);
                driverTruckInstruction = `${driverT.dockAt} ${driverT[dockType]} ${driverT.door} ${dockNumber}`;
                siteTruckInstruction = `${siteT.dockAt} ${siteT[dockType]} ${siteT.door} ${dockNumber}`;
            } else {
                driverTruckInstruction = driverT.parkAt;
                siteTruckInstruction = siteT.parkAt;
            }

            const truckInstructionText = isBilingual
                ? `${driverTruckInstruction}<br><span class="site-lang-text">${siteTruckInstruction}</span>`
                : driverTruckInstruction;

            // Show wait in lounge for parking AND docking scenarios where driver is staying
            const showWaitInLounge = !isPickupAndExit && !isSwapBodyDropOnly && !isCombiTourTruckAtDock && (
                (!driverAction) || // No driver action modal shown - default behavior
                (driverAction.action === DRIVER_ACTIONS.PARK_AND_WAIT) ||
                (driverAction.action === DRIVER_ACTIONS.DOCK_AND_WAIT) ||
                (isSwapBodyExchange && swapBodyParkAndWait)
            );

            const waitInstructionText = isBilingual
                ? `${driverT.andWaitInLounge}<br><span class="site-lang-text">${siteT.andWaitInLounge}</span>`
                : driverT.andWaitInLounge;

            // Build custom instruction for swap body operations
            let finalDriverActionInstruction = driverActionInstruction;
            if (isCombiTourTruckAtDock) {
                const driverPickupExitText = hasOnlySwapBodies ? driverT.pickUpSwapBodyAndExit : driverT.pickUpAndExit;
                const sitePickupExitText = hasOnlySwapBodies ? siteT.pickUpSwapBodyAndExit : siteT.pickUpAndExit;
                const exitText = isBilingual
                    ? `${driverPickupExitText}<br><span class="site-lang-text">${sitePickupExitText}</span>`
                    : driverPickupExitText;
                finalDriverActionInstruction = `<div class="exit-instruction">${exitText}</div>`;
            } else if (isSwapBodyDropOnly) {
                const exitText = isBilingual
                    ? `${driverT.dropSwapBodyAndExit}<br><span class="site-lang-text">${siteT.dropSwapBodyAndExit}</span>`
                    : driverT.dropSwapBodyAndExit;
                finalDriverActionInstruction = `<div class="exit-instruction">${exitText}</div>`;
            } else if (isSwapBodyExchange && swapBodyCustomInstruction && driverAction.customInstruction) {
                const labelText = isBilingual
                    ? `${driverT.customInstruction}<br><span class="site-lang-text">${siteT.customInstruction}</span>`
                    : driverT.customInstruction;
                finalDriverActionInstruction = `
                <div class="custom-instruction-box">
                    <div class="info-label">${labelText}</div>
                    <div class="custom-instruction-text">${driverAction.customInstruction}</div>
                </div>
                `;
            } else if (isSwapBodyExchange && isPickupAndExit) {
                const exitText = isBilingual
                    ? `${driverT.pickUpSwapBodyAndExit}<br><span class="site-lang-text">${siteT.pickUpSwapBodyAndExit}</span>`
                    : driverT.pickUpSwapBodyAndExit;
                finalDriverActionInstruction = `<div class="exit-instruction">${exitText}</div>`;
            }

            const truckIdLabel = isBilingual
                ? `${driverT.truckId}<br><span class="site-lang-text">${siteT.truckId}</span>`
                : driverT.truckId;

            truckSectionHtml = `
            <div class="info-box">
                <div class="info-label">${truckIdLabel}</div>
                <div class="key-info">${data.truck.plate}</div>
            </div>

            <div class="info-box">
                <div class="location-instruction">${truckInstructionText}</div>
                <div class="location-value">${data.truck.spot}</div>
                ${showWaitInLounge ? `<div class="wait-instruction">${waitInstructionText}</div>` : ''}
                ${finalDriverActionInstruction}
            </div>
            `;
        } else {
            // For drop and exit scenarios, still show truck info but with solo exit
            const truckIdLabel = isBilingual
                ? `${driverT.truckId}<br><span class="site-lang-text">${siteT.truckId}</span>`
                : driverT.truckId;

            truckSectionHtml = `
            <div class="info-box">
                <div class="info-label">${truckIdLabel}</div>
                <div class="key-info">${data.truck.plate}</div>
            </div>
            `;

            // Add solo exit instruction if selected
            if (isDropAndSoloExitAction) {
                const exitText = isBilingual
                    ? `${driverT.soloExit}<br><span class="site-lang-text">${siteT.soloExit}</span>`
                    : driverT.soloExit;
                truckSectionHtml += `
                <div class="info-box">
                    <div class="exit-instruction">${exitText}</div>
                </div>
                `;
            }
        }

        // Determine pick up label (bilingual)
        let pickUpLabel = isBilingual
            ? (hasOnlySwapBodies
                ? `${driverT.pickUpSwapBody}<br><span class="site-lang-text">${siteT.pickUpSwapBody}</span>`
                : `${driverT.pickUpTrailer}<br><span class="site-lang-text">${siteT.pickUpTrailer}</span>`)
            : (hasOnlySwapBodies ? driverT.pickUpSwapBody : driverT.pickUpTrailer);

        // Pager label (bilingual)
        let pagerLabel = isBilingual
            ? `${driverT.pagerNo}<br><span class="site-lang-text">${siteT.pagerNo}</span>`
            : driverT.pagerNo;

        // Check if this is a BOX_TRUCK
        const isBoxTruckVehicle = data.truck.isBoxTruck;

        // Check for Detached Combi Tour
        const isDetachedCombiTour = data.attachables.some(attachable => {
            const truckHasVrid = data.truck.hasOwnVrid;
            const attachableHasVrid = attachable.vrid && attachable.vrid !== '---' && attachable.vrid.trim() !== '';
            const differentVrids = truckHasVrid && attachableHasVrid && data.truck.vrid !== attachable.vrid;
            const sameLocation = data.truck.spot === attachable.spot;
            return differentVrids && sameLocation;
        });

        // Determine if we should show pager and pickup boxes
        const showPagerBox = !isDropAndSoloExitAction && !isPickupAndExit && !isSwapBodyDropOnly && !isCombiTourTruckAtDock && (
            !isSwapBodyExchange || isBoxTruckVehicle || swapBodyParkAndWait
        );

        const showPickupBox = !isDropAndSoloExitAction && !isPickupAndExit && !isSwapBodyDropOnly && !isCombiTourTruckAtDock &&
            !showCombinedVrid && !isBoxTruckVehicle && !isDetachedCombiTour &&
            (
                (!isSwapBodyExchange && (!driverAction || driverAction.action === DRIVER_ACTIONS.PARK_AND_WAIT)) ||
                (isSwapBodyExchange && swapBodyParkAndWait)
            );

        // Header text (bilingual for title)
        const headerText = isBilingual
            ? `${driverT.yardPass} / ${siteT.yardPass} - ${data.siteCode}`
            : `${driverT.yardPass} - ${data.siteCode}`;

        // Welcome text (driver language only for tips section)
        const welcomeText = driverT.welcomeTo;

        const html = `
<!DOCTYPE html>
<html dir="${isDriverRTL ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <title>${driverT.yardPass} - ${data.siteCode}</title>
    <style>
        @page {
            size: ${cfg.paperWidth} auto;
            margin: ${cfg.marginTop} ${cfg.marginSides} ${cfg.marginBottom} ${cfg.marginSides};
        }

        @media print {
            html, body {
                width: ${cfg.paperWidth};
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            * {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
            }
            .container {
                page-break-after: always !important;
                break-after: always !important;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            width: 100%;
            height: auto;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 2mm;
            line-height: 1.1;
            direction: ${isDriverRTL ? 'rtl' : 'ltr'};
            font-size: 13px;
        }

        .container {
            width: 100%;
        }

        .header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 3px;
            padding: 5px;
            background: #ff9900;
            color: black;
            border-radius: 3px;
        }

        .tips-section {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 7px 9px;
            margin-bottom: 5px;
        }

        .tips-welcome {
            font-size: 14px;
            font-weight: bold;
            color: #232f3e;
            margin-bottom: 5px;
            text-align: center;
        }

        .tips-list {
            list-style: none;
        }

        .tips-list li {
            font-size: 10px;
            color: #333;
            margin-bottom: 2px;
            line-height: 1.2;
            display: flex;
            align-items: flex-start;
            gap: 5px;
        }

        .tip-emoji {
            font-size: 12px;
            min-width: 32px;
            text-align: center;
        }

        .tip-text {
            flex: 1;
        }

        .section {
            margin: 5px 0;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
        }

        .info-box {
            background: #f8f9fa;
            padding: 5px 7px;
            margin: 5px 0;
            border-radius: 3px;
        }

        .info-label {
            font-size: 12px;
            color: #555;
            margin-bottom: 2px;
        }

        .key-info {
            font-size: 16px;
            font-weight: bold;
            padding: 3px;
            background: #e9ecef;
            border-radius: 3px;
            text-align: center;
        }

        .location-instruction {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 3px 0;
            color: #232f3e;
        }

        .location-value {
            font-size: 55px;
            font-weight: bold;
            padding: 7px;
            background: white;
            border: 2px solid #232f3e;
            border-radius: 5px;
            margin: 3px 0;
            text-align: center;
            color: black;
            line-height: 1;
        }

        .wait-instruction {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-top: 5px;
            padding: 8px;
            background: #d4edda;
            border: 2px solid #28a745;
            border-radius: 5px;
            color: #155724;
        }

        .exit-instruction {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-top: 5px;
            padding: 8px;
            background: #f8d7da;
            border: 2px solid #dc3545;
            border-radius: 5px;
            color: #721c24;
        }

        .custom-instruction-box {
            background: #e7f3ff;
            border: 2px solid #007bff;
            border-radius: 5px;
            padding: 8px;
            margin-top: 5px;
        }

        .custom-instruction-text {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            color: #004085;
        }

        .swap-instruction {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            line-height: 1.4;
        }

        .swap-instruction.exchange {
            background: #d1ecf1;
            border: 2px solid #17a2b8;
            color: #0c5460;
        }

        .swap-instruction.drop-only {
            background: #fff3cd;
            border: 2px solid #ffc107;
            color: #856404;
        }

        .swap-instruction.pickup-only {
            background: #cce5ff;
            border: 2px solid #007bff;
            color: #004085;
        }

        .pager-box {
            font-size: 55px;
            font-weight: bold;
            padding: 7px;
            background: white;
            border: 2px solid #232f3e;
            border-radius: 5px;
            margin: 3px 0;
            text-align: center;
            color: black;
            line-height: 1;
        }

        .pager-header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #232f3e;
            text-align: left;
        }

        .pager-input {
            width: 100%;
            height: 55px;
            border: 1px dashed #999;
            border-radius: 3px;
            background: #f8f9fa;
        }

        .print-info {
            font-size: 9px;
            color: #666;
            text-align: ${isDriverRTL ? 'left' : 'right'};
            margin-top: 5px;
            padding-top: 3px;
            border-top: 1px solid #eee;
        }

        /* Site language text styling */
        .site-lang-text {
            font-size: 0.85em;
            color: #666;
            font-style: italic;
        }

        .location-instruction .site-lang-text {
            font-size: 0.75em;
            display: block;
            margin-top: 2px;
        }

        .wait-instruction .site-lang-text,
        .exit-instruction .site-lang-text {
            font-size: 0.85em;
            display: block;
            margin-top: 3px;
        }

        .info-label .site-lang-text {
            font-size: 0.9em;
        }

        .pager-header .site-lang-text {
            font-size: 0.85em;
            display: block;
            margin-top: 2px;
        }

        .swap-instruction .site-lang-text {
            font-size: 0.8em;
            display: block;
            margin-top: 5px;
        }

        .custom-instruction-box .info-label .site-lang-text {
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${headerText}
        </div>

        <div class="tips-section">
            <div class="tips-welcome">🚛 ${welcomeText} ${data.siteCode}</div>
            <ul class="tips-list">
                <li>
                    <span class="tip-emoji">🦺</span>
                    <span class="tip-text">${driverT.tip1}</span>
                </li>
                <li>
                    <span class="tip-emoji">🚛</span>
                    <span class="tip-text">${driverT.tip2}</span>
                </li>
                <li>
                    <span class="tip-emoji">⚠️</span>
                    <span class="tip-text">${driverT.tip3}</span>
                </li>
                <li>
                    <span class="tip-emoji">🔑</span>
                    <span class="tip-text">${driverT.tip4}</span>
                </li>
            </ul>
        </div>

        <div class="section">
            ${attachableSectionsHtml}

            ${vridSectionHtml}

            ${truckSectionHtml}
        </div>

        ${showPagerBox ? `
        <div class="pager-box">
            <div class="pager-header">${pagerLabel}</div>
            <div class="pager-input"></div>
        </div>
        ` : ''}

        ${showPickupBox ? `
        <div class="pager-box">
            <div class="pager-header">${pickUpLabel}</div>
            <div class="pager-input"></div>
        </div>
        ` : ''}

        <div class="print-info">
            ${driverT.printed} ${data.printTime} | ${driverT.printedBy} ${data.printedBy}
        </div>
    </div>
</body>
</html>`;

        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'fixed',
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            border: 0,
                        visibility: 'hidden'
        });
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.print();
            } catch(e) {
                console.error('Print failed:', e);
            }
            setTimeout(() => iframe.remove(), 1500);
        }, 500);
    }

    function init() {
        setTimeout(() => {
            createPrintButtons();

            const observer = new MutationObserver((mutations) => {
                createPrintButtons();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// TEMPORARY DEBUG: Log equipment types to console
function logEquipmentTypes() {
    const instances = document.querySelectorAll('.gate-operation-summary-new');
    instances.forEach((instance, idx) => {
        console.log(`=== Instance ${idx + 1} ===`);
        const rows = instance.querySelectorAll('[data-testid="gateOperationEquipmentRow"]');
        rows.forEach((row, rowIdx) => {
            const equipTypeImg = row.querySelector('[data-testid="equipmentTypeImage"]');
            const equipType = equipTypeImg?.alt || 'NOT FOUND';
            const plate = row.querySelector('[data-testid="licensePlateNumber"]')?.textContent || '---';
            const trailerId = row.querySelector('[data-testid="trailerId"]')?.textContent || '---';
            console.log(`  Row ${rowIdx + 1}: Type="${equipType}", Plate="${plate}", TrailerID="${trailerId}"`);

            if (equipTypeImg?.src) {
                console.log(`    Image src: ${equipTypeImg.src}`);
            }
        });
    });
}

// Run after a delay to let page load
setTimeout(logEquipmentTypes, 3000);

// Also run when pressing Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        console.log('=== DEBUG: Equipment Types ===');
        logEquipmentTypes();
    }
});