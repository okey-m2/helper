# Verifica della strategia — 10 settembre 2026

La nuova versione ottiene **74,5% di successi su 1.000 mazzi nuovi**, contro **69,7%** della versione precedente sugli stessi mazzi. L'obiettivo è raggiungere almeno 300 punti; la partita simulata si ferma appena raggiunge la soglia.

## Iterazioni sul campione di sviluppo

Le modifiche sono state valutate su 500 mazzi riproducibili, senza comunicare al motore l'ordine delle pescate.

| Versione | Successi | Percentuale | Esito |
|---|---:|---:|---|
| Precedente | 351/500 | 70,2% | Riferimento |
| Calcolo esatto fino a 7 carte nel mazzo | 356/500 | 71,2% | Mantenuta |
| Calcolo esatto fino a 10 carte | 366/500 | 73,2% | Mantenuta |
| Ricerca esatta aggiuntiva con 11–12 carte, entro un limite di stati | 368/500 | 73,6% | Mantenuta |
| Continuazioni basate sulla conservazione di combinazioni disgiunte | 348/500 | 69,6% | Scartata |
| Versione finale: nelle continuazioni si accettano anche combinazioni iniziali da 60 punti | 376/500 | 75,2% | Selezionata |

Una soglia alternativa di 50 punti ha ottenuto 79/100 nel test preliminare, contro 80/100 della soglia di 60; non è stata adottata. Le percentuali di sviluppo servono a scegliere la variante, non costituiscono una verifica indipendente né dimostrano che ogni variazione piccola sia statisticamente significativa.

## Verifica su mazzi nuovi

La versione finale è stata fissata prima di questa prova. I mazzi hanno identificativi 500–1499, distinti dagli identificativi 0–499 usati durante lo sviluppo.

| Misura | Risultato |
|---|---:|
| Versione precedente | 697/1.000 = 69,7% |
| Versione finale | 745/1.000 = 74,5% |
| Miglioramento osservato | +4,8 punti percentuali |
| Intervallo Wilson al 95% del nuovo tasso | 71,7–77,1% |
| Intervallo approssimato al 95% del miglioramento appaiato | +2,1–+7,5 punti percentuali |
| Partite perse prima e vinte ora | 122 |
| Partite vinte prima e perse ora | 74 |
| Partite con lo stesso esito | 804 |
| Test esatto di McNemar, bilaterale | p = 0,000746 |

Una strategia con probabilità migliore può perdere su una specifica sequenza di carte. Il test valuta il miglioramento complessivo, non pretende che ciascuna partita abbia un risultato migliore. Le percentuali non sono statistiche degli utenti reali.

## Verifica indipendente delle mosse

Un secondo risolutore usa un'implementazione separata dei punteggi, enumera sottoinsiemi di carte pescate e media le probabilità. Non usa il limite superiore, i conteggi interi o il limite di ricerca del motore dell'app. La massimizzazione avviene dopo le pescate osservabili: nessuno dei due risolutori conosce l'ordine futuro del mazzo.

| Campione e versione | Decisioni con al massimo 7 carte nel mazzo | Decisioni subottimali |
|---|---:|---:|
| Sviluppo, precedente | 2.182 | 18 |
| Sviluppo, nuova | 2.242 | 0 |
| Verifica separata, precedente | 4.359 | 31 |
| Verifica separata, nuova | 4.586 | 0 |

Sono inoltre verificati tutti i 18 errori originali, 431 valori di azioni in stati casuali indipendenti e 17 decisioni campionate con 8–10 carte ancora nel mazzo. Nessun errore rilevato. I confronti numerici usano tolleranze molto inferiori alla minima differenza possibile fra probabilità con questi numeri di pescate.

Esempio originale corretto: a 150 punti, con 6 blu, 7 giallo, 8 rosso, 5 giallo e 2 rosso in mano, e 4 rosso, 6 rosso, 2 blu, 3 blu, 5 blu, 7 blu e 1 giallo ancora nel mazzo, la vecchia app giocava la scala mista da 60 punti, rendendo impossibili i 300. La nuova conserva una vittoria garantita scartando il 5 giallo o il 2 rosso e proseguendo in modo ottimale.

## Garanzie e limiti

- Con al massimo **10 carte da pescare**, l'app completa il confronto esatto fra tutte le mosse. La scelta massimizza la probabilità di 300 punti nel modello di pescate uniformi.
- Con **11–12 carte**, tenta lo stesso confronto entro un milione di stati. Soltanto un calcolo completato viene indicato come esatto; in caso di interruzione usa interamente le stime, senza mescolarle con risultati esatti parziali.
- Nelle fasi precedenti, e dopo un'interruzione della ricerca, la scelta rimane euristica. **Questa versione non garantisce zero mosse subottimali in ogni fase della partita. Non è una soluzione matematicamente perfetta dell'intero gioco.**
- Il calcolo completo dall'inizio ha superato un milione di stati senza concludersi nella prova di fattibilità. Aumentare semplicemente le simulazioni non offre la garanzia richiesta. Per ottenerla bisogna completare o certificare anche il calcolo delle decisioni iniziali.
- Le probabilità esatte presuppongono continuazioni ottimali. Le frequenze delle simulazioni euristiche non sono più presentate all'utente come probabilità calibrate. Valori prossimi ma diversi da 0% e 100% non vengono arrotondati a impossibilità o certezza.

## Riproducibilità e integrazione

Ogni mazzo contiene 24 carte; le prime 5 formano la mano. Dopo una combinazione si reintegra la mano, dopo uno scarto si pesca una carta, nei limiti del mazzo rimasto. Le carte usate sono registrate. Il motore riceve soltanto mano, carte uscite e punteggio. Si usa Fisher–Yates con `mulberry32`, seme `(0xA19F034D + Math.imul(id, 2654435761)) >>> 0`.

La versione precedente è conservata in `test-support/engine-baseline.cjs`, SHA256 `b5777c797f785ea512a1072adf0ddc7fac2d478e6d6c9ad9ae5b0d69a8fedcfe`. Il motore valutato nel test separato è conservato nella cartella di lavoro `../validation/engine-final.cjs`, SHA256 `40bde2884b12ea4465ce8a3e1c961f34f2f26ef633a93873140692bfcd4516fd`. Il codice distribuito coincide con questo file dopo la sola normalizzazione di fine riga, BOM e righe vuote finali.

Per ripetere i benchmark da questa cartella:

```sh
node strategy-benchmark.cjs 500 0 risultati.json
node strategy-benchmark.cjs 1000 500 verifica-separata.json
```

I tracciati di tutte le partite e delle varianti sono nella cartella di lavoro `../validation/`; i file `baseline-holdout.json`, `final-holdout.json` e i corrispondenti `.audit.json` documentano la verifica separata. `validation/benchmark.cjs` conserva anche un checkpoint per partita, per riprendere eventuali esecuzioni interrotte senza perdere i risultati completati.

Passano, in entrambe le copie dell'app, `engine.test.cjs`, `strategy.test.cjs`, `app.test.cjs` e `worker.test.cjs`. Sono verificati anche l'annullamento dei risultati obsoleti, il ripristino, gli slot fissi, la distinzione fra consigli esatti e stimati, il caricamento del motore e la coerenza delle versioni degli asset.

I tempi dei benchmark con più worker non rappresentano quelli di una singola finestra del browser. Due controlli isolati su questo computer hanno impiegato circa 38 ms per il finale a 10 carte più lento registrato nel relativo benchmark e 750 ms per un caso esatto a 12 carte. Non sono misure su dispositivi mobili.

Il browser collegato non era disponibile: le verifiche dell'interfaccia sono automatiche con DOM simulato, non una nuova verifica grafica. Nessuna pubblicazione o modifica remota è stata effettuata.
