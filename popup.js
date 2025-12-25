// Workday Job Application Helper - Popup Script

let jobUrls = [];
let currentIndex = 0;

// Load saved job URLs from storage
async function loadJobUrls() {
  try {
    const result = await chrome.storage.local.get(['jobUrls', 'currentIndex']);
    if (result.jobUrls) {
      jobUrls = result.jobUrls;
      currentIndex = result.currentIndex || 0;
      updateUI();
    }
  } catch (error) {
    console.error('Error loading job URLs:', error);
    showStatus('Error loading saved jobs', 'error');
  }
}

// Save job URLs to storage
async function saveJobUrls() {
  try {
    await chrome.storage.local.set({ 
      jobUrls: jobUrls,
      currentIndex: currentIndex 
    });
  } catch (error) {
    console.error('Error saving job URLs:', error);
    showStatus('Error saving jobs', 'error');
  }
}

// Update UI based on current state
function updateUI() {
  const openNextBtn = document.getElementById('openNext');
  const openAllBtn = document.getElementById('openAll');
  const jobListDiv = document.getElementById('jobList');
  
  if (jobUrls.length > 0) {
    openNextBtn.disabled = currentIndex >= jobUrls.length;
    openAllBtn.disabled = false;
    
    // Show job list
    jobListDiv.style.display = 'block';
    jobListDiv.innerHTML = `<div style="font-weight: 500; margin-bottom: 4px;">Jobs (${jobUrls.length} total, ${currentIndex} opened):</div>`;
    
    jobUrls.forEach((url, index) => {
      const jobItem = document.createElement('div');
      jobItem.className = 'job-item';
      const status = index < currentIndex ? '✓' : index === currentIndex ? '→' : '○';
      jobItem.textContent = `${status} ${url}`;
      jobListDiv.appendChild(jobItem);
    });
    
    showStatus(`${jobUrls.length} job(s) in list. ${currentIndex} opened.`, 'info');
  } else {
    openNextBtn.disabled = true;
    openAllBtn.disabled = true;
    jobListDiv.style.display = 'none';
    showStatus('No jobs in list. Add URLs above.', 'info');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // Clear status after 3 seconds for info messages
  if (type === 'info') {
    setTimeout(() => {
      if (statusDiv.textContent === message) {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }
    }, 3000);
  }
}

// Parse and add URLs from textarea
function addUrls() {
  const textarea = document.getElementById('jobUrls');
  const input = textarea.value.trim();
  
  if (!input) {
    showStatus('Please enter at least one job URL', 'error');
    return;
  }
  
  // Split by newlines and filter out empty lines
  const newUrls = input
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
  
  if (newUrls.length === 0) {
    showStatus('No valid URLs found. URLs must start with http:// or https://', 'error');
    return;
  }
  
  // Add new URLs (avoid duplicates)
  const existingUrls = new Set(jobUrls);
  let addedCount = 0;
  
  newUrls.forEach(url => {
    if (!existingUrls.has(url)) {
      jobUrls.push(url);
      addedCount++;
    }
  });
  
  saveJobUrls();
  textarea.value = '';
  updateUI();
  
  if (addedCount > 0) {
    showStatus(`Added ${addedCount} new job URL(s)`, 'success');
  } else {
    showStatus('All URLs already in list', 'info');
  }
}

// Open next job URL and click apply (delegates to background script)
async function openNextJob() {
  if (currentIndex >= jobUrls.length) {
    showStatus('All jobs have been opened!', 'info');
    return;
  }
  
  const url = jobUrls[currentIndex];
  
  try {
    showStatus(`Opening job ${currentIndex + 1} of ${jobUrls.length}...`, 'info');
    
    // Send message to background script to handle opening and clicking
    const response = await chrome.runtime.sendMessage({
      action: 'openNextJob',
      url: url,
      active: true
    });
    
    if (response && response.success) {
      currentIndex++;
      await saveJobUrls();
      updateUI();
      
      if (response.result && response.result.success) {
        showStatus(`Job ${currentIndex} opened and apply clicked!`, 'success');
      } else {
        showStatus(`Job ${currentIndex} opened. ${response.result?.message || 'Apply button not found'}`, 'info');
      }
      
      if (currentIndex >= jobUrls.length) {
        showStatus('All jobs processed!', 'success');
      }
    } else {
      showStatus(`Error: ${response?.error || 'Failed to open job'}`, 'error');
    }
  } catch (error) {
    console.error('Error opening job:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Open all remaining jobs and click apply on each (delegates to background script)
async function openAllJobs() {
  if (currentIndex >= jobUrls.length) {
    showStatus('All jobs have been opened!', 'info');
    return;
  }
  
  const remainingUrls = jobUrls.slice(currentIndex);
  const count = remainingUrls.length;
  const startIndex = currentIndex;
  
  try {
    showStatus(`Queuing ${count} job(s) to open and click apply...`, 'info');
    
    // Send message to background script to handle all jobs
    const response = await chrome.runtime.sendMessage({
      action: 'openAllJobs',
      urls: remainingUrls,
      startIndex: startIndex
    });
    
    if (response && response.success) {
      // Update index immediately since background will process them
      currentIndex += count;
      await saveJobUrls();
      updateUI();
      showStatus(`Processing ${count} job(s) in background...`, 'info');
    } else {
      showStatus(`Error: ${response?.error || 'Failed to queue jobs'}`, 'error');
    }
  } catch (error) {
    console.error('Error opening jobs:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Clear the job list
async function clearList() {
  if (jobUrls.length === 0) {
    showStatus('List is already empty', 'info');
    return;
  }
  
  if (confirm(`Are you sure you want to clear all ${jobUrls.length} job(s)?`)) {
    jobUrls = [];
    currentIndex = 0;
    await saveJobUrls();
    updateUI();
    showStatus('Job list cleared', 'success');
  }
}

// Click apply button on current tab
async function clickApplyOnCurrentTab() {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    // Check if it's a Workday URL
    const isWorkdayUrl = tab.url && (
      tab.url.includes('myworkdayjobs.com') || 
      tab.url.includes('myworkday.com') ||
      tab.url.includes('workday.com')
    );
    
    if (!isWorkdayUrl) {
      showStatus('Current tab is not a Workday page', 'error');
      return;
    }
    
    showStatus('Clicking apply button...', 'info');
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'clickApply' });
    
    if (response && response.success) {
      showStatus(response.message || 'Apply button clicked!', 'success');
    } else {
      showStatus(response?.message || 'Failed to click apply button', 'error');
    }
  } catch (error) {
    console.error('Error clicking apply button:', error);
    if (error.message.includes('Could not establish connection')) {
      showStatus('Content script not loaded. Please refresh the page.', 'error');
    } else {
      showStatus(`Error: ${error.message}`, 'error');
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'jobProcessed') {
    // Update current index when a job is processed
    if (request.jobNumber > currentIndex) {
      currentIndex = request.jobNumber;
      saveJobUrls();
      updateUI();
    }
    
    // Show status if popup is open
    if (request.result && request.result.success) {
      showStatus(`Job ${request.jobNumber} processed: Apply clicked!`, 'success');
    } else {
      showStatus(`Job ${request.jobNumber} processed: ${request.result?.message || 'Apply not found'}`, 'info');
    }
  }
  
  if (request.action === 'allJobsProcessed') {
    showStatus('All jobs processed!', 'success');
    updateUI();
  }
});

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadJobUrls();
  
  document.getElementById('addUrls').addEventListener('click', addUrls);
  document.getElementById('openNext').addEventListener('click', openNextJob);
  document.getElementById('openAll').addEventListener('click', openAllJobs);
  document.getElementById('clearList').addEventListener('click', clearList);
  document.getElementById('clickApply').addEventListener('click', clickApplyOnCurrentTab);
  
  // Allow Enter key to add URLs (with Ctrl/Cmd)
  document.getElementById('jobUrls').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      addUrls();
    }
  });
});
