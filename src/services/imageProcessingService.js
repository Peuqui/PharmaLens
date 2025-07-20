// Image Processing Service mit OpenCV.js
import { ref } from 'vue'

class ImageProcessingService {
  constructor() {
    this.isReady = ref(false)
    this.loadingProgress = ref(0)
    this.cv = null
  }

  async initialize() {
    if (this.isReady.value) return true
    
    try {
      // Load OpenCV.js
      if (window.loadOpenCV) {
        this.loadingProgress.value = 10
        console.log('Starting OpenCV initialization...')
        
        // Add retry logic
        let retries = 3
        let lastError = null
        
        while (retries > 0 && !this.isReady.value) {
          try {
            await window.loadOpenCV()
            this.cv = window.cv
            this.loadingProgress.value = 100
            this.isReady.value = true
            console.log('OpenCV.js initialized successfully')
            return true
          } catch (error) {
            lastError = error
            retries--
            console.warn(`OpenCV load attempt failed, ${retries} retries left:`, error.message)
            
            if (retries > 0) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 2000))
              this.loadingProgress.value = 10 + (3 - retries) * 30
            }
          }
        }
        
        throw lastError || new Error('Failed to initialize OpenCV after retries')
      } else {
        throw new Error('OpenCV loader not found - please check opencv-loader.js')
      }
    } catch (error) {
      console.error('Failed to initialize OpenCV:', error)
      this.isReady.value = false
      throw error
    }
  }

  // Automatische Dokumentenerkennung (4-Punkt)
  async detectDocument(imageBlob) {
    if (!this.isReady.value) {
      // Skip initialization if it fails
      try {
        await this.initialize()
      } catch (error) {
        console.warn('OpenCV not available, returning default corners')
        return {
          success: false,
          corners: null,
          imageSize: { width: 100, height: 100 }
        }
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          // Convert to OpenCV Mat
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          const src = this.cv.imread(canvas)
          const dst = new this.cv.Mat()
          
          // Convert to grayscale
          this.cv.cvtColor(src, dst, this.cv.COLOR_RGBA2GRAY)
          
          // Einfacherer Ansatz für klarere Dokumentenerkennung
          // Apply Gaussian blur to reduce noise
          const blurred = new this.cv.Mat()
          const ksize = new this.cv.Size(5, 5)
          this.cv.GaussianBlur(dst, blurred, ksize, 0)
          
          // Canny edge detection mit höheren Schwellwerten für weniger Kanten
          const edges = new this.cv.Mat()
          this.cv.Canny(blurred, edges, 100, 200)
          
          // Dilate edges to close gaps
          const kernel = this.cv.getStructuringElement(
            this.cv.MORPH_RECT, new this.cv.Size(5, 5))
          this.cv.dilate(edges, edges, kernel)
          
          // Erode to restore size
          this.cv.erode(edges, edges, kernel)
          
          // Cleanup
          blurred.delete()
          kernel.delete()
          
          // Find contours
          const contours = new this.cv.MatVector()
          const hierarchy = new this.cv.Mat()
          this.cv.findContours(edges, contours, hierarchy, 
            this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE)
          
          // Find largest rectangular contour
          let maxArea = 0
          let bestContour = null
          let bestApprox = null
          
          console.log(`Found ${contours.size()} contours`)
          const imageArea = img.width * img.height
          console.log(`Image size: ${img.width}x${img.height}, total area: ${imageArea}`)
          
          // Finde die größten Konturen
          let largestContours = []
          
          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i)
            const area = this.cv.contourArea(contour)
            
            if (area > 1000) { // Minimale Größe
              largestContours.push({ index: i, area: area, contour: contour })
            }
          }
          
          // Sortiere nach Größe
          largestContours.sort((a, b) => b.area - a.area)
          
          // Zeige die 5 größten Konturen
          console.log(`Top 5 largest contours:`)
          for (let j = 0; j < Math.min(5, largestContours.length); j++) {
            const item = largestContours[j]
            const peri = this.cv.arcLength(item.contour, true)
            const approx = new this.cv.Mat()
            this.cv.approxPolyDP(item.contour, approx, 0.02 * peri, true)
            console.log(`  ${j+1}. Area: ${item.area} (${(item.area/imageArea*100).toFixed(1)}%), Vertices: ${approx.rows}`)
            approx.delete()
          }
          
          // Versuche mit verschiedenen Mindestgrößen
          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i)
            const area = this.cv.contourArea(contour)
            
            // Reduziere Mindestgröße auf 10% für Tests
            const minArea = imageArea * 0.1
            
            if (area > minArea) {
              const peri = this.cv.arcLength(contour, true)
              const approx = new this.cv.Mat()
              // Toleranz für Polygon-Approximation
              this.cv.approxPolyDP(contour, approx, 0.02 * peri, true)
              
              console.log(`Large contour ${i}: area=${area} (${(area/imageArea*100).toFixed(1)}%), vertices=${approx.rows}`)
              
              // Check if it's approximately a quadrilateral (4-6 vertices)
              if (approx.rows >= 4 && approx.rows <= 6 && area > maxArea) {
                maxArea = area
                bestContour = contour
                // Delete previous best approx if exists
                if (bestApprox) {
                  bestApprox.delete()
                }
                bestApprox = approx
              } else {
                // Only delete if not keeping it
                approx.delete()
              }
            }
          }
          
          let corners = null
          
          // Reduziere Mindestgröße auf 5% der Bildfläche
          if (bestApprox && maxArea > (img.width * img.height * 0.05)) {
            // Extract corner points
            const allPoints = []
            for (let i = 0; i < bestApprox.rows; i++) {
              allPoints.push({
                x: bestApprox.data32S[i * 2],
                y: bestApprox.data32S[i * 2 + 1]
              })
            }
            
            // If we have more than 4 points, find the 4 corner-most points
            if (allPoints.length > 4) {
              console.log(`Reducing ${allPoints.length} vertices to 4 corners`)
              
              // Find the 4 extreme points (corners of bounding box)
              corners = this.findFourCorners(allPoints)
            } else {
              corners = allPoints
            }
            
            // Sort corners: top-left, top-right, bottom-right, bottom-left
            corners = this.sortCorners(corners)
            
            // Clean up bestApprox after use
            bestApprox.delete()
          }
          
          // Cleanup
          src.delete()
          dst.delete()
          edges.delete()
          contours.delete()
          hierarchy.delete()
          
          resolve({
            success: corners !== null,
            corners: corners,
            imageSize: { width: img.width, height: img.height }
          })
          
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(imageBlob)
    })
  }

  // Perspektivkorrektur
  async perspectiveTransform(imageBlob, corners) {
    console.log('perspectiveTransform called with:', { corners, isReady: this.isReady.value })
    
    if (!this.isReady.value) {
      // If OpenCV not available, return original
      console.warn('OpenCV not available for perspective transform')
      return imageBlob
    }
    
    if (!corners || corners.length !== 4) {
      throw new Error(`Invalid corners: expected 4, got ${corners ? corners.length : 0}`)
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          console.log('Image loaded:', img.width, 'x', img.height)
          
          // Create canvas and load image
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          const src = this.cv.imread(canvas)
          console.log('OpenCV Mat created:', src.rows, 'x', src.cols)
          
          // Sortiere die Ecken in konsistente Reihenfolge
          const sortedCorners = this.sortCorners(corners)
          
          // Calculate output dimensions
          const width = Math.max(
            this.distance(sortedCorners[0], sortedCorners[1]),
            this.distance(sortedCorners[2], sortedCorners[3])
          )
          const height = Math.max(
            this.distance(sortedCorners[0], sortedCorners[3]),
            this.distance(sortedCorners[1], sortedCorners[2])
          )
          
          // Define destination points
          const dstPoints = [
            { x: 0, y: 0 },
            { x: width - 1, y: 0 },
            { x: width - 1, y: height - 1 },
            { x: 0, y: height - 1 }
          ]
          
          console.log('Calculated dimensions:', { width, height })
          console.log('Sorted corners:', sortedCorners)
          console.log('Destination corners:', dstPoints)
          
          // Create matrices for perspective transform
          const srcMat = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, 
            sortedCorners.flatMap(p => [p.x, p.y]))
          const dstMat = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, 
            dstPoints.flatMap(p => [p.x, p.y]))
          
          // Get perspective transform matrix
          console.log('Creating perspective transform matrix...')
          const M = this.cv.getPerspectiveTransform(srcMat, dstMat)
          
          if (!M || M.empty()) {
            throw new Error('Failed to create perspective transform matrix')
          }
          
          // Apply perspective transform
          console.log('Applying perspective transform...')
          const dst = new this.cv.Mat()
          const dsize = new this.cv.Size(Math.round(width), Math.round(height))
          this.cv.warpPerspective(src, dst, M, dsize)
          
          // Convert result to blob
          const outputCanvas = document.createElement('canvas')
          this.cv.imshow(outputCanvas, dst)
          
          outputCanvas.toBlob((blob) => {
            // Cleanup
            src.delete()
            dst.delete()
            srcMat.delete()
            dstMat.delete()
            M.delete()
            
            resolve(blob)
          }, 'image/jpeg', 0.95)
          
        } catch (error) {
          console.error('Perspective transform error details:', error)
          console.error('Error stack:', error.stack)
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(imageBlob)
    })
  }

  // Bildverbesserung für OCR
  async enhanceForOCR(imageBlob) {
    if (!this.isReady.value) {
      // If OpenCV not available, return original
      console.warn('OpenCV not available for image enhancement')
      return imageBlob
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          const src = this.cv.imread(canvas)
          let processed = new this.cv.Mat()
          
          // Convert to grayscale
          this.cv.cvtColor(src, processed, this.cv.COLOR_RGBA2GRAY)
          
          // Auto-rotation detection based on text orientation
          // This is a simplified approach - for better results, use deskew algorithms
          const edges = new this.cv.Mat()
          this.cv.Canny(processed, edges, 50, 150)
          
          // Detect lines using Hough transform
          const lines = new this.cv.Mat()
          this.cv.HoughLines(edges, lines, 1, Math.PI / 180, 100)
          
          // Calculate dominant angle
          let angleSum = 0
          let angleCount = 0
          
          for (let i = 0; i < lines.rows && i < 20; i++) {
            const theta = lines.data32F[i * 2 + 1]
            // Convert to degrees and normalize
            let angle = (theta * 180 / Math.PI) - 90
            if (Math.abs(angle) < 45) { // Only consider small rotations
              angleSum += angle
              angleCount++
            }
          }
          
          // Apply rotation if needed
          if (angleCount > 0) {
            const avgAngle = angleSum / angleCount
            if (Math.abs(avgAngle) > 1) { // Only rotate if angle is significant
              console.log(`Rotating image by ${avgAngle.toFixed(2)} degrees`)
              const center = new this.cv.Point(processed.cols / 2, processed.rows / 2)
              const M = this.cv.getRotationMatrix2D(center, avgAngle, 1)
              const rotated = new this.cv.Mat()
              this.cv.warpAffine(processed, rotated, M, 
                new this.cv.Size(processed.cols, processed.rows),
                this.cv.INTER_LINEAR, this.cv.BORDER_CONSTANT,
                new this.cv.Scalar(255, 255, 255, 255))
              processed.delete()
              processed = rotated
              M.delete()
            }
          }
          
          edges.delete()
          lines.delete()
          
          // Enhance contrast using CLAHE
          const clahe = new this.cv.CLAHE(3.0, new this.cv.Size(8, 8))
          clahe.apply(processed, processed)
          
          // Sharpen the image
          const sharpened = new this.cv.Mat()
          const kernel = this.cv.matFromArray(3, 3, this.cv.CV_32FC1, [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
          ])
          this.cv.filter2D(processed, sharpened, this.cv.CV_8U, kernel)
          kernel.delete()
          
          // Denoise if available
          if (typeof this.cv.fastNlMeansDenoising === 'function') {
            this.cv.fastNlMeansDenoising(sharpened, sharpened, 7, 7, 21)
          }
          
          // Apply Otsu's threshold for better binarization
          const binary = new this.cv.Mat()
          this.cv.threshold(sharpened, binary, 0, 255, 
            this.cv.THRESH_BINARY | this.cv.THRESH_OTSU)
          
          // Clean up small noise
          const kernel2 = this.cv.getStructuringElement(
            this.cv.MORPH_RECT, new this.cv.Size(2, 2))
          this.cv.morphologyEx(binary, binary, 
            this.cv.MORPH_OPEN, kernel2)
          kernel2.delete()
          
          // Convert back to color for output
          const output = new this.cv.Mat()
          this.cv.cvtColor(binary, output, this.cv.COLOR_GRAY2RGBA)
          
          // Convert to blob
          const outputCanvas = document.createElement('canvas')
          this.cv.imshow(outputCanvas, output)
          
          outputCanvas.toBlob((blob) => {
            // Cleanup
            src.delete()
            processed.delete()
            sharpened.delete()
            binary.delete()
            output.delete()
            
            resolve(blob)
          }, 'image/png', 1.0) // Use PNG for lossless quality
          
        } catch (error) {
          console.error('Enhancement error:', error)
          // Return original on error
          canvas.toBlob(resolve, 'image/jpeg', 0.95)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(imageBlob)
    })
  }

  // Detect and mask QR codes in image
  async detectAndMaskQRCodes(imageBlob) {
    if (!this.isReady.value) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          // Create canvas and load image
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          const src = this.cv.imread(canvas)
          const gray = new this.cv.Mat()
          
          // Convert to grayscale
          this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY)
          
          // Detect QR code patterns using contours
          const binary = new this.cv.Mat()
          this.cv.adaptiveThreshold(gray, binary, 255, 
            this.cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
            this.cv.THRESH_BINARY, 51, 10)
          
          // Find contours
          const contours = new this.cv.MatVector()
          const hierarchy = new this.cv.Mat()
          this.cv.findContours(binary, contours, hierarchy, 
            this.cv.RETR_TREE, this.cv.CHAIN_APPROX_SIMPLE)
          
          // Look for square-like contours (potential QR codes)
          const qrRegions = []
          
          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i)
            const area = this.cv.contourArea(contour)
            const peri = this.cv.arcLength(contour, true)
            const approx = new this.cv.Mat()
            this.cv.approxPolyDP(contour, approx, 0.04 * peri, true)
            
            // Check if it's a square (4 vertices) with reasonable size
            if (approx.rows === 4 && area > 1000 && area < (img.width * img.height * 0.5)) {
              const rect = this.cv.boundingRect(contour)
              const aspectRatio = rect.width / rect.height
              
              // QR codes are typically square (aspect ratio close to 1)
              if (aspectRatio > 0.8 && aspectRatio < 1.2) {
                // Check for QR code patterns (dense black/white changes)
                const roi = gray.roi(rect)
                const mean = this.cv.mean(roi)
                const stddev = new this.cv.Mat()
                const meanMat = new this.cv.Mat()
                this.cv.meanStdDev(roi, meanMat, stddev)
                
                // QR codes have high contrast
                if (stddev.data64F[0] > 50) {
                  qrRegions.push({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                  })
                }
                
                roi.delete()
                stddev.delete()
                meanMat.delete()
              }
            }
            
            approx.delete()
          }
          
          // Mask detected QR code regions
          for (const region of qrRegions) {
            // Add padding around QR code
            const padding = 20
            const x = Math.max(0, region.x - padding)
            const y = Math.max(0, region.y - padding)
            const width = Math.min(src.cols - x, region.width + 2 * padding)
            const height = Math.min(src.rows - y, region.height + 2 * padding)
            
            // Fill region with white (better for OCR than black)
            this.cv.rectangle(src, 
              new this.cv.Point(x, y),
              new this.cv.Point(x + width, y + height),
              new this.cv.Scalar(255, 255, 255, 255),
              -1 // Filled rectangle
            )
          }
          
          // Convert back to blob
          const outputCanvas = document.createElement('canvas')
          this.cv.imshow(outputCanvas, src)
          
          outputCanvas.toBlob((blob) => {
            // Cleanup
            src.delete()
            gray.delete()
            binary.delete()
            contours.delete()
            hierarchy.delete()
            
            console.log(`Masked ${qrRegions.length} potential QR code regions`)
            
            resolve({
              blob: blob,
              qrRegions: qrRegions
            })
          }, 'image/jpeg', 0.95)
          
        } catch (error) {
          console.error('QR detection error:', error)
          // Return original image on error
          canvas.toBlob((blob) => {
            resolve({
              blob: blob,
              qrRegions: []
            })
          }, 'image/jpeg', 0.95)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(imageBlob)
    })
  }

  // Helper functions
  // Find 4 corner points from a polygon with more vertices
  findFourCorners(points) {
    // Find the convex hull to ensure we get the outermost points
    const pointsMat = new this.cv.Mat(points.length, 1, this.cv.CV_32SC2)
    for (let i = 0; i < points.length; i++) {
      pointsMat.data32S[i * 2] = points[i].x
      pointsMat.data32S[i * 2 + 1] = points[i].y
    }
    
    const hull = new this.cv.Mat()
    this.cv.convexHull(pointsMat, hull)
    
    // Extract hull points
    const hullPoints = []
    for (let i = 0; i < hull.rows; i++) {
      hullPoints.push({
        x: points[hull.data32S[i]].x,
        y: points[hull.data32S[i]].y
      })
    }
    
    // Clean up
    pointsMat.delete()
    hull.delete()
    
    // If we still have more than 4 points, find the 4 corners
    if (hullPoints.length > 4) {
      // Find bounding box corners
      const minX = Math.min(...hullPoints.map(p => p.x))
      const maxX = Math.max(...hullPoints.map(p => p.x))
      const minY = Math.min(...hullPoints.map(p => p.y))
      const maxY = Math.max(...hullPoints.map(p => p.y))
      
      // Find points closest to each corner
      const corners = []
      const targets = [
        { x: minX, y: minY }, // top-left
        { x: maxX, y: minY }, // top-right
        { x: maxX, y: maxY }, // bottom-right
        { x: minX, y: maxY }  // bottom-left
      ]
      
      for (const target of targets) {
        if (hullPoints.length === 0) break
        
        let closest = hullPoints[0]
        let minDist = Infinity
        
        for (const point of hullPoints) {
          const dist = Math.sqrt(
            Math.pow(point.x - target.x, 2) + 
            Math.pow(point.y - target.y, 2)
          )
          if (dist < minDist) {
            minDist = dist
            closest = point
          }
        }
        corners.push(closest)
      }
      
      return corners
    }
    
    return hullPoints
  }

  sortCorners(corners) {
    // Sort corners to get them in order: TL, TR, BR, BL
    const sorted = [...corners]
    
    // Find center point
    const center = {
      x: corners.reduce((sum, p) => sum + p.x, 0) / 4,
      y: corners.reduce((sum, p) => sum + p.y, 0) / 4
    }
    
    // Sort by angle from center
    sorted.sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x)
      const angleB = Math.atan2(b.y - center.y, b.x - center.x)
      return angleA - angleB
    })
    
    // Find top-left (minimum sum of coordinates)
    let minSum = Infinity
    let tlIndex = 0
    
    for (let i = 0; i < 4; i++) {
      const sum = sorted[i].x + sorted[i].y
      if (sum < minSum) {
        minSum = sum
        tlIndex = i
      }
    }
    
    // Reorder starting from top-left
    const ordered = []
    for (let i = 0; i < 4; i++) {
      ordered.push(sorted[(tlIndex + i) % 4])
    }
    
    return ordered
  }

  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }
}

export default new ImageProcessingService()