# AI4SE - using AI in the SDLC
- tried using Opus 4.5 on Cursor, it didn't work. Could not automate a button click on 'Apply'
- Reading up on Model Context Protocol (MCP) and context7
- Using https://context7.com/puppeteer/puppeteer with Cursor
- error detected by programmer: Apply button did not click. The issue might be that after the link opens, the extension closes/disappears
- error was fed into Cursor. It generated new code, which still did not work. Provided more context (Copied the Button element's HTML)
- New code with service worker inspect view gave error: 
```
background.js:36 Background: First attempt failed, retrying... Could not establish connection. Receiving end does not exist.
background.js:44 Background: Retry also failed: Error: Could not establish connection. Receiving end does not exist.
(anonymous) @ background.js:44
setTimeout
(anonymous) @ background.js:38
setTimeout
listener @ background.js:29
```
- new code gave error:
```
background.js:36 Background: Attempt 1 failed: Could not establish connection. Receiving end does not exist.
background.js:41 Background: Retrying in 2000ms...
background.js:36 Background: Attempt 2 failed: Could not establish connection. Receiving end does not exist.
background.js:41 Background: Retrying in 4000ms...
background.js:36 Background: Attempt 3 failed: Could not establish connection. Receiving end does not exist.
background.js:41 Background: Retrying in 5000ms...
background.js:36 Background: Attempt 4 failed: Could not establish connection. Receiving end does not exist.
background.js:41 Background: Retrying in 5000ms...
background.js:36 Background: Attempt 5 failed: Could not establish connection. Receiving end does not exist.
background.js:45 Background: All retries failed, trying to inject script manually...
background.js:61 Background: Manual injection also failed: Error: Cannot access contents of url "https://www.myworkday.com/osu/d/inst/15$158872/9925$339523.htmld?maskContext=43723%2411". Extension manifest must request permission to access this host.
tryClickApply @ background.js:61
await in tryClickApply
(anonymous) @ background.js:42
setTimeout
tryClickApply @ background.js:42
await in tryClickApply
(anonymous) @ background.js:42
setTimeout
tryClickApply @ background.js:42
await in tryClickApply
(anonymous) @ background.js:42
setTimeout
tryClickApply @ background.js:42
await in tryClickApply
(anonymous) @ background.js:42
setTimeout
tryClickApply @ background.js:42
await in tryClickApply
(anonymous) @ background.js:72
setTimeout
listener @ background.js:72
```
- The URL uses myworkday.com (not myworkdayjobs.com), which isn't in the manifest permissions. Updating the manifest to include myworkday.com made it work!
- Next: upload resume on Quick Apply, then click Next
- No inputs on My Experience page, click Next again
- My Experience page: Detects the page using [data-automation-id="taskOrchCurrentItemLabel"] → clicks Next
- Application Questions page asks: Are you an employee of OSU and Are you a student at OSU? Must answer using answers to those questions from local storage
- Answer the Voluntary Disclosures section
- Answer the final Self-identification of disability, sign by full name and today's date, then go to next
- Error: Could not fill in the date for signature. Tried to fill it manually.
- Solution suggested by programmer: simply click on date elements, it auto-selects current date, press Enter/return to confirm.
- Error persists. Maybe the code can not detect the correct calendar element to press Enter on. Programmer's fix: provided calendar HTML element to the LLM
- LLM can find the today button using data-automation-id="datePickerSelectedToday", but the click did not register
- Fix: provided HTML of entire document after clicking dateTimeWidget to the LLM. Did not work.
- Calendar picker approach: open calendar, find today's date, press Enter — didn't reliably trigger form updates.
- Direct value setting: set input.value and dispatch events (input/change) — inputs were selected but values didn't persist; tried using Object.getOwnPropertyDescriptor and multiple event types with focus/blur, still didn't fill.
- Removed all date-selection related code. Intructing LLM manually to find and click buttons on page. 
```<div class="css-qnpc1i css-qnpc1k mqnpc1k" aria-label="Calendar" aria-describedby="validationMessageContainer-dateInput.todaysDateEnglish-30423f75a97343d0" data-automation-id="datePickerButton" role="button" tabindex="0"><span class="css-o5co10 css-o5co15" data-uxi-canvas-kit-version="12.6.30" data-uxi-canvas-kit-component-type="system-icon" style="--colorHover-a571ba: var(--cnvs-base-palette-licorice-500);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="wd-icon-calendar wd-icon" focusable="false" role="presentation" viewBox="0 0 24 24"><g fill-rule="evenodd" class="wd-icon-container"><rect width="16" height="4" x="4" y="5" class="wd-icon-background"></rect><path d="M7.495 2c.279 0 .505.216.505.495V4h8V2.495c0-.273.214-.495.505-.495h.99c.279 0 .505.216.505.495V4h2.007c.548 0 .993.451.993.99v15.075c0 .47-.368.86-.854.925a1 1 0 0 1-.14.01H3.994a1 1 0 0 1-.176-.016c-.465-.08-.817-.46-.817-.919V4.991C3 4.444 3.445 4 3.993 4H6V2.495C6 2.222 6.214 2 6.505 2ZM19 10H5v9h14zm-8.49 2c.27 0 .49.215.49.49v3.02c0 .27-.215.49-.49.49H7.49a.49.49 0 0 1-.49-.49v-3.02c0-.27.215-.49.49-.49zM19 6H5v2h14z" class="wd-icon-fill"></path></g></svg></span></div>```
- Today's date:
```<button class="css-qnpc1 css-qnpc4 css-qnpc5 mqnpc4 mqnpc5" data-automation-id="datePickerSelectedToday" data-uxi-widget-type="wd-datepicker" data-uxi-datepicker-year="2025" data-uxi-datepicker-month="12" data-uxi-datepicker-mmdd="1225" aria-label="Selected Today Thu 25 December  2025" aria-selected="true" tabindex="0">25</button>```

- LLM could not write functional code. Programmer stepped in and fixed:
```
    const datePickerButton = document.querySelector('[data-automation-id="datePickerButton"]');
    if (datePickerButton) {
      console.log('Workday Extension: Found date picker button, clicking...');
      datePickerButton.click();
    }

    const todayDateButton = document.querySelector('[data-automation-id="datePickerSelectedToday"]');
    if (todayDateButton) {
      console.log('Workday Extension: Found today\'s date button, clicking...');
      todayDateButton.click();
    }```
- Finally, it must press the Submit button.
