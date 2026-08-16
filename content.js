(function() {
  if (window.top !== window) {
    console.log('[SmartCall] Skipping iframe');
    return;
  }

  if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.warn('[SmartCall] chrome.runtime not available');
    return;
  }

  console.log('[SmartCall] Content script loaded in top frame');

  const BUTTON_ID = 'custom-call-button';
  const KEYBOARD_SELECTOR = '.wp-keyboard';

  let volumeTimeout = null;
  let checkInterval = null;

  const indicator = document.createElement('div');
  indicator.id = 'volume-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: Arial, sans-serif;
    font-size: 18px;
    font-weight: bold;
    display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    user-select: none;
  `;
  document.body.appendChild(indicator);

  function showStatus(text) {
    indicator.textContent = text;
    indicator.style.display = 'block';
  }

  function hideStatus() {
    indicator.style.display = 'none';
  }

  function getCallButton() {
    const allTds = document.querySelectorAll('.wp-keyboard table td');
    for (const td of allTds) {
      if (td.textContent.trim() === 'Позвонить') {
        return td;
      }
    }
    return null;
  }

  function addCustomButton() {
    const keyboard = document.querySelector(KEYBOARD_SELECTOR);
    if (!keyboard) {
      const existingBtn = document.getElementById(BUTTON_ID);
      if (existingBtn) {
        existingBtn.remove();
        console.log('[SmartCall] Removed orphan button');
      }
      return false;
    }

    if (document.getElementById(BUTTON_ID)) {
      return true;
    }

    const table = keyboard.querySelector('table');
    if (!table) {
      console.log('[SmartCall] Table not found');
      return false;
    }

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '3');
    td.textContent = 'Позвонить не оглохнув';
    td.id = BUTTON_ID;
    td.style.cssText = `
      cursor: pointer;
      text-align: center;
      font-weight: bold;
      padding: 8px 0;
      background: #333;
      color: white;
      border-radius: 10px;
      transition: background 0.2s;
    `;
    td.addEventListener('mouseenter', () => {
      td.style.background = '#555';
    });
    td.addEventListener('mouseleave', () => {
      td.style.background = '#333';
    });

    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.appendChild(tr);
      tr.appendChild(td);
    } else {
      table.appendChild(tr);
      tr.appendChild(td);
    }

    td.addEventListener('click', handleCustomCall);
    console.log('[SmartCall] Custom button added');
    return true;
  }

  function handleCustomCall() {
    if (volumeTimeout) {
      console.log('[SmartCall] Already in progress');
      return;
    }

    console.log('[SmartCall] Custom call initiated: mute 4.5 sec, then unmute');

    const callBtn = getCallButton();
    if (!callBtn) {
      console.warn('[SmartCall] Original call button not found');
      return;
    }

    chrome.runtime.sendMessage({ action: 'toggleMute', muted: true });
    showStatus('🔇=0%');

    setTimeout(() => {
      callBtn.click();
      console.log('[SmartCall] Original call button clicked');
    }, 100);

    volumeTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'toggleMute', muted: false });
      showStatus('🔊=100%');
      setTimeout(() => {
        hideStatus();
      }, 1000);
      volumeTimeout = null;
    }, 4500);
  }

  function checkAndAddButton() {
    addCustomButton();
  }

  checkAndAddButton();
  checkInterval = setInterval(checkAndAddButton, 200);

  window.addEventListener('beforeunload', () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  });

})();