
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoProgressProps {
  watchedPercentage: number;
  progressUpdateCount: number;
  quizUnlocked: boolean;
  hasQuiz: boolean;
}

export function VideoProgress({
  watchedPercentage,
  progressUpdateCount,
  quizUnlocked,
  hasQuiz
}: VideoProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>{watchedPercentage}%</span>
      </div>
      <Progress 
        value={watchedPercentage} 
        key={`progress-${progressUpdateCount}`} 
        className="transition-all duration-200"
      />
      {hasQuiz && !quizUnlocked && (
        <p className="text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 inline-block mr-1" />
          You need to watch at least 50% of the video to unlock the quiz
        </p>
      )}
    </div>
  );
}


