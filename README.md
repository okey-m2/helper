# Metin2 Okey Helper

Webapp statica in italiano per scegliere le mosse con obiettivo **almeno 300 punti**, argento o meglio.

## Uso

1. Inserisci le 5 carte iniziali per numero e colore.
2. Il consiglio viene calcolato automaticamente appena la mano completa è inserita. Le carte consigliate sono mostrate a colori e evidenziate nella mano.
3. Esegui la combinazione o lo scarto in Metin2, poi premi **Fatto, ho giocato** o **Fatto, ho scartato**.
4. Pesca nel gioco e inserisci solo le nuove carte: 3 dopo una combinazione, 1 dopo uno scarto, oppure quelle rimaste se il mazzo sta finendo.
5. Il consiglio successivo arriva automaticamente dopo la nuova pescata. A 300 punti l’obiettivo è raggiunto.

Punteggio e carte uscite si aggiornano automaticamente. Puoi annullare ogni passaggio, correggere una carta cliccandola nella mano e riprendere la sessione dopo un refresh scegliendo **Riprendi partita salvata**. Per una partita già iniziata, usa il pannello di correzione per registrare punteggio e tutte le carte già uscite. Il salvataggio rimane nel browser corrente.

## Avvio

Non sono necessarie dipendenze né una build. Dalla cartella del progetto:

```sh
python -m http.server 8080
```

Apri http://localhost:8080. Usa un server HTTP: aprire direttamente index.html può bloccare il Web Worker.

## GitHub Pages

Pubblica dalla root del branch configurato per Pages. Devono essere presenti insieme `index.html`, `styles.css`, `app.js`, `engine.js` e `worker.js`. I percorsi relativi supportano i siti di progetto GitHub Pages. Nessun servizio esterno o chiave API richiesti.

## Strategia e limiti

Il motore confronta combinazioni e scarti mediante continuazioni Monte Carlo sulle carte non viste, assumendo un ordine casuale uniforme. La strategia delle continuazioni è euristica: le percentuali misurano il successo nelle simulazioni, non una probabilità calibrata né una strategia matematicamente ottimale. Differenze piccole possono essere rumore di campionamento. Non è stato misurato un miglioramento del tasso di vittoria rispetto alla versione precedente.

Il successo è qualsiasi punteggio >= 300, incluso l’oro. Il calcolo avviene in un Web Worker e viene annullato se correggi lo stato. Non vengono suggerite mosse finché non hai inserito tutte le carte pescate. A mazzo esaurito vengono considerate solo le combinazioni disponibili.

Regole e tabella punteggi: https://en-wiki.metin2.gameforge.com/index.php/Okey_Card_Game

## Verifica

Con Node.js, senza dipendenze:

```sh
node engine.test.cjs
node app.test.cjs
```

I test verificano punteggi, soglia, fine mazzo e transizioni dell’interfaccia con un DOM simulato. Non sostituiscono la verifica grafica in un browser.

Gli URL degli asset includono una versione per evitare di mescolare HTML nuovo con CSS o JavaScript precedenti in cache. Aggiornare la versione nei riferimenti di index.html, app.js e worker.js a ogni pubblicazione che modifica questi file.

All’apertura il tavolo parte sempre vuoto: nessuna mano predefinita o ripristino automatico. Se esiste un salvataggio, viene proposto separatamente; inserire una nuova carta avvia invece una nuova partita.

Le cinque posizioni della mano sono fisse: giocare, scartare o correggere una carta svuota solo il suo slot. Le nuove carte riempiono i posti vuoti da sinistra a destra; puoi toccare uno slot vuoto per scegliere una posizione diversa. Salvataggio e annullamento conservano le posizioni. I vecchi salvataggi vengono convertiti mantenendo l’ordine disponibile.

Il motore precalcola i punteggi delle terne e riutilizza tabelle di consultazione durante le simulazioni. Il numero di simulazioni e la strategia rimangono invariati. Confronto locale Node.js su tre mani: 9.421/6.339/2.943 ms prima, 538/317/118 ms dopo; classifiche e probabilità identiche. Tempi indicativi, dipendenti dal dispositivo.
