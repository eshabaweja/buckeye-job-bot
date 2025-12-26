# OSU Workday Application Automation
- this project was created to partially automate the job application process on OSU's workday career site
- main feature: Job Application Autofill
- description of experiments with AI4SE (see [docs/AI4SE.md](docs/AI4SE.md))
- vibe coded with Cursor (Claude 4.5 Opus), [Puppeteer MCP](https://context7.com/puppeteer/puppeteer)
- chats with Cursor can be found in [cursor-chats](cursor_chats/)

# Installation

## Prerequisites
1. **Node.js and npm** - Download and install from [nodejs.org](https://nodejs.org/) if you don't have them already
   - Verify installation: `node --version` and `npm --version`

2. **Google Chrome** - Required to run the extension

## Setup Steps
1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd <directory-name>
   ```

2. **Install project dependencies**
   ```bash
   npm install
   ```
   This will install `puppeteer-core` and other dependencies listed in `package.json`.

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the project directory
   - The extension should now appear in your extensions list

# How to use buckeye-job-bot?
1. Enter your details and upload resume on the extension popup
2. Log into [workday](https://workday.osu.edu/)
3. Navigate to the job applications
4. Copy the links to your job applications, and paste them in the extension
5. Whenever you're ready, click "Open Next Job" (currently, "Open All Jobs" does not function as intended)

# Current State of the Project
- Given the workday URL, it can automate one simple application from beginning to end
- Can not fill multiple applications simultaneously. Why? Because you must be on the application page for the extension to work.