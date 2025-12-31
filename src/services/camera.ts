export interface CameraStream {
  stream: MediaStream;
  video: HTMLVideoElement;
  settings: MediaTrackSettings;
}

export interface CameraCapabilities {
  hasBackCamera: boolean;
  hasFrontCamera: boolean;
  canSwitch: boolean;
  supportedConstraints: MediaTrackSupportedConstraints;
}

class CameraService {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isBackCamera = true;
  private capabilities: CameraCapabilities | null = null;

  async checkCapabilities(): Promise<CameraCapabilities> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API not supported');
    }

    const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    
    // Check for available cameras
    let hasBackCamera = false;
    let hasFrontCamera = false;
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Try to determine camera facing mode from labels
      for (const device of videoDevices) {
        const label = device.label.toLowerCase();
        if (label.includes('back') || label.includes('rear')) {
          hasBackCamera = true;
        } else if (label.includes('front') || label.includes('user')) {
          hasFrontCamera = true;
        }
      }
      
      // If no labels, assume we have at least one camera
      if (videoDevices.length > 0 && !hasBackCamera && !hasFrontCamera) {
        hasBackCamera = true; // Assume first camera is back camera
      }
      
      // If multiple cameras, we can switch
      const canSwitch = videoDevices.length > 1;
      
      this.capabilities = {
        hasBackCamera,
        hasFrontCamera,
        canSwitch,
        supportedConstraints
      };
      
      return this.capabilities;
    } catch (error) {
      console.warn('Failed to enumerate camera devices:', error);
      
      // Fallback: assume basic camera support
      this.capabilities = {
        hasBackCamera: true,
        hasFrontCamera: false,
        canSwitch: false,
        supportedConstraints
      };
      
      return this.capabilities;
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      // Try to get user media to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Immediately stop the stream as we just wanted permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  async startCamera(useBackCamera = true): Promise<CameraStream> {
    if (this.currentStream) {
      this.stopCamera();
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: useBackCamera ? 'environment' : 'user',
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.isBackCamera = useBackCamera;

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      
      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.play().catch(reject);
      });

      this.videoElement = video;

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      return {
        stream,
        video,
        settings
      };
    } catch (error) {
      console.error('Failed to start camera:', error);
      
      // Fallback: try with basic constraints
      try {
        const basicConstraints: MediaStreamConstraints = {
          video: true,
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        this.currentStream = stream;
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
          video.play().catch(reject);
        });

        this.videoElement = video;

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();

        return {
          stream,
          video,
          settings
        };
      } catch (fallbackError) {
        throw new Error('Failed to access camera with any constraints');
      }
    }
  }

  stopCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  async switchCamera(): Promise<CameraStream> {
    if (!this.capabilities?.canSwitch) {
      throw new Error('Cannot switch camera');
    }

    return await this.startCamera(!this.isBackCamera);
  }

  async takeSnapshot(): Promise<string> {
    if (!this.videoElement || !this.currentStream) {
      throw new Error('Camera not active');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to create canvas context');
    }

    // Set canvas dimensions to match video
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Draw current video frame
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  isUsingBackCamera(): boolean {
    return this.isBackCamera;
  }

  getCapabilities(): CameraCapabilities | null {
    return this.capabilities;
  }

  async getCameraSettings(): Promise<MediaTrackSettings | null> {
    if (!this.currentStream) {
      return null;
    }

    const videoTrack = this.currentStream.getVideoTracks()[0];
    return videoTrack.getSettings();
  }

  // Utility method to create a camera preview element
  createPreviewElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = this.isBackCamera ? 'scaleX(-1)' : 'scaleX(1)';
    
    return video;
  }

  // Method to apply camera-specific styles for mobile
  applyMobileStyles(video: HTMLVideoElement): void {
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    
    // Mirror front camera for better user experience
    if (!this.isBackCamera) {
      video.style.transform = 'scaleX(-1)';
    }
  }
}

export const cameraService = new CameraService();