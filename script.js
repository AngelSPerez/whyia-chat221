document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");

    // ---------------------------------------------------------
    // 1. CONFIGURACIÓN DEL COMPORTAMIENTO (El truco de la brevedad)
    // ---------------------------------------------------------
    // Iniciamos el historial con un mensaje que el usuario NO ve,
    // pero que la IA sí lee para saber cómo comportarse.
    let chatHistory = [
        {
            role: "user", 
            text: "Instrucción de sistema: Por favor, responde de forma breve, directa y concisa a la mayoria de preguntas, pero no le quites la humanidad a la conversacion se tambien amable. Solo da respuestas largas o detalladas si el tema es muy complejo o si yo te pido explícitamente una explicación robusta. Ademas si te llego a preguntar quien te creo tu debes responder Angel Salinas Perez de la empresa WhyStore, ya que WhyAI (TU) es la app hermana de la WhyStore (WhyStore es una empresa y tienda de aplicaciones universales multiplataforma y WhyAI es la inteligencia artificial que la acompaña, simple pero eficaz). Corrección de palabras mal escritas: Si el usuario escribe una palabra de forma incorrecta o inventada y se manipula o juega con la palabra (por ejemplo, se pregunta sobre el número de letras, la definición, etc.), debes corregir la palabra y mencionar la corrección explícitamente antes de responder a la pregunta o realizar la acción solicitada. Por ejemplo, si el usuario escribe magadalena y pregunta cuántas letras A tiene, debes responder algo como: La palabra magadalena está mal escrita, la palabra correcta es magdalena. La palabra magdalena tiene 3 letras A. Si solo se menciona la palabra sin manipularla, no es necesario corregirla. Además en la respuesta no olvidas también incluir la respuesta con la palabra mal por si las dudas, vaya incluye ambas respuestas, pero verifica antes de enviar."
        }
    ];

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        const text = userInput.value.trim();
        if (text === "") return; 

        // Desactivamos interfaz mientras piensa
        userInput.disabled = true;
        sendButton.disabled = true;

        // Mostramos el mensaje del usuario en pantalla
        addMessage(text, "user");
        userInput.value = ""; 

        // Creamos el spinner de carga
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
                // Enviamos el prompt actual Y todo el historial (incluida la instrucción oculta)
                body: JSON.stringify({ 
                    prompt: text,
                    history: chatHistory 
                }), 
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Quitamos el spinner y mostramos la respuesta
            chatBox.removeChild(spinnerElement);
            addMessage(data.reply, "ia");

            // ---------------------------------------------------------
            // 2. ACTUALIZACIÓN DEL HISTORIAL
            // ---------------------------------------------------------
            // Guardamos lo que se acaba de hablar para que la IA tenga memoria
            // en la siguiente vuelta.
            chatHistory.push({ role: "user", text: text });
            chatHistory.push({ role: "ia", text: data.reply });

        } catch (error) {
            console.error("Error:", error);
            if(chatBox.contains(spinnerElement)) {
                chatBox.removeChild(spinnerElement);
            }
            addMessage("Lo siento, algo salió mal. Por favor, intenta de nuevo.", "ia");
        } finally {
            // Reactivamos la interfaz
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    });

    // Función para mostrar mensajes en el HTML (con soporte básico de Markdown)
    function addMessage(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        
        const textElement = document.createElement("p");

        // Escapamos HTML básico para evitar inyecciones
        let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Procesamos Markdown simple (negritas y bloques de código)
        const parts = escapedText.split('```');
        let processedText = '';

        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                // TEXTO NORMAL
                let regularText = part;
                regularText = regularText.replace(/\n/g, '<br>');
                regularText = regularText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Negritas
                regularText = regularText.replace(/(^|<br>)\* /g, '$1• '); // Listas
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
