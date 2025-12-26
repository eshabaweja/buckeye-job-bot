# OSU Workday Application Automation
- this project was created to partially automate the job application process on OSU's workday career site
- main feature: Job Application Autofill
- description of experiments with AI4SE (see [docs/AI4SE.md](docs/AI4SE.md))
- vibe coded with Cursor (Claude 4.5 Opus), [Puppeteer MCP](https://context7.com/puppeteer/puppeteer)
- chats with Cursor can be found in [cursor-chats](cursor_chats/)

# How to use buckeye-job-bot?
- download this repo
- make sure you have npm and puppeteer installed
- follow [this guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) to load an unpacked extension on Chrome
- enter your details and upload resume on the extension
- log into [workday](https://workday.osu.edu/)
- navigate to the job applications
- copy the links to your job applications, and paste them in the extension
- whenever you're ready, click "Open Next Job" (currently, "Open All Jobs" does not function as intended)

# Current State of the Project
- Given the workday URL, it can automate one simple application from beginning to end
- Can not fill multiple applications simultaneously. Why? Because you must be on the application page for the extension to work.