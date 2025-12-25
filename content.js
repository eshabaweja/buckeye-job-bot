// Workday Job Application Helper - Content Script
// This script runs on Workday pages to interact with job listings

// Common selectors for Workday apply buttons (varies by university implementation)
const APPLY_BUTTON_SELECTORS = [
  // Workday-specific selectors based on actual button structure
  'button[data-automation-id="label"][title="Apply"]',
  'button[data-automation-id="label"][aria-label*="Apply"]',
  'button[data-automation-button-type="PRIMARY"][title="Apply"]',
  'button[data-automation-button-type="PRIMARY"][aria-label*="Apply"]',
  'button[title="Apply"]',
  'button[aria-label*="Apply"]',
  'button[aria-label*="apply"]',
  
  // Standard Workday selectors
  'button[data-automation-id="applyButton"]',
  'a[data-automation-id="applyButton"]',
  '[data-automation-id="applyButton"]',
  
  // Alternative selectors
  'button.wd-button-primary',
  '[aria-label*="Apply"]',
  
  // Generic button selectors (will be filtered by isApplyButton)
  'button[type="button"]',
  'a[role="button"]'
];

// Function to find apply button using multiple strategies
function findApplyButton() {
  // Strategy 1: Try common selectors
  for (const selector of APPLY_BUTTON_SELECTORS) {
    try {
      const button = document.querySelector(selector);
      if (button && isApplyButton(button)) {
        return button;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Strategy 2: Search all buttons by text content
  const allButtons = document.querySelectorAll('button, a[role="button"], a.button');
  for (const button of allButtons) {
    if (isApplyButton(button)) {
      return button;
    }
  }
  
  // Strategy 3: Search by aria-label
  const ariaButtons = document.querySelectorAll('[aria-label]');
  for (const button of ariaButtons) {
    const label = button.getAttribute('aria-label')?.toLowerCase() || '';
    if (label.includes('apply') && (button.tagName === 'BUTTON' || button.tagName === 'A')) {
      return button;
    }
  }
  
  return null;
}

// Check if an element is likely an apply button
function isApplyButton(element) {
  const text = (element.textContent || '').trim().toLowerCase();
  const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
  const title = (element.getAttribute('title') || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const className = (element.className || '').toLowerCase();
  const dataAutomationId = (element.getAttribute('data-automation-id') || '').toLowerCase();
  const dataAutomationButtonType = (element.getAttribute('data-automation-button-type') || '').toLowerCase();
  
  // Check title attribute (common in Workday buttons)
  if (title === 'apply' || title.includes('apply')) {
    return true;
  }
  
  // Check if it's a PRIMARY button with Apply in aria-label or text
  if (dataAutomationButtonType === 'primary') {
    if (ariaLabel.includes('apply') || text.includes('apply')) {
      return true;
    }
  }
  
  // Check text content (including nested spans)
  if (text.includes('apply') && !text.includes('already applied') && !text.includes('applied to')) {
    return true;
  }
  
  // Check aria-label
  if (ariaLabel.includes('apply') && !ariaLabel.includes('already applied')) {
    return true;
  }
  
  // Check data-automation-id (even if it's "label", if it has Apply text/aria-label, it's likely the apply button)
  if (dataAutomationId === 'label' && (title === 'apply' || ariaLabel.includes('apply') || text.includes('apply'))) {
    return true;
  }
  
  // Check if data-automation-id contains "apply"
  if (dataAutomationId.includes('apply')) {
    return true;
  }
  
  // Check id
  if (id.includes('apply')) {
    return true;
  }
  
  return false;
}

// Function to click apply button
async function clickApplyButton() {
  const button = findApplyButton();
  
  if (!button) {
    console.log('Workday Extension: Apply button not found. Searching page...');
    // Try one more comprehensive search
    const allButtons = document.querySelectorAll('button');
    console.log(`Found ${allButtons.length} buttons on page`);
    for (const btn of allButtons) {
      const btnText = btn.textContent?.trim() || '';
      const btnTitle = btn.getAttribute('title') || '';
      const btnAria = btn.getAttribute('aria-label') || '';
      if (btnText.toLowerCase().includes('apply') || btnTitle.toLowerCase().includes('apply') || btnAria.toLowerCase().includes('apply')) {
        console.log('Found potential apply button:', {
          text: btnText,
          title: btnTitle,
          ariaLabel: btnAria,
          dataAutomationId: btn.getAttribute('data-automation-id'),
          dataAutomationButtonType: btn.getAttribute('data-automation-button-type')
        });
      }
    }
    return {
      success: false,
      message: 'Apply button not found on this page'
    };
  }
  
  console.log('Workday Extension: Found apply button:', {
    text: button.textContent?.trim(),
    title: button.getAttribute('title'),
    ariaLabel: button.getAttribute('aria-label'),
    dataAutomationId: button.getAttribute('data-automation-id'),
    dataAutomationButtonType: button.getAttribute('data-automation-button-type'),
    disabled: button.disabled
  });
  
  // Check if button is visible and enabled
  const style = window.getComputedStyle(button);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return {
      success: false,
      message: 'Apply button is not visible'
    };
  }
  
  // Scroll button into view
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Wait a bit for scroll to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try to click the button
  try {
    // Check if button is disabled
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
      return {
        success: false,
        message: 'Apply button is disabled'
      };
    }
    
    // Try multiple click methods for better compatibility
    // Method 1: Standard click
    button.click();
    
    // Method 2: Dispatch mouse events (more reliable for some sites)
    const mouseEvents = ['mousedown', 'mouseup', 'click'];
    mouseEvents.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true
      });
      button.dispatchEvent(event);
    });
    
    // Method 3: If it's a form button, try submitting
    if (button.type === 'submit' && button.form) {
      button.form.submit();
    }
    
    console.log('Workday Extension: Apply button clicked successfully');
    return {
      success: true,
      message: 'Apply button clicked successfully'
    };
  } catch (error) {
    console.error('Workday Extension: Error clicking apply button:', error);
    return {
      success: false,
      message: `Error clicking button: ${error.message}`
    };
  }
}

// Function to find file input for resume upload
function findResumeFileInput() {
  // Common selectors for file inputs in Workday
  const selectors = [
    'input[type="file"]',
    'input[accept*="pdf"]',
    'input[accept*="doc"]',
    'input[data-automation-id*="resume"]',
    'input[data-automation-id*="file"]',
    'input[aria-label*="resume"]',
    'input[aria-label*="Resume"]',
    'input[aria-label*="file"]',
    'input[aria-label*="File"]'
  ];
  
  for (const selector of selectors) {
    try {
      const input = document.querySelector(selector);
      if (input && input.type === 'file') {
        return input;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Search all file inputs
  const allFileInputs = document.querySelectorAll('input[type="file"]');
  for (const input of allFileInputs) {
    const label = input.getAttribute('aria-label')?.toLowerCase() || '';
    const accept = input.getAttribute('accept')?.toLowerCase() || '';
    if (label.includes('resume') || label.includes('file') || accept.includes('pdf') || accept.includes('doc')) {
      return input;
    }
  }
  
  return allFileInputs.length > 0 ? allFileInputs[0] : null;
}

// Function to find Next button
function findNextButton() {
  const selectors = [
    'button[data-automation-id*="next"]',
    'button[aria-label*="Next"]',
    'button[aria-label*="next"]',
    'button:contains("Next")',
    'button[title="Next"]'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button) {
        const text = (button.textContent || '').trim().toLowerCase();
        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('next') || ariaLabel.includes('next')) {
          return button;
        }
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Search all buttons
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const text = (button.textContent || '').trim().toLowerCase();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    if ((text === 'next' || text.includes('next')) && !text.includes('previous')) {
      return button;
    }
    if (ariaLabel.includes('next') && !ariaLabel.includes('previous')) {
      return button;
    }
  }
  
  return null;
}

// Function to upload resume and click next
async function uploadResumeAndContinue() {
  try {
    // Get stored resume from storage
    const result = await chrome.storage.local.get(['resumeFileData']);
    if (!result.resumeFileData) {
      return {
        success: false,
        message: 'No resume file stored. Please upload a resume in the extension popup.'
      };
    }
    
    const resumeData = result.resumeFileData;
    console.log('Workday Extension: Found stored resume:', resumeData.name);
    
    // Find file input
    const fileInput = findResumeFileInput();
    if (!fileInput) {
      return {
        success: false,
        message: 'Resume file input not found on this page'
      };
    }
    
    console.log('Workday Extension: Found file input');
    
    // Convert base64 data URL to File object
    const base64Data = resumeData.data.split(',')[1]; // Remove data:type;base64, prefix
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], resumeData.name, { type: resumeData.type });
    
    // Create a DataTransfer object to set files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    
    // Also trigger input event
    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);
    
    console.log('Workday Extension: Resume file uploaded');
    
    // Wait a bit for the file to process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Find and click Next button
    const nextButton = findNextButton();
    if (!nextButton) {
      return {
        success: true,
        message: 'Resume uploaded successfully, but Next button not found'
      };
    }
    
    console.log('Workday Extension: Found Next button, clicking...');
    
    // Scroll into view
    nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click the button
    nextButton.click();
    
    // Also dispatch mouse events
    const mouseEvents = ['mousedown', 'mouseup', 'click'];
    mouseEvents.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true
      });
      nextButton.dispatchEvent(event);
    });
    
    console.log('Workday Extension: Next button clicked on Quick Apply page');
    
    // After clicking Next on Quick Apply, wait for navigation to My Experience page
    // Then automatically click Next there
    setTimeout(() => {
      // Check periodically for My Experience page (up to 15 seconds)
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 500ms = 15 seconds
      
      const checkForMyExperience = setInterval(() => {
        attempts++;
        // Look for the specific "My Experience" indicator element
        const myExperienceIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
        const isMyExperience = myExperienceIndicator && 
          myExperienceIndicator.textContent?.trim() === 'My Experience';
        
        if (isMyExperience) {
          const nextButton = findNextButton();
          if (nextButton) {
            clearInterval(checkForMyExperience);
            console.log('Workday Extension: Detected My Experience page after Quick Apply, clicking Next...');
            
            // Scroll and click Next button
            nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              nextButton.click();
              
              // Also dispatch mouse events
              const mouseEvents = ['mousedown', 'mouseup', 'click'];
              mouseEvents.forEach(eventType => {
                const event = new MouseEvent(eventType, {
                  view: window,
                  bubbles: true,
                  cancelable: true
                });
                nextButton.dispatchEvent(event);
              });
              
              console.log('Workday Extension: Next button clicked on My Experience page');
            }, 500);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkForMyExperience);
            console.log('Workday Extension: My Experience page detected but Next button not found');
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(checkForMyExperience);
          console.log('Workday Extension: Timeout waiting for My Experience page');
        }
      }, 500);
    }, 2000); // Wait 2 seconds after clicking Next on Quick Apply
    
    return {
      success: true,
      message: 'Resume uploaded and Next button clicked successfully'
    };
  } catch (error) {
    console.error('Workday Extension: Error uploading resume:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Auto-detect Quick Apply page and upload resume
function checkAndHandleQuickApplyPage() {
  // Check if we're on a Quick Apply page (look for file input or specific indicators)
  const fileInput = findResumeFileInput();
  if (fileInput) {
    console.log('Workday Extension: Detected Quick Apply page');
    // Wait a bit for page to be fully ready
    setTimeout(async () => {
      const result = await uploadResumeAndContinue();
      console.log('Workday Extension: Quick Apply result:', result);
    }, 2000);
    return true;
  }
  return false;
}

// Auto-detect My Experience page and click Next
function checkAndHandleMyExperiencePage() {
  // Look for the specific "My Experience" indicator element
  const myExperienceIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
  
  // Check if the indicator exists and contains "My Experience"
  const isMyExperiencePage = myExperienceIndicator && 
    myExperienceIndicator.textContent?.trim() === 'My Experience';
  
  if (isMyExperiencePage) {
    console.log('Workday Extension: Detected My Experience page');
    // Wait a bit for page to be fully ready
    setTimeout(async () => {
      const nextButton = findNextButton();
      if (nextButton) {
        console.log('Workday Extension: Found Next button on My Experience page');
        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Click the button
        nextButton.click();
        
        // Also dispatch mouse events
        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        mouseEvents.forEach(eventType => {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
          });
          nextButton.dispatchEvent(event);
        });
        
        console.log('Workday Extension: Next button clicked on My Experience page');
      } else {
        console.log('Workday Extension: Next button not found on My Experience page');
      }
    }, 2000);
    return true;
  }
  return false;
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clickApply') {
    clickApplyButton().then(result => {
      sendResponse(result);
      // After clicking apply, check if we're on Quick Apply page or My Experience page
      setTimeout(() => {
        if (!checkAndHandleQuickApplyPage()) {
          checkAndHandleMyExperiencePage();
        }
      }, 3000);
    }).catch(error => {
      sendResponse({
        success: false,
        message: `Error: ${error.message}`
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'uploadResume') {
    uploadResumeAndContinue().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        success: false,
        message: `Error: ${error.message}`
      });
    });
    return true;
  }
  
  if (request.action === 'findApplyButton') {
    const button = findApplyButton();
    sendResponse({
      found: button !== null,
      buttonText: button ? button.textContent.trim() : null,
      buttonInfo: button ? {
        tagName: button.tagName,
        id: button.id,
        className: button.className,
        ariaLabel: button.getAttribute('aria-label'),
        dataAutomationId: button.getAttribute('data-automation-id')
      } : null
    });
    return true;
  }
});

// Auto-detect and log apply button on page load (for debugging)
window.addEventListener('load', () => {
  setTimeout(() => {
    const button = findApplyButton();
    if (button) {
      console.log('Workday Extension: Apply button found:', button.textContent.trim());
    } else {
      console.log('Workday Extension: Apply button not found on this page');
    }
    
    // Check for Quick Apply page first, then My Experience page
    if (!checkAndHandleQuickApplyPage()) {
      checkAndHandleMyExperiencePage();
    }
  }, 1000);
});

// Also check when DOM is ready (in case load event already fired)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (!checkAndHandleQuickApplyPage()) {
        checkAndHandleMyExperiencePage();
      }
    }, 2000);
  });
} else {
  setTimeout(() => {
    if (!checkAndHandleQuickApplyPage()) {
      checkAndHandleMyExperiencePage();
    }
  }, 2000);
}

