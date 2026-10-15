# Tutorial: Angular + WebSockets für ein 1v1 Fighting Game

Dieses Projekt ist ein frisch generiertes **Angular 20** Projekt (Standalone Components, SCSS, Routing).
Es enthält noch **keinen Game-Code**, nur die Grundstruktur, damit du direkt loslegen kannst.

---

## 1. Projekt starten

Voraussetzung: Node.js ist installiert (bei dir: v24).

```bash
cd C:\Gibb\IET\WebModul\fight-game
npm start
```

Danach im Browser **http://localhost:4200** öffnen. Wenn du Dateien speicherst, lädt die Seite automatisch neu.

Weitere Befehle:

| Befehl | Was es macht |
|---|---|
| `npm start` | Dev-Server starten (`ng serve`) |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm test` | Unit-Tests ausführen |
| `npx ng generate component features/lobby/lobby` | Neue Komponente erzeugen |
| `npx ng generate service core/services/websocket` | Neuen Service erzeugen |

> Tipp: Statt `npx ng` kannst du die CLI global installieren: `npm install -g @angular/cli`, dann reicht `ng ...`.

---

## 2. Ordnerstruktur

```
fight-game/
├── public/                  Statische Dateien (werden 1:1 ausgeliefert)
│   └── assets/
│       ├── sprites/         Spritesheets der Kämpfer, Hintergründe
│       └── sounds/          Soundeffekte, Musik
├── server/                  Später: Node.js WebSocket-Server (eigenes kleines Projekt)
├── src/
│   ├── index.html           Die eine HTML-Seite (Single Page App)
│   ├── main.ts              Einstiegspunkt, startet Angular
│   ├── styles.scss          Globale Styles
│   └── app/
│       ├── app.ts           Root-Component (Hülle der ganzen App)
│       ├── app.html         Template der Root-Component
│       ├── app.config.ts    Globale Konfiguration (Router, Provider ...)
│       ├── app.routes.ts    Routen: welche URL zeigt welche Seite
│       ├── core/
│       │   ├── services/    Logik ohne UI: WebSocket-Verbindung, Game-State, Input
│       │   └── models/      TypeScript-Interfaces (Player, GameState, Messages)
│       ├── features/
│       │   ├── lobby/       Seite: Namen eingeben, Raum beitreten, auf Gegner warten
│       │   └── game/        Seite: das eigentliche Kampf-Canvas
│       └── shared/
│           └── components/  Wiederverwendbare UI-Teile (Healthbar, Button, Timer ...)
├── angular.json             Angular-Projektkonfiguration
├── package.json             Abhängigkeiten und npm-Skripte
└── tsconfig.json            TypeScript-Einstellungen
```

Die `.gitkeep`-Dateien sind nur Platzhalter, damit Git leere Ordner speichert. Du kannst sie löschen, sobald etwas im Ordner liegt.

---

## 3. Angular in 10 Minuten

### Components
Eine Component ist ein Baustein der Oberfläche und besteht aus 3 Teilen:
- **`.ts`** – die Logik (Klasse mit `@Component`)
- **`.html`** – das Template (was angezeigt wird)
- **`.scss`** – das Styling (gilt nur für diese Component)

Du erzeugst sie immer mit der CLI (`ng generate component ...`), dann ist alles korrekt verdrahtet.

### Templates (HTML mit Extras)
- `{{ wert }}` → Wert aus der Klasse anzeigen
- `[eigenschaft]="wert"` → Property-Binding (Daten rein)
- `(click)="methode()"` → Event-Binding (Events raus)
- `@if (...) { }` und `@for (x of liste; track x.id) { }` → Bedingungen und Schleifen

### Signals (State)
Angular 20 benutzt **Signals** für reaktive Daten: Wert setzen → UI aktualisiert sich automatisch.
Perfekt für Dinge wie Lebensbalken, Timer, Spielernamen, „Warte auf Gegner…“.

### Services & Dependency Injection
Ein **Service** ist eine Klasse ohne UI, die von mehreren Components benutzt wird.
Mit `inject(MeinService)` holst du ihn in eine Component. Es gibt nur **eine Instanz** für die ganze App –
ideal für die WebSocket-Verbindung, die Lobby **und** Game-Seite gemeinsam nutzen.

### Routing
In `app.routes.ts` legst du fest: `/` → Lobby, `/game` → Game. Im Template zeigt `<router-outlet />` die aktuelle Seite an.
Navigieren geht mit `routerLink` im HTML oder `Router.navigate()` im Code.

### RxJS
Angular bringt RxJS mit (Observables = Datenströme). Ein WebSocket ist genau so ein Strom von Nachrichten.
RxJS hat sogar eine fertige Hilfsfunktion `webSocket()` aus `rxjs/webSocket`.

---

## 4. Funktioniert ein Streetfighter-1v1 mit WebSockets?

**Ja.** Für ein Schulprojekt ist das eine gute und realistische Wahl.

### Warum ein Server nötig ist
Zwei Browser können sich mit WebSockets **nicht direkt** verbinden. Du brauchst einen kleinen Server in der Mitte:

```
 Browser Spieler 1  ──WebSocket──►  Node.js Server  ◄──WebSocket──  Browser Spieler 2
   (Angular App)                    (server/ Ordner)                   (Angular App)
```

Angular ist **nur das Frontend**. Der Server wird ein separates Mini-Projekt im Ordner `server/`,
z.B. mit Node.js und dem Paket **`ws`** (schlank) oder **Socket.IO** (mehr Komfort: Räume, automatisches Reconnect).

| Option | Vorteile | Nachteile |
|---|---|---|
| `ws` | sehr einfach, nah am Standard, schnell | Räume/Reconnect selbst bauen |
| Socket.IO | Räume eingebaut, Reconnect, Events mit Namen | Client-Bibliothek nötig, etwas mehr Overhead |

Für den Einstieg: **Socket.IO** ist am bequemsten, **`ws`** lehrreicher.

### Latenz – ist das schnell genug?
- Im **gleichen Netzwerk (Schule/LAN)**: wenige Millisekunden → fühlt sich flüssig an.
- Übers **Internet**: 20–100 ms → spielbar, man merkt aber leichte Verzögerung.
- Echte Fighting Games (Street Fighter 6) nutzen **Rollback-Netcode** – das ist sehr aufwändig und für dein Projekt nicht nötig.

### Zwei mögliche Architekturen

**A) Server ist der Chef („authoritative server“) – empfohlen**
1. Clients schicken nur ihre **Eingaben** (links, rechts, springen, schlagen).
2. Der Server rechnet die Spiellogik (Positionen, Treffer, HP) z.B. 30–60× pro Sekunde.
3. Der Server schickt den **Spielzustand** an beide Clients zurück.
4. Clients zeichnen nur, was der Server sagt.

✅ Fair, kein Schummeln, beide sehen dasselbe. ❌ Eigene Eingaben haben minimal Verzögerung.

**B) Server als Briefträger („relay“)**
1. Jeder Client rechnet seinen eigenen Kämpfer selbst.
2. Er schickt seine Position/Aktionen an den Server, der leitet sie an den Gegner weiter.

✅ Einfacher, eigene Bewegung fühlt sich sofort an. ❌ Treffer-Erkennung kann auseinanderlaufen („bei mir hat’s getroffen!“).

Für ein Schulprojekt sind beide ok. **A** ist sauberer, **B** schneller umgesetzt.

### Mögliche Nachrichten (Protokoll-Idee)
Alles als JSON. Nur eine Planung, noch kein Code:

| Richtung | Typ | Inhalt |
|---|---|---|
| Client → Server | `join` | Spielername |
| Server → Client | `waiting` | „Warte auf Gegner“ |
| Server → Client | `start` | Wer ist Spieler 1 / 2, Startpositionen |
| Client → Server | `input` | Gedrückte Tasten (links, rechts, springen, angriff, block) |
| Server → Client | `state` | Positionen, HP, Animationen beider Spieler, Timer |
| Server → Client | `gameOver` | Gewinner |
| Server → Client | `opponentLeft` | Gegner hat Verbindung verloren |

### Wo was in Angular hinkommt
| Teil | Ort |
|---|---|
| WebSocket verbinden, senden, empfangen | `core/services/` (z.B. `websocket.service.ts`) |
| Tastatureingaben sammeln | `core/services/` (z.B. `input.service.ts`) |
| Typen für Nachrichten & State | `core/models/` |
| Lobby-Seite | `features/lobby/` |
| Kampf mit `<canvas>` zeichnen | `features/game/` |
| Healthbar, Timer, Countdown | `shared/components/` |
| Sprites & Sounds | `public/assets/` |

### Wichtige Tipps fürs Game
- **Zeichnen mit `<canvas>`**, nicht mit vielen HTML-Elementen – das ist für Animationen viel schneller.
- **Game-Loop mit `requestAnimationFrame`** statt `setInterval`.
- Die Game-Loop **ausserhalb von Angulars Change Detection** laufen lassen (`NgZone.runOutsideAngular`), sonst prüft Angular 60× pro Sekunde die ganze UI.
- Angular-UI (Signals) nur für Dinge wie HP-Anzeige, Timer, Menüs benutzen.
- Tasten über `keydown`/`keyup` sammeln und als „aktuell gedrückt“ speichern, nicht jeden Tastendruck einzeln senden.
- Alternative ohne Server: **WebRTC** (direkte Verbindung zwischen Browsern) – schneller, aber deutlich komplizierter einzurichten. Für den Start nicht empfohlen.

---

## 5. Vorschlag: Reihenfolge zum Bauen

1. **Offline-Prototyp**: Ein Canvas, zwei Kämpfer auf **einer Tastatur** (WASD vs. Pfeiltasten). Bewegen, springen, schlagen, HP.
2. **Routing**: Lobby-Seite und Game-Seite trennen.
3. **Server aufsetzen** im Ordner `server/`: Zwei Clients verbinden, Nachrichten hin- und herschicken (z.B. ein einfacher Chat zum Testen).
4. **WebSocket-Service** in Angular bauen und mit dem Server verbinden.
5. **Lobby**: Zwei Spieler werden zu einem Match zusammengeführt.
6. **Online-Kampf**: Inputs senden, State empfangen, zeichnen.
7. **Feinschliff**: Sprites, Sounds, Rundenzähler, Siegerbildschirm, Reconnect.

Viel Erfolg! 🥊
