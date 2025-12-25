# AI4SE - using AI in the SDLC
- tried using Opus 4.5 on Cursor, it didn't work. Could not automate a button click on 'Apply'
- Reading up on MCP and context7
- Using https://context7.com/puppeteer/puppeteer with Cursor
- error detected by programmer: Apply button did not click. The issue might be that after the link opens, the extension closes/disappears
- error was fed into Cursor. It generated new code, which still did not work. Provided more context (Copied the Button element's HTML)
- New code with service worker inspect view gave error: ```
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
