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

Il motore massimizza la probabilità di raggiungere almeno 300 punti, assumendo pescate uniformi fra le carte non viste. Con **al massimo 10 carte da pescare**, confronta esattamente tutte le mosse e le continuazioni: la scelta è ottimale per questo obiettivo. Con 11–12 carte tenta lo stesso calcolo entro un milione di stati; se non termina, usa la strategia stimata. Con più carte usa le simulazioni. **Non è garantita l'ottimalità delle scelte stimate nelle fasi iniziali.**

Il calcolo esatto conta gli ordini vincenti con numeri interi, considerando l'incertezza delle pescate prima delle decisioni successive. Un limite superiore sui punti delle combinazioni disgiunte elimina soltanto i rami in cui vincere è impossibile. Una ricerca interrotta non viene mai presentata come esatta.

L'interfaccia mostra «Scelta ottimale» e una percentuale soltanto per i risultati esatti (o una combinazione che raggiunge subito 300). La percentuale presuppone scelte successive ottimali; non garantisce la riuscita della singola partita. Le altre mosse sono indicate come «Consiglio stimato», senza esporre le frequenze delle continuazioni euristiche come probabilità calibrate.

Sul campione di sviluppo di 500 mazzi identici, le successive varianti hanno ottenuto 70,2% (precedente), 71,2%, 73,2%, 73,6% e **75,2%**. Sono stati corretti tutti i 18 errori noti e il confronto indipendente dei nuovi finali con al massimo 7 carte ha rilevato **0 errori su 2.242 decisioni**. Risultati e limiti della verifica separata sono descritti in [VALIDATION.md](VALIDATION.md).

Il successo è qualsiasi punteggio >= 300, incluso l’oro. Il calcolo avviene in un Web Worker e viene annullato se correggi lo stato. Non vengono suggerite mosse finché non hai inserito tutte le carte pescate. A mazzo esaurito vengono considerate solo le combinazioni disponibili.

Regole e tabella punteggi: https://en-wiki.metin2.gameforge.com/index.php/Okey_Card_Game

## Verifica

Con Node.js, senza dipendenze:

```sh
node engine.test.cjs
node strategy.test.cjs
node app.test.cjs
node worker.test.cjs
```

I test verificano punteggi, soglia, fine mazzo, i 18 errori segnalati, confronti con un risolutore indipendente, gestione del limite di ricerca, worker e transizioni dell'interfaccia con un DOM simulato. Non sostituiscono la verifica grafica in un browser.

Per ripetere il confronto su mazzi identici con la versione precedente congelata in `test-support/engine-baseline.cjs`:

```sh
node strategy-benchmark.cjs 500 0 risultati.json
node strategy-benchmark.cjs 1000 500 verifica-separata.json
```

Il secondo comando usa 1.000 mazzi diversi dai primi 500. I benchmark seguono ogni consiglio fino a 300 punti o alla fine della partita; non comunicano al motore l'ordine delle pescate. Le percentuali sono stime sotto questo modello, non statistiche degli utenti reali.

Gli URL degli asset includono una versione per evitare di mescolare HTML nuovo con CSS o JavaScript precedenti in cache. Aggiornare la versione nei riferimenti di index.html, app.js e worker.js a ogni pubblicazione che modifica questi file.

All’apertura il tavolo parte sempre vuoto: nessuna mano predefinita o ripristino automatico. Se esiste un salvataggio, viene proposto separatamente; inserire una nuova carta avvia invece una nuova partita.

Le cinque posizioni della mano sono fisse: giocare, scartare o correggere una carta svuota solo il suo slot. Le nuove carte riempiono i posti vuoti da sinistra a destra; puoi toccare uno slot vuoto per scegliere una posizione diversa. Salvataggio e annullamento conservano le posizioni. I vecchi salvataggi vengono convertiti mantenendo l’ordine disponibile.

Il motore precalcola i punteggi delle terne e riutilizza tabelle durante le simulazioni. Il numero di simulazioni resta 700 per scarto e 1.600 per combinazione; nelle continuazioni, la soglia iniziale per incassare una combinazione è stata ridotta da 70 a 60 punti dopo il confronto dei benchmark. I tempi dipendono dallo stato e dal dispositivo; il worker può essere annullato correggendo la partita.
