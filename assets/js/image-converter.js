document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convert-btn');
    const imageInput = document.getElementById('image-input');
    const formatSelect = document.getElementById('format-select');
    const statusDiv = document.getElementById('conversion-status');

    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            const file = imageInput.files[0];
            const format = formatSelect.value;

            if (!file) {
                showStatus('Please select an image file / Por favor selecciona una imagen', 'error');
                return;
            }

            showStatus('Converting... / Convirtiendo...', 'info');
            convertBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('format', format);

            try {
                // Use the production Render URL
                const API_URL = 'https://python-backend-wtq1.onrender.com/convert';
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Conversion failed');
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `converted.${format.toLowerCase()}`; 
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                showStatus('Download started! / ¡Descarga iniciada!', 'success');
                
            } catch (error) {
                console.error(error);
                let msg = error.message;
                if (msg.includes('Failed to fetch')) {
                    msg = 'Cannot connect to server / No se puede conectar al servidor';
                }
                showStatus(`Error: ${msg}`, 'error');
            } finally {
                convertBtn.disabled = false;
            }
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
    }
});
