
// import { useState, useRef, useEffect } from "react";
// import { PlayCircle, PauseCircle } from "lucide-react";
// import { Button } from "@/components/ui/button";

// interface VideoPlayerProps {
//   videoUrl: string;
//   onTimeUpdate: (currentTime: number, duration: number) => void;
//   onVideoEnded: () => void;
//   lastPosition?: number;
//   onPlay?: () => void;
//   onPause?: () => void;
// }

// export function VideoPlayer({
//   videoUrl,
//   onTimeUpdate,
//   onVideoEnded,
//   lastPosition = 0,
//   onPlay,
//   onPause
// }: VideoPlayerProps) {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);

//   useEffect(() => {
//     // Set initial position if available
//     if (videoRef.current && lastPosition) {
//       videoRef.current.currentTime = lastPosition;
//     }
//   }, [lastPosition]);

//   const handleTimeUpdate = () => {
//     if (videoRef.current) {
//       const currentTime = videoRef.current.currentTime;
//       const duration = videoRef.current.duration;
//       if (duration) {
//         onTimeUpdate(currentTime, duration);
//       }
//     }
//   };

//   const handlePlayPause = () => {
//     if (videoRef.current) {
//       if (isPlaying) {
//         videoRef.current.pause();
//         setIsPlaying(false);
//         onPause?.();
//       } else {
//         videoRef.current.play();
//         setIsPlaying(true);
//         onPlay?.();
//       }
//     }
//   };

//   return (
//     <div className="relative rounded-lg overflow-hidden bg-black">
//       {videoUrl ? (
//         <video
//           ref={videoRef}
//           src={videoUrl}
//           className="w-full max-h-[450px]"
//           controls
//           onTimeUpdate={handleTimeUpdate}
//           onPlay={() => {
//             setIsPlaying(true);
//             onPlay?.();
//           }}
//           onPause={() => {
//             setIsPlaying(false);
//             onPause?.();
//           }}
//           onEnded={onVideoEnded}
//           autoPlay={false}
//         />
//       ) : (
//         <div className="w-full h-80 flex items-center justify-center bg-muted">
//           <p>Video not available</p>
//         </div>
//       )}
//       <Button
//         variant="outline"
//         size="icon"
//         className="absolute bottom-4 right-4 rounded-full bg-background/80 hover:bg-background"
//         onClick={handlePlayPause}
//       >
//         {isPlaying ? (
//           <PauseCircle className="h-6 w-6" />
//         ) : (
//           <PlayCircle className="h-6 w-6" />
//         )}
//       </Button>
//     </div>
//   );
// }



import { useState, useRef, useEffect } from "react";
import { PlayCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onVideoEnded: () => void;
  lastPosition?: number;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  videoUrl,
  onTimeUpdate,
  onVideoEnded,
  lastPosition = 0,
  onPlay,
  onPause
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastReportedTime, setLastReportedTime] = useState(0); // नया state
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && lastPosition) {
      videoRef.current.currentTime = lastPosition;
    }
  }, [lastPosition]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;

      // ✅ केवल तब अपडेट करें जब यूजर नॉर्मली देख रहा हो (स्किप नहीं)
      if (duration && Math.abs(currentTime - lastReportedTime) < 2) {
        onTimeUpdate(currentTime, duration);
        setLastReportedTime(currentTime);
      }
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-[450px]"
          controls
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setIsPlaying(false);
            onPause?.();
          }}
          onEnded={onVideoEnded}
          autoPlay={false}
        />
      ) : (
        <div className="w-full h-80 flex items-center justify-center bg-muted">
          <p>Video not available</p>
        </div>
      )}
      <Button
        variant="outline"
        size="icon"
        className="absolute bottom-4 right-4 rounded-full bg-background/80 hover:bg-background"
        onClick={handlePlayPause}
      >
        {isPlaying ? (
          <PauseCircle className="h-6 w-6" />
        ) : (
          <PlayCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
