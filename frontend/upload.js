(() => {
  // CONFIG
  const backendUrl = 'http://localhost:8000/generate?n=10'; // change if needed
  const tryBackend = true; // set false to only simulate local storage
  const MAX_INLINE_STORE_BYTES = 2 * 1024 * 1024; // 2MB threshold for storing base64 in localStorage

  // DOM
  const dropArea = document.getElementById('dropArea');
  const dropText = document.getElementById('dropText');
  const loadingEl = document.getElementById('loading');
  const statusMessage = document.getElementById('statusMessage');
  const playBtn = document.getElementById('playBtn');

  let selectedFile = null;

  // Utility: show/hide helpers
  function showLoading(show) { loadingEl.classList.toggle('hidden', !show); }
  function setStatus(msg, isError = false) {
    statusMessage.textContent = msg || '';
    statusMessage.style.color = isError ? '#ff6666' : '#ccc';
  }

  // Prevent default for drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt =>
    document.addEventListener(evt, e => e.preventDefault(), false)
  );

  // Highlight drop area
  ['dragenter', 'dragover'].forEach(evt => {
    dropArea.addEventListener(evt, (e) => {
      dropArea.classList.add('highlight');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropArea.addEventListener(evt, (e) => {
      dropArea.classList.remove('highlight');
    });
  });

  // Handle drop
  dropArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });

  // Click opens file dialog
  dropArea.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (ev) => {
      const file = ev.target.files && ev.target.files[0];
      handleFile(file);
    };
    input.click();
  });

  // keyboard accessibility (Enter or Space)
  dropArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dropArea.click();
    }
  });

  async function handleFile(file) {
    if (!file) {
      console.warn('No file received.');
      return;
    }

    // Basic validation
    const name = file.name || 'file';
    const isPdfMime = file.type === 'application/pdf';
    const hasPdfExt = name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !hasPdfExt) {
      setStatus('Please provide a PDF file (.pdf).', true);
      console.warn('Rejected non-PDF file:', file.type, name);
      return;
    }

    selectedFile = file;
    dropText.innerHTML = `📄 Selected: <strong>${name}</strong>`;

    // Start uploading / saving
    setStatus('');
    showLoading(true);
    playBtn.disabled = true;
    playBtn.classList.remove('ready');

    try {
      if (tryBackend) {
        // Try uploading to backend
        const form = new FormData();
        form.append('file', file, file.name);

        const resp = await fetch(backendUrl, { method: 'POST', body: form });
        // network error or CORS will throw and be caught below
        const text = await resp.text();
        let json = null;
        try { json = JSON.parse(text); } catch(e) { json = null; }

        if (!resp.ok) {
          console.error('Server error:', resp.status, text);
          // fallback to local store
          await fallbackLocalStore(file, `Server returned ${resp.status}. Saved locally.`);
        } else {
          // Success: server returned something
          if (json && json.questions) {
            localStorage.setItem('handquest_questions', JSON.stringify(json.questions));
            localStorage.setItem('uploaded_pdf_name', file.name);
            setStatus('Upload complete. Questions saved.');
            console.log('Saved questions to localStorage (key: handquest_questions)', json.questions);
          } else {
            // Server returned ok but not the expected JSON
            console.warn('Unexpected server response; storing file metadata locally.', text);
            await fallbackLocalStore(file, 'Uploaded to server but response unexpected. Saved locally.');
          }
          playBtn.disabled = false;
          playBtn.classList.add('ready');
        }
      } else {
        // No backend: simulate and store locally
        await fallbackLocalStore(file, 'Saved locally (no backend).');
        playBtn.disabled = false;
        playBtn.classList.add('ready');
      }
    } catch (err) {
      console.warn('Upload failed (network or CORS). Falling back to local store.', err);
      await fallbackLocalStore(file, 'Upload failed; saved locally.');
      playBtn.disabled = false;
      playBtn.classList.add('ready');
    } finally {
      showLoading(false);
    }
  }

  // fallbackLocalStore: tries to store a small base64 copy if file size is small,
  // otherwise just stores metadata (name, size, timestamp)
  async function fallbackLocalStore(file, userMsg) {
    const meta = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      savedAt: Date.now()
    };
    try {
      if (file.size <= MAX_INLINE_STORE_BYTES) {
        const dataUrl = await readFileAsDataURL(file);
        localStorage.setItem('uploaded_pdf_data', dataUrl); // caution: localStorage size limit
        localStorage.setItem('uploaded_pdf_meta', JSON.stringify(meta));
        setStatus(userMsg + ' (stored inline)');
        console.log('Stored inline base64 in localStorage (key: uploaded_pdf_data). meta:', meta);
      } else {
        // too big to store inline; store metadata only
        localStorage.setItem('uploaded_pdf_meta', JSON.stringify(meta));
        setStatus(userMsg + ' (metadata stored; file too large to inline)');
        console.log('File too large to inline. Stored metadata in localStorage (key: uploaded_pdf_meta).', meta);
      }
      localStorage.setItem('uploaded_pdf_name', file.name);
    } catch (err) {
      console.error('Local storage failed:', err);
      setStatus('Failed to store file locally. See console for details.', true);
    }
  }

  // helper: File -> Data URL (base64)
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // Start Game button triggers game.html and logs
  playBtn.addEventListener('click', () => {
    const name = localStorage.getItem('uploaded_pdf_name') || '(none)';
    console.log('🚀 Start Game pressed. uploaded_pdf_name =', name);
    // Ensure something saved before navigating
    const meta = localStorage.getItem('uploaded_pdf_meta');
    const questions = localStorage.getItem('handquest_questions');
    if (!meta && !questions && !localStorage.getItem('uploaded_pdf_data')) {
      alert('No uploaded PDF found. Please upload first.');
      return;
    }
    // go to game page
    window.location.href = 'game.html';
  });

  // Safety: expose a debug function for console
  window._uploadDebug = {
    uploaded_pdf_name: () => localStorage.getItem('uploaded_pdf_name'),
    uploaded_meta: () => localStorage.getItem('uploaded_pdf_meta'),
    uploaded_data: () => localStorage.getItem('uploaded_pdf_data'),
    questions: () => JSON.parse(localStorage.getItem('handquest_questions') || 'null')
  };

})();
