// OpenCV.js Loader - Lokale Version ohne externe Dependencies
// Lädt OpenCV.js von lokalen Dateien

function loadOpenCV() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.cv && window.cv.Mat) {
      console.log('OpenCV.js already loaded');
      resolve();
      return;
    }

    // Progress tracking
    let loadStartTime = Date.now();
    
    // Show loading message
    console.log('Loading OpenCV.js from local file (~8MB)...');
    
    // Try fetch first to handle large file better
    fetch('/libs/opencv/opencv.js')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log('OpenCV.js fetch successful, loading script...');
        
        // Use blob URL to load the script
        return response.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const script = document.createElement('script');
        script.src = blobUrl;
        
        // Set up OpenCV Module config before loading
        window.Module = {
          onRuntimeInitialized: function() {
            const totalTime = Date.now() - loadStartTime;
            console.log(`OpenCV.js initialized in ${totalTime}ms`);
            URL.revokeObjectURL(blobUrl); // Clean up
            resolve();
          },
          print: (text) => console.log('OpenCV:', text),
          printErr: (text) => console.error('OpenCV:', text)
        };
        
        script.onload = () => {
          console.log('OpenCV.js script element loaded');
        };
        
        script.onerror = (error) => {
          URL.revokeObjectURL(blobUrl);
          console.error('Script execution failed:', error);
          reject(new Error('Failed to execute OpenCV.js'));
        };
        
        document.head.appendChild(script);
      })
      .catch(fetchError => {
        console.error('Fetch failed, trying direct script tag:', fetchError);
        
        // Fallback to regular script tag
        const script = document.createElement('script');
        script.src = '/libs/opencv/opencv.js';
        
        window.Module = {
          onRuntimeInitialized: function() {
            const totalTime = Date.now() - loadStartTime;
            console.log(`OpenCV.js initialized via script tag in ${totalTime}ms`);
            resolve();
          }
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load OpenCV.js - server may be having issues with large files'));
        };
        
        document.head.appendChild(script);
      });
  });
}

// Export for use in modules
window.loadOpenCV = loadOpenCV;