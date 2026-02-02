// const LoadingScreen = () => {
//   return (
//     <div className="flex items-center justify-center min-h-screen bg-muted/30">
//       <div className="text-center">
//         <div className="animate-spin border-4 border-t-primary border-gray-200 rounded-full w-12 h-12 mx-auto mb-4"></div>
//         <p className="text-lg text-foreground">Loading exam, please wait...</p>
//       </div>
//     </div>
//   );
// };

// export default LoadingScreen;

"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const intervalTime = 100; // update every 100ms
    const totalDuration = 60000; // 1 minute in ms
    const steps = totalDuration / intervalTime; // 600 steps
    const increment = 100 / steps; // ~0.1667% per step

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return +(prev + increment).toFixed(2); // keep 2 decimal places
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Loading exam, please wait...
      </h2>

      <div className="w-80">
        <Progress value={progress} className="h-4 rounded-full" />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {progress.toFixed(0)}%
      </p>
    </div>
  );
};

export default LoadingScreen;
