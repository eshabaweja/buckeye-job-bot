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

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clickApply') {
    clickApplyButton().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        success: false,
        message: `Error: ${error.message}`
      });
    });
    return true; // Keep channel open for async response
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
  }, 1000);
});

