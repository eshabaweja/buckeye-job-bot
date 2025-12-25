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

// Open next job URL
async function openNextJob() {
  if (currentIndex >= jobUrls.length) {
    showStatus('All jobs have been opened!', 'info');
    return;
  }
  
  const url = jobUrls[currentIndex];
  
  try {
    await chrome.tabs.create({ url: url, active: true });
    currentIndex++;
    await saveJobUrls();
    updateUI();
    
    if (currentIndex >= jobUrls.length) {
      showStatus('All jobs opened!', 'success');
    } else {
      showStatus(`Opening job ${currentIndex} of ${jobUrls.length}`, 'info');
    }
  } catch (error) {
    console.error('Error opening tab:', error);
    showStatus('Error opening job URL', 'error');
  }
}

// Open all remaining jobs
async function openAllJobs() {
  if (currentIndex >= jobUrls.length) {
    showStatus('All jobs have been opened!', 'info');
    return;
  }
  
  const remainingUrls = jobUrls.slice(currentIndex);
  const count = remainingUrls.length;
  
  try {
    // Update index immediately to prevent duplicate opens
    currentIndex += count;
    await saveJobUrls();
    
    // Create all tabs in parallel without blocking
    // Open first tab active, rest inactive to avoid popup closing
    remainingUrls.forEach((url, i) => {
      chrome.tabs.create({ 
        url: url, 
        active: i === 0 
      }).catch(err => {
        console.error(`Error opening tab ${url}:`, err);
      });
    });
    
    // Update UI immediately (popup might close after first tab opens)
    updateUI();
    showStatus(`Opening ${count} job(s)...`, 'success');
  } catch (error) {
    console.error('Error opening tabs:', error);
    showStatus('Error opening some job URLs', 'error');
    await saveJobUrls();
    updateUI();
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadJobUrls();
  
  document.getElementById('addUrls').addEventListener('click', addUrls);
  document.getElementById('openNext').addEventListener('click', openNextJob);
  document.getElementById('openAll').addEventListener('click', openAllJobs);
  document.getElementById('clearList').addEventListener('click', clearList);
  
  // Allow Enter key to add URLs (with Ctrl/Cmd)
  document.getElementById('jobUrls').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      addUrls();
    }
  });
});
