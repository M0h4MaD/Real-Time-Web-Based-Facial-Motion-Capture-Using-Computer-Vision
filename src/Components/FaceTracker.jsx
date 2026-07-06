import { useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function FaceTracker({ videoRef, onResults, isActive }) {
  useEffect(() => {
    // if it is not active, do not initialize the tracker
    if (!isActive) return;

    let landmarker; // Store the landmarker instance
    let animationFrameId; // Store the animation frame ID for cleanup

    // Initialize the FaceLandmarker and start the camera stream
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm"); // Load the necessary files for the vision tasks from the specified path
        
        // Create the FaceLandmarker instance with the specified options
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/face_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        // Start camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        // Checks if the videoRef is available and sets the source object to the stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream; // srcObject is the stream from the camera

          // Once the video metadata is loaded, play the video and start predictions
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();
            predict(); // Start the prediction loop
          };
        }
      } catch (err) {
        console.error("FaceTracker Init Error:", err);
      }
    }

    // Function to predict face landmarks from the video stream
    function predict() {
      // If the tracker is not active, do not continue predicting
      if (!isActive) return;

      // Get the video element from the ref and check if it's ready
      const video = videoRef.current;

      // readyState === 4 means the video is fully loaded and can be played
      // readyState === 3 means the video is in the process of loading but can still be played
      // readyState === 2 means the video is loading but cannot be played yet
      // readyState === 1 means the video is loading and cannot be played yet
      // readyState === 0 means the video is not loaded at all
      if (video && video.readyState === 4) {

        // Detects face landmarks for the current video frame
        const results = landmarker.detectForVideo(video, performance.now());

        // If face landmarks are detected, call the onResults callback with the first set of landmarks
        if (results.faceLandmarks?.length > 0) {
          onResults(results.faceLandmarks[0]);
        }
      }
      // Schedule the next prediction after 60 milliseconds (~16.67 FPS)
      // Formula: 1000 ms / 60 ms ≈ 16.67 frames per second
      animationFrameId = setTimeout(predict, 60);
    }

    init(); // Start the initialization process

    // Cleanup function to stop the camera and clear the animation frame when the component unmounts or is deactivated
    return () => {
      clearTimeout(animationFrameId); // Clear the prediction loop

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isActive, videoRef, onResults]);


  // The difference between init() and predict() is that
  // init() is responsible for setting up the FaceLandmarker and starting the video stream,
  // while predict() is called repeatedly to process each frame of the video.
  // init() called once when the component mounts or when isActive changes to true, while predict() is called in a loop to continuously analyze the video frames.
  return null;
}
