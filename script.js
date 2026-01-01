document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");

    // ---------------------------------------------------------
    // AUTO-EXPANSIÓN DEL TEXTAREA
    // ---------------------------------------------------------
    userInput.addEventListener('input', function() {
        // Reseteamos la altura para calcular correctamente
        this.style.height = 'auto';
        // Ajustamos la altura al contenido (limitado por max-height en CSS)
        this.style.height = this.scrollHeight + 'px';
        
        // Activamos el scroll solo cuando el contenido supera el max-height
        if (this.scrollHeight > 200) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // ---------------------------------------------------------
    // ENVIAR CON ENTER (Shift+Enter para nueva línea)
    // ---------------------------------------------------------
    userInput.addEventListener('keypress', function(e) {
        // keypress solo se dispara con teclas reales del usuario, no con wraps automáticos
        // Si presiona Enter sin Shift, enviamos el mensaje
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Evitamos el salto de línea
            
            // Validamos que haya texto antes de enviar
            const text = this.value.trim();
            if (text !== '') {
                // Creamos un evento de submit manual
                const submitEvent = new Event('submit', { cancelable: true });
                chatForm.dispatchEvent(submitEvent);
            }
        }
        // Si presiona Shift+Enter, permitimos el salto de línea (comportamiento por defecto)
    });

    // ---------------------------------------------------------
    // 1. CONFIGURACIÓN DEL COMPORTAMIENTO (El truco de la brevedad)
    // ---------------------------------------------------------
    // Iniciamos el historial con un mensaje que el usuario NO ve,
    // pero que la IA sí lee para saber cómo comportarse.
    let chatHistory = [
        {
            role: "user", 
            text: "Instrucción de sistema: Por favor, responde de forma breve, directa y concisa a la mayoria de preguntas, pero no le quites la humanidad a la conversacion se tambien amable. Solo da respuestas largas o detalladas si el tema es muy complejo o si yo te pido explícitamente una explicación robusta. Ademas si te llego a preguntar quien te creo tu debes responder Angel Salinas Perez de la empresa WhyStore, ya que WhyAI (TU) es la app hermana de la WhyStore (WhyStore es una empresa y tienda de aplicaciones universales multiplataforma y WhyAI es la inteligencia artificial que la acompaña, simple pero eficaz). Corrección de palabras mal escritas: Si el usuario escribe una palabra de forma incorrecta o inventada y se manipula o juega con la palabra (por ejemplo, se pregunta sobre el número de letras, la definición, etc.), debes corregir la palabra y mencionar la corrección explícitamente antes de responder a la pregunta o realizar la acción solicitada. Por ejemplo, si el usuario escribe magadalena y pregunta cuántas letras A tiene, debes responder algo como: La palabra magadalena está mal escrita, la palabra correcta es magdalena. La palabra magdalena tiene 3 letras A. Si solo se menciona la palabra sin manipularla, no es necesario corregirla. Además en la respuesta no olvides también incluir la respuesta con la palabra mal por si las dudas, vaya incluye ambas respuestas, pero verifica antes de enviar (haz una doble verificación para asegurar una respuesta correcta a las consultas del usuario)."
        }
    ];

    // Variable para prevenir envíos múltiples
    let isSubmitting = false;

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        const text = userInput.value.trim();
        if (text === "" || isSubmitting) return; 

        // Marcamos que estamos enviando
        isSubmitting = true;

        // Desactivamos interfaz mientras piensa
        userInput.disabled = true;
        sendButton.disabled = true;

        // Mostramos el mensaje del usuario en pantalla
        addMessage(text, "user");
        userInput.value = ""; 
        // Reseteamos la altura del textarea después de enviar
        userInput.style.height = 'auto';

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
            
            // Quitamos el spinner
            chatBox.removeChild(spinnerElement);
            
            // ---------------------------------------------------------
            // EFECTO DE ESCRITURA TIPO MÁQUINA DE ESCRIBIR
            // ---------------------------------------------------------
            await addMessageWithTyping(data.reply, "ia");

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
            // Liberamos el flag de envío
            isSubmitting = false;
        }
    });

    // ---------------------------------------------------------
    // FUNCIÓN PARA AÑADIR MENSAJE CON EFECTO DE ESCRITURA
    // ---------------------------------------------------------
    async function addMessageWithTyping(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        
        const textElement = document.createElement("p");
        messageElement.appendChild(textElement);
        chatBox.appendChild(messageElement);

        // Procesamos el texto con Markdown
        let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const parts = escapedText.split('```');
        
        // Velocidad de escritura (milisegundos por carácter)
        const typingSpeed = 15; // Ajusta este valor para más rápido (menor) o más lento (mayor)

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                // TEXTO NORMAL - lo escribimos carácter por carácter
                let regularText = parts[i];
                regularText = regularText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Negritas
                regularText = regularText.replace(/(^|<br>)\* /g, '$1• '); // Listas
                
                // Para el efecto de escritura, procesamos el HTML de forma especial
                await typeHTML(textElement, regularText, typingSpeed);
                
            } else {
                // BLOQUE DE CÓDIGO - lo mostramos completo (sin efecto de escritura)
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

    // ---------------------------------------------------------
    // FUNCIÓN AUXILIAR PARA ESCRIBIR HTML CARÁCTER POR CARÁCTER
    // ---------------------------------------------------------
    function typeHTML(element, html, speed) {
        return new Promise((resolve) => {
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Convertimos el HTML en un array de nodos y texto
            let nodes = Array.from(tempDiv.childNodes);
            let currentIndex = 0;
            
            function typeNextNode() {
                if (currentIndex >= nodes.length) {
                    resolve();
                    return;
                }
                
                let node = nodes[currentIndex];
                
                if (node.nodeType === Node.TEXT_NODE) {
                    // Es texto plano - lo escribimos carácter por carácter
                    let text = node.textContent;
                    let charIndex = 0;
                    
                    function typeNextChar() {
                        if (charIndex < text.length) {
                            let char = text[charIndex];
                            // Si es un salto de línea, lo convertimos a <br>
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
                    // Es un elemento HTML (como <b>, <br>, etc.)
                    if (node.tagName === 'BR') {
                        element.appendChild(document.createElement('br'));
                        currentIndex++;
                        setTimeout(typeNextNode, speed);
                    } else {
                        // Para elementos como <b>, creamos el elemento y escribimos su contenido
                        let newElement = document.createElement(node.tagName);
                        element.appendChild(newElement);
                        
                        // Copiamos atributos si los hay
                        Array.from(node.attributes).forEach(attr => {
                            newElement.setAttribute(attr.name, attr.value);
                        });
                        
                        // Escribimos el contenido interno
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

    // Función para mostrar mensajes instantáneamente (para mensajes del usuario)
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
