document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");

    // --- ¡CAMBIO AQUÍ! ---
    // Array para guardar el historial de la sesión actual
    let chatHistory = [];
    // ---------------------

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        const text = userInput.value.trim();
        if (text === "") return; 

        userInput.disabled = true;
        sendButton.disabled = true;

        addMessage(text, "user");
        userInput.value = ""; 

        const spinnerElement = document.createElement("div");
        spinnerElement.classList.add("message", "ia"); 
        spinnerElement.innerHTML = `
            <div class="spinner">
              <div class="bounce1"></div>
              <div class="bounce2"></div>
              <div class="bounce3"></div>
            </div>
        `;
        chatBox.appendChild(spinnerElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const backendUrl = '/api/chat'; 
            
            const response = await fetch(backendUrl, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // --- ¡CAMBIO AQUÍ! ---
                // Enviamos el prompt actual Y el historial
                body: JSON.stringify({ 
                    prompt: text,
                    history: chatHistory 
                }), 
                // --- FIN DEL CAMBIO ---
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.statusText}`);
            }

            const data = await response.json();
            
            chatBox.removeChild(spinnerElement);
            addMessage(data.reply, "ia");

            // --- ¡CAMBIO AQUÍ! ---
            // Guardamos la interacción en el historial para el próximo envío
            chatHistory.push({ role: "user", text: text });
            chatHistory.push({ role: "ia", text: data.reply });
            // ---------------------

        } catch (error) {
            console.error("Error:", error);
            chatBox.removeChild(spinnerElement);
            addMessage("Lo siento, algo salió mal. Por favor, intenta de nuevo.", "ia");
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    });

    // Tu función addMessage() sigue exactamente igual aquí abajo
    function addMessage(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        
        const textElement = document.createElement("p");

        // ... (el resto de tu función addMessage no cambia) ...
        let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const parts = escapedText.split('```');
        let processedText = '';

        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                // TEXTO NORMAL
                let regularText = part;
                regularText = regularText.replace(/\n/g, '<br>');
                regularText = regularText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                regularText = regularText.replace(/(^|<br>)\* /g, '$1• ');
                processedText += regularText;
            } else {
                // BLOQUE DE CÓDIGO
                let codeText = part;
                if (codeText.startsWith('\n')) codeText = codeText.substring(1);
                if (codeText.endsWith('\n')) codeText = codeText.substring(0, codeText.length - 1);
                processedText += `<pre><code>${codeText}</code></pre>`;
            }
        });

        textElement.innerHTML = processedText;
        messageElement.appendChild(textElement);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
