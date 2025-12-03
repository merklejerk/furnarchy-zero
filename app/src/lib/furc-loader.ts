export async function loadFurcadiaScript(scriptUrl: string): Promise<void> {
    const response = await fetch(scriptUrl);
    if (!response.ok) throw new Error(`Failed to fetch client script: ${response.statusText}`);
    
    let scriptContent = await response.text();

    // Patch the script
    // Replace XMLHttpRequest with FurcXMLHttpRequest
    scriptContent = scriptContent.replaceAll('XMLHttpRequest', 'FurcXMLHttpRequest');
    // Replace WebSocket with FurcWebSocket
    scriptContent = scriptContent.replaceAll('WebSocket', 'FurcWebSocket');

    // Inject the script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    script.async = true;
    
    document.body.appendChild(script);
}
