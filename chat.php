<?php
// chat.php (Versión Corregida)

// --- 1. Configuración de Seguridad ---
// ¡¡ADVERTENCIA!!
// La clave que pegaste en tu último mensaje (AIzaSyCE3Y...)
// TAMBIÉN es pública ahora. ¡NO LA USES!
// Debes generar una TERCERA clave nueva y mantenerla secreta.
$apiKey = 'AIzaSyC5KHyf5vq8kfiZqDZ4wzURCDzMKqp9mf4';

if (!$apiKey) {
    http_response_code(500); 
    echo json_encode(['reply' => 'Error Crítico: La API key no está configurada.']);
    exit;
}

// --- 2. Leer el Prompt del Frontend ---
$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput);
$userPrompt = $data->prompt ?? '';

if (empty($userPrompt)) {
    http_response_code(400); 
    echo json_encode(['reply' => 'Error: No se recibió ningún prompt.']);
    exit;
}

// --- 3. Preparar la llamada a la API de Google ---

// ¡CAMBIO AQUI!
// La API key ya NO se pasa en la URL.
// También usé el modelo 'gemini-1.5-flash' que es más común, 
// pero puedes cambiarlo a 'gemini-2.0-flash' si lo prefieres.
$apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

$postData = [
    'contents' => [
        [
            'parts' => [
                ['text' => $userPrompt]
            ]
        ]
    ]
];

// --- 4. Usar cURL para enviar la solicitud a Google ---
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));

// ¡CAMBIO AQUI!
// Añadimos la API key como un header, tal como en tu ejemplo de curl.
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-goog-api-key: ' . $apiKey  // <--- ESTA ES LA FORMA CORRECTA
]);

// Esto sigue siendo necesario para localhost
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch); // Capturamos error de cURL
curl_close($ch);

// --- 5. Procesar la Respuesta de Google ---
if ($httpCode == 200) {
    // Éxito
    $apiResponse = json_decode($response);
    $iaText = $apiResponse->candidates[0]->content->parts[0]->text ?? 'Lo siento, no pude procesar una respuesta.';

    header('Content-Type: application/json');
    echo json_encode(['reply' => $iaText]);

} else {
    // Error
    http_response_code(502); // Bad Gateway
    echo json_encode([
        'reply' => 'Error: La API de Google devolvió un error.',
        'http_code' => $httpCode,
        'curl_error' => $curl_error, // Te dirá si cURL falló (ej. "Connection refused")
        'google_response' => json_decode($response) // Error real de Google
    ]);
}

?>