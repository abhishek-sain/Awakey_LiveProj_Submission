import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useTrainingVideoState = (
  videoId: string,
  shouldShowQuiz: boolean
) => {
  const [role, setRole] = useState("salesperson");
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(shouldShowQuiz);
  const [quizData, setQuizData] = useState<any[]>([]);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  const [progressUpdateCount, setProgressUpdateCount] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [watchedPercentage, setWatchedPercentage] = useState(0);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!videoId) return;

    try {
      setIsLoading(true);
      console.log("Fetching data for video:", videoId);

      // Get user session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          description: "Please log in to access training videos",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();

      if (profileData) {
        setRole(profileData.role);
      }

      // Fetch video data
      const { data: video, error: videoError } = await supabase
        .from("training_videos")
        .select("*")
        .eq("id", videoId)
        .single();

      if (videoError) throw videoError;
      console.log("Video data:", video);

      // Fetch user progress
      const { data: progress, error: progressError } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .eq("video_id", videoId)
        .single();

      if (!progressError && progress) {
        console.log("Existing progress found:", progress);
        setUserProgress(progress);
        setWatchedPercentage(progress.watched_percentage || 0);

        // Check if quiz should be unlocked (50% threshold)
        if (progress.watched_percentage >= 80) {
          console.log("Quiz unlocked based on existing progress");
          setQuizUnlocked(true);
        }
      } else {
        console.log("No existing progress, creating new entry");
        // Create progress entry if it doesn't exist
        const { data: newProgress, error: createError } = await supabase
          .from("training_progress")
          .insert({
            user_id: sessionData.session.user.id,
            video_id: videoId,
            watched_percentage: 0,
            completed: false,
            quiz_completed: false,
            quiz_score: 0,
            last_position: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        console.log("New progress created:", newProgress);
        setUserProgress(newProgress);
        setWatchedPercentage(0);
      }

      // Fetch quiz questions
      const { data: quiz, error: quizError } = await supabase
        .from("training_quiz_questions")
        .select(
          `
          id,
          question,
          training_quiz_options (
            id,
            option_text,
            is_correct
          )
        `
        )
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });

      if (quizError) throw quizError;

      console.log("Quiz data:", quiz);
      setVideoData(video);
      setQuizData(quiz || []);

      // Show quiz if the URL has the quiz parameter
      if (shouldShowQuiz) {
        // Check if quiz is unlocked
        if (
          (progress && progress.watched_percentage >= 50) ||
          progress?.quiz_completed
        ) {
          console.log(
            "Setting showQuiz to true based on URL param and progress"
          );
          setShowQuiz(true);
          setQuizUnlocked(true);
        } else {
          // Redirect back if trying to access quiz directly when not unlocked
          toast({
            title: "Quiz Locked",
            description:
              "You need to watch at least 80% of the video to unlock the quiz.",
            variant: "destructive",
          });
          navigate(`/training/video/${videoId}`);
        }
      } else if (
        (progress &&
          progress.watched_percentage >= 50 &&
          !progress.quiz_completed &&
          quiz &&
          quiz.length > 0) ||
        progress?.quiz_completed
      ) {
        console.log("Setting quizUnlocked to true based on progress");
        setQuizUnlocked(true);
        if (
          new URLSearchParams(window.location.search).get("autoShowQuiz") ===
          "true"
        ) {
          setShowQuiz(true);
        }
      }
    } catch (error) {
      console.error("Error fetching training video:", error);
      toast({
        description: "Failed to load the training video",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!userProgress || !videoData) return;

    try {
      console.log(`Saving final progress: ${watchedPercentage}%`);

      const { data, error } = await supabase
        .from("training_progress")
        .update({
          watched_percentage: watchedPercentage,
          last_position: userProgress.last_position,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", userProgress.id)
        .select()
        .single();

      if (error) {
        console.error("Error saving final progress:", error);
      } else if (data) {
        setUserProgress(data);
      }
    } catch (err) {
      console.error("Error in cleanup function:", err);
    }
  };

  const handleTimeUpdate = async (currentTime: number, duration: number) => {
    if (!userProgress || !videoData || !duration) return;

    const percentage = Math.floor((currentTime / duration) * 100);

    setWatchedPercentage(percentage);

    // Force a UI update to ensure progress bar moves
    setProgressUpdateCount((prev) => prev + 1);

    // Update progress every 3 seconds or when percentage changes significantly
    const now = Date.now();
    if (
      Math.abs(percentage - (userProgress.watched_percentage || 0)) >= 5 ||
      now - lastProgressUpdate > 3000
    ) {
      console.log(
        `Updating progress: ${percentage}%, Time: ${currentTime}/${duration}`
      );
      setLastProgressUpdate(now);

      try {
        const { data, error } = await supabase
          .from("training_progress")
          .update({
            watched_percentage: percentage,
            last_position: currentTime,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", userProgress.id)
          .select()
          .single();

        if (!error && data) {
          setUserProgress(data);

          // Check if quiz should be unlocked (at 50% progress)
          if (percentage >= 80 && !quizUnlocked) {
            console.log("Unlocking quiz at 50% progress");
            setQuizUnlocked(true);

            // Show a toast notification
            toast({
              title: "Quiz Available",
              description: "You can now take the quiz for this training video!",
            });
          }

          // Mark video as watched if progress is 95% or more
          if (percentage >= 95 && !videoWatched) {
            setVideoWatched(true);
          }
        } else if (error) {
          console.error("Error updating progress:", error);
        }

        // Show quiz automatically when video is complete
        if (
          percentage >= 95 &&
          !userProgress.quiz_completed &&
          quizData.length > 0
        ) {
          // Show a toast notification
          toast({
            title: "Video Completed",
            description: "Let's take the quiz now to complete your training!",
          });

          // Set a short timeout to let the user register the completion first
          setTimeout(() => {
            setShowQuiz(true);
          }, 1000);
        }
      } catch (err) {
        console.error("Error updating progress:", err);
      }
    }
  };

  const handleVideoEnded = () => {
    // Mark as completed if there's no quiz
    if (quizData.length === 0) {
      markAsCompleted();
    } else if (!userProgress.quiz_completed) {
      setShowQuiz(true);
    }
  };

  const markAsCompleted = async () => {
    if (!userProgress) return;

    try {
      const { data, error } = await supabase
        .from("training_progress")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          watched_percentage: 100,
        })
        .eq("id", userProgress.id)
        .select()
        .single();

      if (error) throw error;

      setUserProgress(data);
      setWatchedPercentage(100);

      toast({
        description: "Congratulations! You've completed this training module.",
      });
    } catch (error) {
      console.error("Error marking as completed:", error);
    }
  };

  const handleTakeQuiz = () => {
    console.log(
      "Take Quiz clicked. quizUnlocked:",
      quizUnlocked,
      "watchedPercentage:",
      watchedPercentage
    );
    if (!quizUnlocked) {
      toast({
        title: "Quiz Locked",
        description:
          "You need to watch at least 80% of the video to unlock the quiz.",
        variant: "destructive",
      });
      return;
    }

    setShowQuiz(true);
  };

  const handleQuitTraining = () => {
    saveProgress();
    navigate("/training");
  };

  const handleQuizComplete = async (score: number, passed: boolean) => {
    if (!userProgress) return;

    try {
      const { data, error } = await supabase
        .from("training_progress")
        .update({
          quiz_completed: true,
          quiz_score: score,
          completed: passed,
          completed_at: passed ? new Date().toISOString() : null,
        })
        .eq("id", userProgress.id)
        .select()
        .single();

      if (error) throw error;

      // Also save to training_quiz_results for reporting
      if (videoId) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          await supabase.from("training_quiz_results").insert({
            user_id: sessionData.session.user.id,
            video_id: videoId,
            total_questions: quizData.length,
            score: score,
          });
        }
      }

      setUserProgress(data);
      setShowQuiz(false);

      toast({
        description: passed
          ? "Congratulations! You've successfully completed this training module."
          : "You didn't pass the quiz. You can review the content and try again.",
        variant: passed ? "default" : "destructive",
      });

      if (passed) {
        setTimeout(() => {
          navigate("/training");
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating quiz results:", error);
      toast({
        description: "Failed to save quiz results",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();

    // Cleanup function
    return () => {
      saveProgress();
    };
  }, [videoId, shouldShowQuiz]);

  return {
    role,
    isLoading,
    videoData,
    userProgress,
    showQuiz,
    setShowQuiz,
    quizData,
    quizUnlocked,
    watchedPercentage,
    progressUpdateCount,
    handleTimeUpdate,
    handleVideoEnded,
    handleTakeQuiz,
    handleQuitTraining,
    handleQuizComplete,
    saveProgress,
  };
};
