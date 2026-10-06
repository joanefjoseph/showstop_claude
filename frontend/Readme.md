# Run Locally

This project uses Vite. To run the webpage from `index.html` on port 8443:

1. Open PowerShell in the project directory: `C:\Users\joane\WeVerseWebsiteWireframes`.
2. If dependencies are not installed, run `corepack pnpm install`.
3. Start the development server:

   ```powershell
   $env:PORT='8443'; npm run dev
   ```

4. Open [http://localhost:8443/](http://localhost:8443/) in your browser. Keep the terminal open while using the page; press `Ctrl+C` in that terminal to stop the server.

The Vite configuration reads the port from the `PORT` environment variable. Set it as shown above when starting the server.

## Codebase Architecture

These are the files used to install dependencies, configure Vite on port 8443, and load the app served from `index.html`:

```text
project/
|--- package.json
|--- pnpm-lock.yaml
|--- vite.config.ts
|--- .figma/
        |--- make/
                |--- site.json
|--- index.html
|--- src/
        |--- main.tsx
        |--- App.tsx
        |--- index.css
        |--- components/
                |--- PageNav.tsx
                |--- WeverseNavBar.tsx
        |--- pages/
                |--- Wireframe2A.tsx
                |--- Wireframe2B.tsx
                |--- Wireframe2C.tsx
                |--- Wireframe2D.tsx
                |--- Wireframe2E.tsx
```
`package.json` and `pnpm-lock.yaml` define the project dependencies. `vite.config.ts` sets the development server port and imports `.figma/make/site.json`. Vite serves `index.html`, which loads `src/main.tsx`; that entry point mounts `App.tsx` and imports the global stylesheet. `App.tsx` renders the Weverse NavBar (with a Back button) followed by one full-page wireframe, chosen by the URL hash. Pages link forward through their main call-to-action button:
| URL | Page | Button that leads to the next page |
| --- | --- | --- |
| `http://localhost:8443/#/2a` (default) | 2A: Tour Notice | "Go to Native Tour Box Office (Tickets Tab)" |
| `http://localhost:8443/#/2b` | 2B: Tour Box Office | "Presale Active →" (either tour date) |
| `http://localhost:8443/#/2c` | 2C: Seat Selection | "Reserve & Lock Seats (2)" |
| `http://localhost:8443/#/2d` | 2D: Checkout | "Complete Purchase & Issue Tickets" |
| `http://localhost:8443/#/2e` | 2E: Wallet / SafeTix | (end of flow) |