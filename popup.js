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

// Questionnaire answers management
async function loadQuestionnaireAnswers() {
  try {
    const result = await chrome.storage.local.get(['questionnaireAnswers']);
    if (result.questionnaireAnswers) {
      const answers = result.questionnaireAnswers;
      if (answers.employee) {
        document.getElementById('employeeAnswer').value = answers.employee;
      }
      if (answers.enrolled) {
        document.getElementById('enrolledAnswer').value = answers.enrolled;
      }
      updateAnswersStatus();
    }
  } catch (error) {
    console.error('Error loading questionnaire answers:', error);
  }
}

async function saveQuestionnaireAnswers() {
  const employeeAnswer = document.getElementById('employeeAnswer').value;
  const enrolledAnswer = document.getElementById('enrolledAnswer').value;
  
  const answers = {
    employee: employeeAnswer,
    enrolled: enrolledAnswer
  };
  
  try {
    await chrome.storage.local.set({ questionnaireAnswers: answers });
    updateAnswersStatus();
    showStatus('Questionnaire answers saved', 'success');
  } catch (error) {
    console.error('Error saving questionnaire answers:', error);
    showStatus('Error saving answers', 'error');
  }
}

function updateAnswersStatus() {
  const employeeAnswer = document.getElementById('employeeAnswer').value;
  const enrolledAnswer = document.getElementById('enrolledAnswer').value;
  const statusDiv = document.getElementById('answersStatus');
  
  if (employeeAnswer && enrolledAnswer) {
    statusDiv.textContent = 'Answers saved and ready';
    statusDiv.style.color = '#155724';
  } else {
    statusDiv.textContent = 'Please select answers for both questions';
    statusDiv.style.color = '#666';
  }
}

// Voluntary disclosures management
async function loadVoluntaryDisclosures() {
  try {
    const result = await chrome.storage.local.get(['voluntaryDisclosures']);
    if (result.voluntaryDisclosures) {
      const disclosures = result.voluntaryDisclosures;
      if (disclosures.sex) {
        document.getElementById('sexAnswer').value = disclosures.sex;
      }
      if (disclosures.hispanic) {
        document.getElementById('hispanicAnswer').value = disclosures.hispanic;
      }
      if (disclosures.race && Array.isArray(disclosures.race)) {
        const raceSelect = document.getElementById('raceAnswer');
        Array.from(raceSelect.options).forEach(option => {
          option.selected = disclosures.race.includes(option.value);
        });
      }
      if (disclosures.veteran) {
        document.getElementById('veteranAnswer').value = disclosures.veteran;
      }
      if (disclosures.termsAgreement !== undefined) {
        document.getElementById('termsAgreement').checked = disclosures.termsAgreement;
      }
      updateDisclosuresStatus();
    }
  } catch (error) {
    console.error('Error loading voluntary disclosures:', error);
  }
}

async function saveVoluntaryDisclosures() {
  const sexAnswer = document.getElementById('sexAnswer').value;
  const hispanicAnswer = document.getElementById('hispanicAnswer').value;
  const raceSelect = document.getElementById('raceAnswer');
  const raceAnswers = Array.from(raceSelect.selectedOptions).map(opt => opt.value);
  const veteranAnswer = document.getElementById('veteranAnswer').value;
  const termsAgreement = document.getElementById('termsAgreement').checked;
  
  const disclosures = {
    sex: sexAnswer,
    hispanic: hispanicAnswer,
    race: raceAnswers,
    veteran: veteranAnswer,
    termsAgreement: termsAgreement
  };
  
  try {
    await chrome.storage.local.set({ voluntaryDisclosures: disclosures });
    updateDisclosuresStatus();
    showStatus('Voluntary disclosures saved', 'success');
  } catch (error) {
    console.error('Error saving voluntary disclosures:', error);
    showStatus('Error saving disclosures', 'error');
  }
}

function updateDisclosuresStatus() {
  const sexAnswer = document.getElementById('sexAnswer').value;
  const hispanicAnswer = document.getElementById('hispanicAnswer').value;
  const raceSelect = document.getElementById('raceAnswer');
  const raceAnswers = Array.from(raceSelect.selectedOptions).map(opt => opt.value);
  const veteranAnswer = document.getElementById('veteranAnswer').value;
  const termsAgreement = document.getElementById('termsAgreement').checked;
  const statusDiv = document.getElementById('disclosuresStatus');
  
  const required = sexAnswer && hispanicAnswer && raceAnswers.length > 0 && veteranAnswer && termsAgreement;
  
  if (required) {
    statusDiv.textContent = 'All disclosures saved and ready';
    statusDiv.style.color = '#155724';
  } else {
    statusDiv.textContent = 'Please complete all required fields';
    statusDiv.style.color = '#666';
  }
}

// Resume management functions
async function loadResume() {
  try {
    const result = await chrome.storage.local.get(['resumeFileName', 'resumeFileData']);
    if (result.resumeFileName) {
      document.getElementById('resumeFileName').textContent = result.resumeFileName;
      document.getElementById('resumeStatus').textContent = 'Resume saved and ready';
      document.getElementById('resumeStatus').style.color = '#155724';
    }
  } catch (error) {
    console.error('Error loading resume:', error);
  }
}

async function saveResume(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result // base64 data URL
        };
        
        await chrome.storage.local.set({
          resumeFileName: file.name,
          resumeFileData: fileData
        });
        
        document.getElementById('resumeFileName').textContent = file.name;
        document.getElementById('resumeStatus').textContent = `Resume saved (${(file.size / 1024).toFixed(1)} KB)`;
        document.getElementById('resumeStatus').style.color = '#155724';
        
        showStatus(`Resume "${file.name}" saved successfully`, 'success');
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleResumeSelection() {
  const fileInput = document.getElementById('resumeFile');
  fileInput.click();
}

async function handleResumeFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showStatus('Resume file is too large. Maximum size is 5MB.', 'error');
    return;
  }
  
  // Check file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showStatus('Please select a PDF or Word document (.pdf, .doc, .docx)', 'error');
    return;
  }
  
  try {
    await saveResume(file);
  } catch (error) {
    console.error('Error saving resume:', error);
    showStatus('Error saving resume file', 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadJobUrls();
  loadResume();
  loadQuestionnaireAnswers();
  loadVoluntaryDisclosures();
  
  document.getElementById('addUrls').addEventListener('click', addUrls);
  document.getElementById('openNext').addEventListener('click', openNextJob);
  document.getElementById('openAll').addEventListener('click', openAllJobs);
  document.getElementById('clearList').addEventListener('click', clearList);
  document.getElementById('clickApply').addEventListener('click', clickApplyOnCurrentTab);
  document.getElementById('selectResume').addEventListener('click', handleResumeSelection);
  document.getElementById('resumeFile').addEventListener('change', handleResumeFileChange);
  document.getElementById('employeeAnswer').addEventListener('change', saveQuestionnaireAnswers);
  document.getElementById('enrolledAnswer').addEventListener('change', saveQuestionnaireAnswers);
  document.getElementById('sexAnswer').addEventListener('change', saveVoluntaryDisclosures);
  document.getElementById('hispanicAnswer').addEventListener('change', saveVoluntaryDisclosures);
  document.getElementById('raceAnswer').addEventListener('change', saveVoluntaryDisclosures);
  document.getElementById('veteranAnswer').addEventListener('change', saveVoluntaryDisclosures);
  document.getElementById('termsAgreement').addEventListener('change', saveVoluntaryDisclosures);
  
  // Allow Enter key to add URLs (with Ctrl/Cmd)
  document.getElementById('jobUrls').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      addUrls();
    }
  });
});
