// error-suppressor.js - Silenciador de errores de carga de modelos

(function() {
  'use strict';

  // 🔇 Silenciar errores 404/401 de HuggingFace y modelos locales
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0]?.toString() || '';
    
    try {
      return await originalFetch.apply(this, args);
    } catch (error) {
      // Silenciar errores de carga de modelos
      if (url.includes('huggingface.co') || 
          url.includes('/models/') || 
          url.includes('tokenizer') || 
          url.includes('config.json')) {
        // No mostrar el error en consola
        throw error; // Pero sí propagarlo para que transformers.js lo maneje
      }
      
      // Mostrar otros errores normalmente
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // 🔇 Silenciar errores de consola específicos
  const originalError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    
    // Lista de errores a silenciar
    const silencePatterns = [
      'Failed to load resource',
      '404 (Not Found)',
      '401 (Unauthorized)',
      'Unauthorized access to file',
      'huggingface.co',
      '/models/Xenova/',
      'tokenizer.json',
      'config.json',
      'tokenizer_config.json'
    ];
    
    // Si el mensaje contiene algún patrón, no mostrarlo
    const shouldSilence = silencePatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSilence) {
      originalError.apply(console, args);
    }
  };

  // 🔇 Silenciar warnings específicos
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args[0]?.toString() || '';
    
    const silencePatterns = [
      'Failed to load resource',
      'huggingface.co',
      '/models/Xenova/'
    ];
    
    const shouldSilence = silencePatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSilence) {
      originalWarn.apply(console, args);
    }
  };

  console.log('🔇 Error suppressor activo - Ocultando errores de carga de modelos');
})();
