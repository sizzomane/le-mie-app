# le-mie-app

Quattro app web (PWA) per iPhone, tutte sullo stesso indirizzo: https://sizzomane.github.io/le-mie-app/

- `/` Pianificatore esami
- `/piano-studio.html` Piano studio
- `/conti/` Divisore conti
- `/bonsai.html` Bonsai (schede pianta, concimi, interventi, foto; backup proprio con le foto)
- `/home/` Schermata con i collegamenti alle app
- `backup.js` Backup e ripristino condiviso (pulsante in alto a destra in Esami, Piano studio e Conti)

## Dopo ogni modifica
Cambia il numero di versione della cache: `sw.js` (Esami, Piano studio e Bonsai) e `conti/sw.js` (Conti), altrimenti il telefono continua a usare la copia vecchia.
