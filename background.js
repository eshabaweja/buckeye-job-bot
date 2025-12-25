// Workday Job Application Helper - Background Service Worker
// This runs in the background and continues even after popup closes

// Queue for processing jobs
let jobQueue = [];
let isProcessing = false;

// Open a tab, wait for it to load, then click apply button
async function openJobAndClickApply(url, active = true) {
  return new Promise((resolve, reject) => {
    // Create the tab
    chrome.tabs.create({ url: url, active: active }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      const tabId = tab.id;
      let loaded = false;
      
      // Listen for tab updates to detect when page is loaded
      const listener = (updatedTabId, changeInfo, updatedTab) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete' && !loaded) {
          loaded = true;
          chrome.tabs.onUpdated.removeListener(listener);
          
          // Wait for content script to be ready and page to be fully interactive
          // Workday pages can be slow to fully render, so we wait and retry
          const tryClickApply = async (attempt = 1, maxAttempts = 5) => {
            try {
              // Send message to content script to click apply button
              const response = await chrome.tabs.sendMessage(tabId, { action: 'clickApply' });
              console.log('Background: Apply click response:', response);
              resolve(response);
            } catch (error) {
              console.log(`Background: Attempt ${attempt} failed:`, error.message);
              
              if (attempt < maxAttempts) {
                // Exponential backoff: wait longer each time
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.log(`Background: Retrying in ${delay}ms...`);
                setTimeout(() => tryClickApply(attempt + 1, maxAttempts), delay);
              } else {
                // Last attempt failed, try injecting script manually
                console.log('Background: All retries failed, trying to inject script manually...');
                try {
                  // Inject the content script manually
                  await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                  });
                  
                  // Wait a bit for script to initialize
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Try sending message again
                  const response = await chrome.tabs.sendMessage(tabId, { action: 'clickApply' });
                  console.log('Background: Manual injection success, response:', response);
                  resolve(response);
                } catch (injectError) {
                  console.error('Background: Manual injection also failed:', injectError);
                  resolve({
                    success: false,
                    message: `Could not connect to content script: ${injectError.message}`
                  });
                }
              }
            }
          };
          
          // Start trying after initial delay
          setTimeout(() => tryClickApply(), 2000);
        }
      };
      
      chrome.tabs.onUpdated.addListener(listener);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!loaded) {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve({
            success: false,
            message: 'Page load timeout'
          });
        }
      }, 30000);
    });
  });
}

// Process the job queue
async function processJobQueue() {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (jobQueue.length > 0) {
    const { url, active, jobNumber, total } = jobQueue.shift();
    
    try {
      console.log(`Processing job ${jobNumber} of ${total}: ${url}`);
      const result = await openJobAndClickApply(url, active);
      
      // Notify popup if it's open
      chrome.runtime.sendMessage({
        action: 'jobProcessed',
        jobNumber,
        total,
        url,
        result
      }).catch(() => {
        // Popup might be closed, that's okay
      });
      
      // Small delay between jobs
      if (jobQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`Error processing job ${jobNumber}:`, error);
      chrome.runtime.sendMessage({
        action: 'jobProcessed',
        jobNumber,
        total,
        url,
        result: { success: false, message: error.message }
      }).catch(() => {});
    }
  }
  
  isProcessing = false;
  
  // Notify that all jobs are done
  chrome.runtime.sendMessage({
    action: 'allJobsProcessed'
  }).catch(() => {});
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openNextJob') {
    const { url, active } = request;
    openJobAndClickApply(url, active).then(result => {
      sendResponse({ success: true, result });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'openAllJobs') {
    const { urls, startIndex } = request;
    
    // Clear existing queue and add new jobs
    jobQueue = [];
    urls.forEach((url, i) => {
      jobQueue.push({
        url,
        active: i === 0, // First job active, rest inactive
        jobNumber: startIndex + i + 1,
        total: startIndex + urls.length
      });
    });
    
    // Start processing
    processJobQueue();
    
    sendResponse({ success: true, message: `Queued ${urls.length} job(s)` });
    return true;
  }
  
  if (request.action === 'getQueueStatus') {
    sendResponse({
      queueLength: jobQueue.length,
      isProcessing: isProcessing
    });
    return true;
  }
});

