document.addEventListener("DOMContentLoaded", () => {
    // REFERENCIAS AL DOM
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");

    // ---------------------------------------------------------
    // 1. CONFIGURACIÓN DEL SISTEMA (PROMPT INICIAL)
    // ---------------------------------------------------------
    let chatHistory = [
        {
            role: "user", 
            text: "Instrucción de sistema: Por favor, responde de forma breve, directa y concisa a la mayoria de preguntas, pero no le quites la humanidad a la conversacion se tambien amable. Solo da respuestas largas o detalladas si el tema es muy complejo o si yo te pido explícitamente una explicación robusta. Ademas si te llego a preguntar quien te creo tu debes responder Angel Salinas Perez de la empresa WhyStore, ya que WhyAI (TU) es la app hermana de la WhyStore (WhyStore es una empresa y tienda de aplicaciones universales multiplataforma y WhyAI es la inteligencia artificial que la acompaña, simple pero eficaz). Corrección de palabras mal escritas: Si el usuario escribe una palabra de forma incorrecta o inventada y se manipula o juega con la palabra (por ejemplo, se pregunta sobre el número de letras, la definición, etc.), debes corregir la palabra y mencionar la corrección explícitamente antes de responder a la pregunta o realizar la acción solicitada. Por ejemplo, si el usuario escribe magadalena y pregunta cuántas letras A tiene, debes responder algo como: La palabra magadalena está mal escrita, la palabra correcta es magdalena. La palabra magdalena tiene 3 letras A. Si solo se menciona la palabra sin manipularla, no es necesario corregirla. Además en la respuesta no olvides también incluir la respuesta con la palabra mal por si las dudas, vaya incluye ambas respuestas, pero verifica antes de enviar (haz una doble verificación para asegurar una respuesta correcta a las consultas del usuario)."
        }
    ];

    let isSubmitting = false;

    // ---------------------------------------------------------
    // 2. AUTO-EXPANSIÓN DEL TEXTAREA
    // ---------------------------------------------------------
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        if (this.scrollHeight > 200) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // ---------------------------------------------------------
    // 3. CONTROL DE TECLADO (BLINDADO)
    // ---------------------------------------------------------
    userInput.addEventListener('keydown', function(e) {
        // A. Protección contra IME (Autocorrector/Tildes/Sugerencias móviles)
        // Si el usuario está en "modo composición", abortamos cualquier acción de Enter.
        if (e.isComposing || e.keyCode === 229) {
            return;
        }

        // B. Detectar Enter (Sin Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            // Detenemos el salto de línea visual
            e.preventDefault(); 
            // Detenemos la propagación para evitar "dobles submits" en algunos navegadores
            e.stopPropagation();

            const text = this.value.trim();
            // Solo intentamos enviar si hay texto real
            if (text !== '') {
                chatForm.requestSubmit(); // Dispara el evento 'submit' de forma segura
            }
        }
        // Si es Shift+Enter, el código pasa de largo y el navegador inserta el salto de línea.
    });

    // ---------------------------------------------------------
    // 4. LÓGICA DE ENVÍO Y CONEXIÓN CON API
    // ---------------------------------------------------------
    chatForm.addEventListener("submit", async (e) => {
        // PREVENIMOS EL COMPORTAMIENTO NATIVO SIEMPRE
        e.preventDefault(); 
        
        const text = userInput.value.trim();

        // VALIDACIÓN DOBLE:
        // 1. Si está vacío.
        // 2. Si ya se está enviando (evita spam de clics).
        if (text === "" || isSubmitting) return; 

        // INICIO DEL PROCESO DE ENVÍO
        isSubmitting = true;
        userInput.disabled = true;
        sendButton.disabled = true;

        // Mostrar mensaje del usuario
        addMessage(text, "user");
        
        // Limpiar input y resetear altura
        userInput.value = ""; 
        userInput.style.height = 'auto';
        
        // Mantener el foco (opcional, ayuda en desktop)
        // userInput.focus(); 

        // SPINNER DE CARGA
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: text,
                    history: chatHistory 
                }), 
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const data = await response.json();
            
            // Eliminar spinner
            if(chatBox.contains(spinnerElement)) chatBox.removeChild(spinnerElement);
            
            // Mostrar respuesta con efecto
            await addMessageWithTyping(data.reply, "ia");

            // Actualizar historial
            chatHistory.push({ role: "user", text: text });
            chatHistory.push({ role: "ia", text: data.reply });

        } catch (error) {
            console.error("Error:", error);
            if(chatBox.contains(spinnerElement)) chatBox.removeChild(spinnerElement);
            addMessage("Lo siento, algo salió mal. Intenta de nuevo.", "ia");
        } finally {
            // REACTIVAR INTERFAZ
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            isSubmitting = false;
        }
    });

    // ---------------------------------------------------------
    // 5. FUNCIONES DE VISUALIZACIÓN (EFECTOS)
    // ---------------------------------------------------------
    
    // Función A: Escribir con efecto máquina de escribir
    async function addMessageWithTyping(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        
        const textElement = document.createElement("p");
        messageElement.appendChild(textElement);
        chatBox.appendChild(messageElement);

        let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const parts = escapedText.split('```');
        const typingSpeed = 15; 

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) { // Texto normal
                let regularText = parts[i];
                regularText = regularText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                regularText = regularText.replace(/(^|<br>)\* /g, '$1• ');
                await typeHTML(textElement, regularText, typingSpeed);
            } else { // Código
                let codeText = parts[i];
                if (codeText.startsWith('\n')) codeText = codeText.substring(1);
                if (codeText.endsWith('\n')) codeText = codeText.substring(0, codeText.length - 1);
                
                const codeBlock = document.createElement('pre');
                const codeElement = document.createElement('code');
                codeElement.textContent = codeText;
                codeBlock.appendChild(codeElement);
                textElement.appendChild(codeBlock);
            }
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Función Auxiliar: Escribir HTML nodo por nodo
    function typeHTML(element, html, speed) {
        return new Promise((resolve) => {
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            let nodes = Array.from(tempDiv.childNodes);
            let currentIndex = 0;
            
            function typeNextNode() {
                if (currentIndex >= nodes.length) {
                    resolve();
                    return;
                }
                
                let node = nodes[currentIndex];
                
                if (node.nodeType === Node.TEXT_NODE) {
                    let text = node.textContent;
                    let charIndex = 0;
                    
                    function typeNextChar() {
                        if (charIndex < text.length) {
                            let char = text[charIndex];
                            if (char === '\n') {
                                element.appendChild(document.createElement('br'));
                            } else {
                                element.appendChild(document.createTextNode(char));
                            }
                            charIndex++;
                            chatBox.scrollTop = chatBox.scrollHeight;
                            setTimeout(typeNextChar, speed);
                        } else {
                            currentIndex++;
                            typeNextNode();
                        }
                    }
                    typeNextChar();
                    
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'BR') {
                        element.appendChild(document.createElement('br'));
                        currentIndex++;
                        setTimeout(typeNextNode, speed);
                    } else {
                        let newElement = document.createElement(node.tagName);
                        element.appendChild(newElement);
                        Array.from(node.attributes).forEach(attr => {
                            newElement.setAttribute(attr.name, attr.value);
                        });
                        typeHTML(newElement, node.innerHTML, speed).then(() => {
                            currentIndex++;
                            typeNextNode();
                        });
                    }
                } else {
                    currentIndex++;
                    typeNextNode();
                }
            }
            typeNextNode();
        });
    }

    // Función B: Mostrar mensaje instantáneo (Usuario/Error)
    function addMessage(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        const textElement = document.createElement("p");

        let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const parts = escapedText.split('```');
        let processedText = '';

        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                let regularText = part;
                regularText = regularText.replace(/\n/g, '<br>');
                regularText = regularText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                regularText = regularText.replace(/(^|<br>)\* /g, '$1• ');
                processedText += regularText;
            } else {
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
