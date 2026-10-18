# le-mie-app

Tre app web (PWA) per iPhone, tutte sullo stesso indirizzo: https://sizzomane.github.io/le-mie-app/

- `/` Pianificatore esami
- `/piano-studio.html` Piano studio
- `/conti/` Divisore conti
- `/home/` Schermata con i collegamenti alle tre app
- `backup.js` Backup e ripristino condiviso (pulsante in alto a destra in ogni app)

## Dopo ogni modifica
Cambia il numero di versione della cache: `sw.js` (Esami e Piano studio) e `conti/sw.js` (Conti), altrimenti il telefono continua a usare la copia vecchia.
