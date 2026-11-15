# AstraHealth on Windows - Complete Beginner Guide

This guide assumes **you know nothing about programming**. Follow the steps in order. You do not need to edit any code.

AstraHealth is a local demo. It runs on your own computer and uses seeded demo data. It does not connect to real astronauts.

---

## 1. What you need

- A Windows 10 or Windows 11 computer (64-bit).
- At least **8 GB of RAM**.
- At least **5 GB of free disk space**.
- A working internet connection for the first setup.
- About **20-30 minutes** for the first start. Later starts take under a minute.
- Permission to install software on the computer.

You will install three free programs:

| Program | Why |
|---|---|
| **Docker Desktop** | Runs the PostgreSQL database in a container |
| **Node.js** | Runs the web interface |
| **uv** | Runs the Python backend |

You do **not** need to install Python separately. `uv` handles it.

---

## 2. Install Docker Desktop

1. Open this page in your browser: <https://www.docker.com/products/docker-desktop/>
2. Click **Download for Windows**.
3. Run the downloaded `Docker Desktop Installer.exe`.
4. Keep the default options. If it asks about **WSL 2**, allow it.
5. Finish the installation and **restart the computer** if the installer asks.
6. Open **Docker Desktop** from the Start menu.
7. Accept the terms if prompted.
8. Wait until the bottom-left corner says **Engine running**. This can take a few minutes the first time.

Quick check:

1. Open the Start menu.
2. Type `PowerShell`.
3. Click **Windows PowerShell**.
4. Type this and press Enter:

```powershell
docker info
```

You should see a lot of text, not a red error. If you see an error, open Docker Desktop, wait for **Engine running**, and try again.

> Docker Desktop may ask you to enable virtualization or install WSL 2. Follow its instructions and restart. This is normal.

---

## 3. Install Node.js

1. Open <https://nodejs.org/en/download>
2. Download the **Windows Installer (.msi) - LTS** version. Choose **64-bit**.
3. Run the installer and click **Next** through the defaults.
4. Make sure **Add to PATH** is selected (it is selected by default).
5. Finish the installation.

Quick check in PowerShell:

```powershell
node --version
npm --version
```

You should see something like `v22.x.x` or higher and `10.x.x` or higher. If you see "not recognized", close PowerShell, open it again, and retry. If it still fails, reinstall Node.js and restart the computer.

---

## 4. Install uv

`uv` is the tool that installs and runs the Python backend.

1. Open **Windows PowerShell**.
2. Copy this entire line, paste it into PowerShell, and press Enter:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

3. Wait for it to finish.
4. **Close PowerShell and open it again.** This is important so Windows sees the new command.
5. Check it:

```powershell
uv --version
```

You should see a version number. If you see "not recognized", see the Troubleshooting section.

---

## 5. Unzip AstraHealth

1. Put the zip file somewhere easy, such as your **Downloads** folder.
2. Right-click the zip file and choose **Extract All...**
3. Change the destination to:

```text
C:\AstraHealth
```

4. Click **Extract**.
5. Open `C:\AstraHealth`.

If you see another folder named `AstraHealth` inside, open it. You are in the right place when you can see these files:

```text
Start AstraHealth.bat
Stop AstraHealth.bat
Reset Demo Data.bat
START_HERE_WINDOWS.md
README.md
backend
frontend
scripts
docs
```

> Avoid running the app from inside OneDrive, a network drive, or a folder with unusual characters. `C:\AstraHealth` is the safest choice.

---

## 6. Start AstraHealth

1. Double-click **`Start AstraHealth.bat`**.
2. If Windows shows **"Windows protected your PC"**, click **More info**, then **Run anyway**. This happens because the file is not signed by a big company. It is safe to run.
3. A blue PowerShell window opens. It will:
   - start Docker Desktop if needed,
   - start the database,
   - install dependencies on the first run,
   - apply database migrations,
   - seed the demo data,
   - open two server windows named **AstraHealth API** and **AstraHealth Web**.
4. **The first run can take 10-30 minutes.** Do not close the windows while it is working. You will see a lot of text. This is normal.
5. When it is ready, your browser should open automatically at:

```text
http://localhost:5173
```

If the browser does not open, open it yourself and type that address.

---

## 7. Choose a role

On the welcome screen, choose **Astronaut**. There is no account, email, or password.

You should see:

- a **Demo** badge in the left sidebar,
- the **Flight Deck** with a readiness score around **80 - Watch**,
- the mission **Artemis Transit** with **Simulated** in the top bar,
- two active alerts: **HRV is below your baseline** and **Sleep is fragmented**.

If you see all of that, everything is working.

---

## 8. Everyday use

After the first setup, starting the app is faster:

1. Open **Docker Desktop** from the Start menu and wait for **Engine running**.
2. Double-click **`Start AstraHealth.bat`**.
3. Wait for the browser to open.
4. When you are done, close the **AstraHealth API** and **AstraHealth Web** windows.

The database container can stay running. It does not use much memory.

---

## 9. How to stop AstraHealth

Use either method:

- Close the **AstraHealth API** and **AstraHealth Web** windows, **or**
- Double-click **`Stop AstraHealth.bat`**.

The Stop script also stops any leftover server process. The database container stays running unless you stop it in Docker Desktop.

---

## 10. How to reset the demo data

If you click around and the demo state gets messy:

1. Close the **AstraHealth API** and **AstraHealth Web** windows. Or run **`Stop AstraHealth.bat`**.
2. Double-click **`Reset Demo Data.bat`**.
3. Wait for **"Demo data reset and verified."**
4. Double-click **`Start AstraHealth.bat`** again.

This deletes the old demo records and recreates the exact scripted state. It does not change any code.

---

## 11. What to show a teammate or judge

Open **`docs/DEMO.md`** for a three-minute script. The short version:

1. **Flight Deck** - readiness ring, active alerts, body map, mission tape.
2. **Systems Check** - complete a check-in and read the Systems Report.
3. **Telemetry** - open HRV (RMSSD), switch the range, export CSV.
4. **Training** - log a countermeasure with RPE.
5. **Mission Log** - mission points, rank, streaks, achievements.
6. **Library** - cited HRP articles.
7. **Flight Surgeon** - ask "Why is my HRV low?" and show the citations.
8. **Offline** - switch the browser offline, complete a check-in, then reconnect.

The app is guidance only and not a medical device. All crew data is simulated.

---

## 12. Troubleshooting

### The Start window opens and closes immediately

Open PowerShell, then run these commands one at a time:

```powershell
cd C:\AstraHealth
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

The error stays visible in the PowerShell window. Read the red message.

### "Windows protected your PC"

Click **More info** -> **Run anyway**. The scripts are plain text; you can open them in Notepad to inspect them.

### "'docker' was not found"

Docker Desktop is not installed or is not on the PATH.

1. Install Docker Desktop from <https://www.docker.com/products/docker-desktop/>
2. Restart the computer.
3. Open Docker Desktop and wait for **Engine running**.
4. Try **`Start AstraHealth.bat`** again.

### "Docker Desktop is not running"

1. Open Docker Desktop from the Start menu.
2. Wait until the bottom-left says **Engine running**.
3. Return to the AstraHealth window and run **`Start AstraHealth.bat`** again.

If Docker Desktop never reaches **Engine running**, open its Settings -> Troubleshoot -> Restart, or restart the computer. On Windows Home, make sure WSL 2 is enabled when the installer asks.

### "'uv' was not found"

1. Run the uv installer command from section 4 again.
2. Close **all** PowerShell windows.
3. Open a new PowerShell and run `uv --version`.
4. If it still fails, restart the computer.

### "'node' or 'npm' was not found"

1. Reinstall Node.js LTS from <https://nodejs.org/en/download>
2. Keep **Add to PATH** selected.
3. Restart the computer.
4. Open a new PowerShell and run `node --version`.

### "Port 8000 is already in use" or "Port 5173 is already in use"

Another copy of AstraHealth is still running.

1. Double-click **`Stop AstraHealth.bat`**.
2. If that does not help, restart the computer.
3. Start AstraHealth again.

### "Port 5432 is already in use"

Another PostgreSQL database is using the same port. If you installed PostgreSQL separately:

1. Open the Start menu and search **Services**.
2. Find a service named **postgresql**.
3. Right-click it and choose **Stop**.
4. Try AstraHealth again.

Do not stop a database you do not recognize without asking the computer's owner.

### The API window shows a red error

1. Make sure Docker Desktop says **Engine running**.
2. Close the API and Web windows.
3. Double-click **`Reset Demo Data.bat`**.
4. Double-click **`Start AstraHealth.bat`** again.

### The browser says "This site can't be reached"

1. Look at the **AstraHealth Web** window. Wait until it says **ready**.
2. Look at the **AstraHealth API** window. It should say **Application startup complete**.
3. Try <http://127.0.0.1:5173> instead of `localhost`.
4. If it still fails, close both server windows and run **`Start AstraHealth.bat`** again.

### The first start is very slow

This is expected. Docker downloads a database image, Python installs packages, and Node installs packages. The first run can take 10-30 minutes. Later starts are much faster.

### Node install or npm install fails

1. Check the internet connection.
2. Close the server windows.
3. Delete the folder `C:\AstraHealth\frontend\node_modules` if it exists.
4. Run **`Start AstraHealth.bat`** again.

### The camera does not work

The camera pulse is optional.

1. Allow camera permission in the browser when asked.
2. Close other apps that use the camera.
3. If it still fails, use the **Resting heart rate** field. It is always available and works without a camera.

### I want a complete factory reset

This deletes the local demo database and all downloaded dependencies.

1. Close the server windows and run **`Stop AstraHealth.bat`**.
2. Open PowerShell in `C:\AstraHealth`.
3. Run:

```powershell
docker compose down -v
Remove-Item -Recurse -Force .\backend\.venv -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\frontend\node_modules -ErrorAction SilentlyContinue
```

4. Double-click **`Start AstraHealth.bat`** and wait for the full first-time setup.

This does **not** delete the AstraHealth source code.

### I see a PowerShell "execution policy" message

Use the `.bat` files. They already start PowerShell with the correct policy. If you must run the `.ps1` file manually, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

---

## 13. Folder map

You do not need to edit these, but this helps you understand what you have:

```text
Start AstraHealth.bat     Start the complete app
Stop AstraHealth.bat      Stop the API and web servers
Reset Demo Data.bat       Delete and rebuild the scripted demo data
START_HERE_WINDOWS.md     This guide
README.md                 Technical overview and screenshots
backend\                  Python API, rules, database models, tests
frontend\                 React web app
scripts\                  Windows and Mac/Linux start scripts
docs\                     Demo script, API, design, sources
docker-compose.yml        PostgreSQL container definition
```

---

## 14. Mac or Linux (short version)

The zip also contains a Bash script. On Mac or Linux:

```bash
cd AstraHealth
make install
make start
```

Or:

```bash
./scripts/start.sh
```

You need Docker (or Podman), `uv`, Node.js 22+, and `make`. See `README.md` for details.

---

## 15. If you are still stuck

Send your teammate this information:

1. A screenshot of the window with the red error.
2. The exact error text.
3. Your Windows version (Start -> Settings -> System -> About).
4. Whether Docker Desktop says **Engine running**.

Do not send personal health information. The demo identity is a local sample identity.
