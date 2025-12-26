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
              
              // After clicking Next on My Experience, wait for questionnaire page
              setTimeout(async () => {
                let qAttempts = 0;
                const maxQAttempts = 30;
                
                const checkForQuestionnaire = setInterval(async () => {
                  qAttempts++;
                  const employeeDropdown = findDropdownByLabel('active employee');
                  const enrolledDropdown = findDropdownByLabel('currently enrolled');
                  
                  if (employeeDropdown || enrolledDropdown) {
                    clearInterval(checkForQuestionnaire);
                    console.log('Workday Extension: Detected questionnaire page after My Experience');
                    const handled = await checkAndHandleQuestionnairePage();
                    // After questionnaire, wait for Voluntary Disclosures
                    if (handled) {
                      setTimeout(async () => {
                        let vdAttempts = 0;
                        const maxVDAttempts = 30;
                        const checkForVoluntaryDisclosures = setInterval(async () => {
                          vdAttempts++;
                          const vdIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
                          if (vdIndicator && vdIndicator.textContent?.trim() === 'Voluntary Disclosures') {
                            clearInterval(checkForVoluntaryDisclosures);
                            console.log('Workday Extension: Detected Voluntary Disclosures page after questionnaire');
                            await checkAndHandleVoluntaryDisclosuresPage();
                          } else if (vdAttempts >= maxVDAttempts) {
                            clearInterval(checkForVoluntaryDisclosures);
                            console.log('Workday Extension: Timeout waiting for Voluntary Disclosures page');
                          }
                        }, 500);
                      }, 2000);
                    }
                  } else if (qAttempts >= maxQAttempts) {
                    clearInterval(checkForQuestionnaire);
                    console.log('Workday Extension: Timeout waiting for questionnaire page');
                  }
                }, 500);
              }, 2000);
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

// Function to find dropdown by label text
function findDropdownByLabel(labelText) {
  // Find all labels
  const labels = document.querySelectorAll('label[data-automation-id="formLabel"]');
  for (const label of labels) {
    const text = label.textContent?.trim() || '';
    if (text.includes(labelText)) {
      // Find the associated dropdown
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        const dropdown = document.getElementById(labelFor);
        if (dropdown && dropdown.getAttribute('data-automation-id') === 'selectWidget') {
          return dropdown;
        }
      }
      // Alternative: find dropdown near the label
      const fieldSet = label.closest('[data-automation-id="fieldSetBody"]');
      if (fieldSet) {
        const dropdown = fieldSet.querySelector('[data-automation-id="selectWidget"]');
        if (dropdown) {
          return dropdown;
        }
      }
    }
  }
  return null;
}

// Function to select option in dropdown
async function selectDropdownOption(dropdown, optionText) {
  try {
    // Click to open dropdown
    dropdown.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find all option elements
    const options = document.querySelectorAll('[role="option"], [data-automation-id="selectOption"]');
    for (const option of options) {
      const text = option.textContent?.trim() || '';
      if (text === optionText || text.toLowerCase() === optionText.toLowerCase()) {
        option.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`Workday Extension: Selected "${optionText}" in dropdown`);
        return true;
      }
    }
    
    // If not found, try clicking the dropdown again and look for options
    dropdown.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Look for options in expanded dropdown
    const expandedOptions = document.querySelectorAll('[role="option"], [data-automation-id="selectOption"], .gwt-ListBox-item');
    for (const option of expandedOptions) {
      const text = option.textContent?.trim() || '';
      if (text === optionText || text.toLowerCase() === optionText.toLowerCase()) {
        option.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`Workday Extension: Selected "${optionText}" in dropdown (second attempt)`);
        return true;
      }
    }
    
    console.log(`Workday Extension: Option "${optionText}" not found in dropdown`);
    return false;
  } catch (error) {
    console.error('Workday Extension: Error selecting dropdown option:', error);
    return false;
  }
}

// Auto-detect questionnaire page and fill answers
async function checkAndHandleQuestionnairePage() {
  // Check if we're on a questionnaire page (has dropdowns with questions)
  const employeeDropdown = findDropdownByLabel('active employee');
  const enrolledDropdown = findDropdownByLabel('currently enrolled');
  
  if (employeeDropdown || enrolledDropdown) {
    console.log('Workday Extension: Detected questionnaire page');
    
    // Get stored answers
    const result = await chrome.storage.local.get(['questionnaireAnswers']);
    if (!result.questionnaireAnswers) {
      console.log('Workday Extension: No questionnaire answers stored');
      return false;
    }
    
    const answers = result.questionnaireAnswers;
    
    // Wait a bit for page to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let allAnswered = true;
    
    // Answer employee question
    if (employeeDropdown && answers.employee) {
      const answered = await selectDropdownOption(employeeDropdown, answers.employee);
      if (!answered) {
        allAnswered = false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Answer enrolled question
    if (enrolledDropdown && answers.enrolled) {
      const answered = await selectDropdownOption(enrolledDropdown, answers.enrolled);
      if (!answered) {
        allAnswered = false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (allAnswered) {
      console.log('Workday Extension: All questionnaire answers filled');
      
      // Wait a bit then click Next
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const nextButton = findNextButton();
      if (nextButton) {
        console.log('Workday Extension: Found Next button on questionnaire page');
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
        
        console.log('Workday Extension: Next button clicked on questionnaire page');
        
        // After clicking Next on questionnaire, wait for Voluntary Disclosures page
        setTimeout(async () => {
          let vdAttempts = 0;
          const maxVDAttempts = 30;
          const checkForVoluntaryDisclosures = setInterval(async () => {
            vdAttempts++;
            const vdIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
            if (vdIndicator && vdIndicator.textContent?.trim() === 'Voluntary Disclosures') {
              clearInterval(checkForVoluntaryDisclosures);
              console.log('Workday Extension: Detected Voluntary Disclosures page after questionnaire');
              await checkAndHandleVoluntaryDisclosuresPage();
            } else if (vdAttempts >= maxVDAttempts) {
              clearInterval(checkForVoluntaryDisclosures);
              console.log('Workday Extension: Timeout waiting for Voluntary Disclosures page');
            }
          }, 500);
        }, 2000);
        
        return true;
      }
    }
    
    return true; // Return true even if Next button not found, we tried to answer
  }
  
  return false;
}

// Function to find radio button group by label
function findRadioGroupByLabel(labelText) {
  const labels = document.querySelectorAll('label[data-automation-id="formLabel"]');
  for (const label of labels) {
    const text = label.textContent?.trim() || '';
    if (text.includes(labelText)) {
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        const radioGroup = document.getElementById(labelFor);
        if (radioGroup && radioGroup.getAttribute('data-automation-id') === 'selectOneRadioGroup') {
          return radioGroup;
        }
      }
      // Alternative: find radio group near the label
      const fieldSet = label.closest('[data-automation-id="fieldSetBody"]');
      if (fieldSet) {
        const radioGroup = fieldSet.querySelector('[data-automation-id="selectOneRadioGroup"]');
        if (radioGroup) {
          return radioGroup;
        }
      }
    }
  }
  return null;
}

// Function to find checkbox group by label
function findCheckboxGroupByLabel(labelText) {
  const labels = document.querySelectorAll('label[data-automation-id="formLabel"]');
  for (const label of labels) {
    const text = label.textContent?.trim() || '';
    if (text.includes(labelText)) {
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        const checkboxGroup = document.getElementById(labelFor);
        if (checkboxGroup && checkboxGroup.getAttribute('data-automation-id') === 'selectMany') {
          return checkboxGroup;
        }
      }
      // Alternative: find checkbox group near the label
      const fieldSet = label.closest('[data-automation-id="fieldSetBody"]');
      if (fieldSet) {
        const checkboxGroup = fieldSet.querySelector('[data-automation-id="selectMany"]');
        if (checkboxGroup) {
          return checkboxGroup;
        }
      }
    }
  }
  return null;
}

// Function to find checkbox by label
function findCheckboxByLabel(labelText) {
  const labels = document.querySelectorAll('label[data-automation-id="formLabel"]');
  for (const label of labels) {
    const text = label.textContent?.trim() || '';
    if (text.includes(labelText)) {
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        const checkbox = document.getElementById(labelFor);
        if (checkbox && checkbox.type === 'checkbox') {
          return checkbox;
        }
      }
      // Alternative: find checkbox near the label
      const fieldSet = label.closest('[data-automation-id="fieldSetBody"]');
      if (fieldSet) {
        const checkbox = fieldSet.querySelector('input[type="checkbox"]');
        if (checkbox) {
          return checkbox;
        }
      }
    }
  }
  return null;
}

// Function to select radio button option
async function selectRadioOption(radioGroup, optionText) {
  try {
    const radioButtons = radioGroup.querySelectorAll('input[type="radio"]');
    for (const radio of radioButtons) {
      const label = radio.closest('[data-automation-id="radioBtn"]')?.querySelector('label');
      if (label) {
        const text = label.textContent?.trim() || '';
        if (text === optionText || text.toLowerCase() === optionText.toLowerCase()) {
          radio.click();
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log(`Workday Extension: Selected "${optionText}" in radio group`);
          return true;
        }
      }
    }
    console.log(`Workday Extension: Option "${optionText}" not found in radio group`);
    return false;
  } catch (error) {
    console.error('Workday Extension: Error selecting radio option:', error);
    return false;
  }
}

// Function to select checkbox options
async function selectCheckboxOptions(checkboxGroup, optionTexts) {
  try {
    const checkboxes = checkboxGroup.querySelectorAll('[data-automation-id="checkbox"]');
    for (const checkboxDiv of checkboxes) {
      const checkbox = checkboxDiv.querySelector('input[type="checkbox"]');
      const label = checkboxDiv.querySelector('label');
      if (checkbox && label) {
        const text = label.textContent?.trim() || '';
        const shouldBeChecked = optionTexts.some(opt => 
          text === opt || text.includes(opt.split('(')[0].trim())
        );
        if (shouldBeChecked && !checkbox.checked) {
          checkbox.click();
          await new Promise(resolve => setTimeout(resolve, 200));
          console.log(`Workday Extension: Checked "${text}"`);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Workday Extension: Error selecting checkboxes:', error);
    return false;
  }
}

// Auto-detect Voluntary Disclosures page and fill answers
async function checkAndHandleVoluntaryDisclosuresPage() {
  // Look for the specific "Voluntary Disclosures" indicator element
  const voluntaryDisclosuresIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
  
  // Check if the indicator exists and contains "Voluntary Disclosures"
  const isVoluntaryDisclosuresPage = voluntaryDisclosuresIndicator && 
    voluntaryDisclosuresIndicator.textContent?.trim() === 'Voluntary Disclosures';
  
  if (isVoluntaryDisclosuresPage) {
    console.log('Workday Extension: Detected Voluntary Disclosures page');
    
    // Get stored answers
    const result = await chrome.storage.local.get(['voluntaryDisclosures']);
    if (!result.voluntaryDisclosures) {
      console.log('Workday Extension: No voluntary disclosures stored');
      return false;
    }
    
    const disclosures = result.voluntaryDisclosures;
    
    // Wait a bit for page to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let allFilled = true;
    
    // Fill sex dropdown
    if (disclosures.sex) {
      const sexDropdown = findDropdownByLabel('select your sex');
      if (sexDropdown) {
        const filled = await selectDropdownOption(sexDropdown, disclosures.sex);
        if (!filled) allFilled = false;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Fill Hispanic/Latino radio
    if (disclosures.hispanic) {
      const hispanicRadio = findRadioGroupByLabel('Hispanic or Latino');
      if (hispanicRadio) {
        const filled = await selectRadioOption(hispanicRadio, disclosures.hispanic);
        if (!filled) allFilled = false;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Fill race checkboxes
    if (disclosures.race && disclosures.race.length > 0) {
      const raceCheckboxes = findCheckboxGroupByLabel('select the race');
      if (raceCheckboxes) {
        await selectCheckboxOptions(raceCheckboxes, disclosures.race);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Fill veteran status dropdown
    if (disclosures.veteran) {
      const veteranDropdown = findDropdownByLabel('select your Veteran status');
      if (veteranDropdown) {
        const filled = await selectDropdownOption(veteranDropdown, disclosures.veteran);
        if (!filled) allFilled = false;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Check terms agreement checkbox
    if (disclosures.termsAgreement) {
      const termsCheckbox = findCheckboxByLabel('I hereby agree to the Terms and Conditions');
      if (termsCheckbox && !termsCheckbox.checked) {
        termsCheckbox.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Workday Extension: Checked terms agreement');
      }
    }
    
    if (allFilled || disclosures.termsAgreement) {
      console.log('Workday Extension: All voluntary disclosures filled');
      
      // Wait a bit then click Next
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const nextButton = findNextButton();
      if (nextButton) {
        console.log('Workday Extension: Found Next button on Voluntary Disclosures page');
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
        
        console.log('Workday Extension: Next button clicked on Voluntary Disclosures page');
        
        // After clicking Next on Voluntary Disclosures, wait for Self Identify page
        setTimeout(async () => {
          let siAttempts = 0;
          const maxSIAttempts = 30;
          const checkForSelfIdentify = setInterval(async () => {
            siAttempts++;
            const siIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
            if (siIndicator && siIndicator.textContent?.trim() === 'Self Identify') {
              clearInterval(checkForSelfIdentify);
              console.log('Workday Extension: Detected Self Identify page after Voluntary Disclosures');
              await checkAndHandleSelfIdentifyPage();
            } else if (siAttempts >= maxSIAttempts) {
              clearInterval(checkForSelfIdentify);
              console.log('Workday Extension: Timeout waiting for Self Identify page');
            }
          }, 500);
        }, 2000);
        
        return true;
      }
    }
    
    return true; // Return true even if Next button not found, we tried to fill
  }
  
  return false;
}

// Function to find text input by label
function findTextInputByLabel(labelText) {
  const labels = document.querySelectorAll('label[data-automation-id="formLabel"]');
  for (const label of labels) {
    const text = label.textContent?.trim() || '';
    if (text.includes(labelText)) {
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        const input = document.getElementById(labelFor);
        if (input && (input.type === 'text' || input.tagName === 'INPUT')) {
          return input;
        }
      }
      // Alternative: find input near the label
      const fieldSet = label.closest('[data-automation-id="fieldSetBody"]');
      if (fieldSet) {
        const input = fieldSet.querySelector('input[type="text"]');
        if (input) {
          return input;
        }
      }
    }
  }
  return null;
}


// Auto-detect Self Identify (Disability) page and fill form
async function checkAndHandleSelfIdentifyPage() {
  // Look for the specific "Self Identify" indicator element
  const selfIdentifyIndicator = document.querySelector('[data-automation-id="taskOrchCurrentItemLabel"]');
  
  // Check if the indicator exists and contains "Self Identify"
  const isSelfIdentifyPage = selfIdentifyIndicator && 
    selfIdentifyIndicator.textContent?.trim() === 'Self Identify';
  
  if (isSelfIdentifyPage) {
    console.log('Workday Extension: Detected Self Identify page');
    
    // Get stored disability info
    const result = await chrome.storage.local.get(['disabilityInfo']);
    if (!result.disabilityInfo) {
      console.log('Workday Extension: No disability information stored');
      return false;
    }
    
    const info = result.disabilityInfo;
    
    // Wait a bit for page to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let allFilled = true;
    
    // Fill name
    if (info.name) {
      const nameInput = findTextInputByLabel('Name');
      if (nameInput) {
        nameInput.value = info.name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Workday Extension: Filled name:', info.name);
      } else {
        allFilled = false;
      }
    }
    
    // Fill employee ID (optional)
    if (info.employeeId) {
      const employeeIdInput = findTextInputByLabel('Employee ID');
      if (employeeIdInput) {
        employeeIdInput.value = info.employeeId;
        employeeIdInput.dispatchEvent(new Event('input', { bubbles: true }));
        employeeIdInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Workday Extension: Filled employee ID:', info.employeeId);
      }
    }
    
    // Fill date by clicking date picker button and then today's date
    const datePickerButton = document.querySelector('[data-automation-id="datePickerButton"]');
    if (datePickerButton) {
      console.log('Workday Extension: Found date picker button, clicking...');
      datePickerButton.click();
    }

    const todayDateButton = document.querySelector('[data-automation-id="datePickerSelectedToday"]');
    if (todayDateButton) {
      console.log('Workday Extension: Found today\'s date button, clicking...');
      todayDateButton.click();
    }
    
    // Fill disability status checkbox
    if (info.status) {
      const disabilityCheckboxGroup = findCheckboxGroupByLabel('Please check one of the boxes below');
      if (disabilityCheckboxGroup) {
        const checkboxes = disabilityCheckboxGroup.querySelectorAll('[data-automation-id="checkbox"]');
        for (const checkboxDiv of checkboxes) {
          const checkbox = checkboxDiv.querySelector('input[type="checkbox"]');
          const label = checkboxDiv.querySelector('label');
          if (checkbox && label) {
            const text = label.textContent?.trim() || '';
            if (text === info.status) {
              if (!checkbox.checked) {
                checkbox.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('Workday Extension: Selected disability status:', info.status);
                break;
              }
            }
          }
        }
      } else {
        allFilled = false;
      }
    }
    
    if (allFilled || info.status) {
      console.log('Workday Extension: All disability information filled');
      
      // Wait a bit then click Next
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const nextButton = findNextButton();
      if (nextButton) {
        console.log('Workday Extension: Found Next button on Self Identify page');
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
        
        console.log('Workday Extension: Next button clicked on Self Identify page');
        return true;
      }
    }
    
    return true; // Return true even if Next button not found, we tried to fill
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
      // After clicking apply, check if we're on Quick Apply page, My Experience page, questionnaire, Voluntary Disclosures, or Self Identify
      setTimeout(async () => {
        if (!checkAndHandleQuickApplyPage()) {
          if (!checkAndHandleMyExperiencePage()) {
            if (!(await checkAndHandleQuestionnairePage())) {
              if (!(await checkAndHandleVoluntaryDisclosuresPage())) {
                await checkAndHandleSelfIdentifyPage();
              }
            }
          }
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
  
  if (request.action === 'fillQuestionnaire') {
    checkAndHandleQuestionnairePage().then(result => {
      sendResponse({ success: result });
    }).catch(error => {
      sendResponse({ success: false, message: error.message });
    });
    return true;
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
  setTimeout(async () => {
    const button = findApplyButton();
    if (button) {
      console.log('Workday Extension: Apply button found:', button.textContent.trim());
    } else {
      console.log('Workday Extension: Apply button not found on this page');
    }
    
    // Check for Quick Apply page first, then My Experience page, then questionnaire, then Voluntary Disclosures, then Self Identify
    if (!checkAndHandleQuickApplyPage()) {
      if (!checkAndHandleMyExperiencePage()) {
        if (!(await checkAndHandleQuestionnairePage())) {
          if (!(await checkAndHandleVoluntaryDisclosuresPage())) {
            await checkAndHandleSelfIdentifyPage();
          }
        }
      }
    }
  }, 1000);
});

// Also check when DOM is ready (in case load event already fired)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      if (!checkAndHandleQuickApplyPage()) {
        if (!checkAndHandleMyExperiencePage()) {
          if (!(await checkAndHandleQuestionnairePage())) {
            if (!(await checkAndHandleVoluntaryDisclosuresPage())) {
              await checkAndHandleSelfIdentifyPage();
            }
          }
        }
      }
    }, 2000);
  });
} else {
  setTimeout(async () => {
    if (!checkAndHandleQuickApplyPage()) {
      if (!checkAndHandleMyExperiencePage()) {
        if (!(await checkAndHandleQuestionnairePage())) {
          if (!(await checkAndHandleVoluntaryDisclosuresPage())) {
            await checkAndHandleSelfIdentifyPage();
          }
        }
      }
    }
  }, 2000);
}

