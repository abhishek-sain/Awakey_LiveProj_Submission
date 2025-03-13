
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/dashboard/SideNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, PlayCircle, PauseCircle } from "lucide-react";
import { Quiz } from "@/components/training/Quiz";

export default function TrainingVideo() {
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState('salesperson');
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
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
          .from('profiles')
          .select('role')
          .eq('id', sessionData.session.user.id)
          .single();
          
        if (profileData) {
          setRole(profileData.role);
        }
        
        // Fetch video data
        const { data: video, error: videoError } = await supabase
          .from('training_videos')
          .select('*')
          .eq('id', id)
          .single();
          
        if (videoError) throw videoError;
        
        // Fetch user progress
        const { data: progress, error: progressError } = await supabase
          .from('training_progress')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .eq('video_id', id)
          .single();
          
        if (!progressError && !progress) {
          // Create progress entry if it doesn't exist
          const { data: newProgress, error: createError } = await supabase
            .from('training_progress')
            .insert({
              user_id: sessionData.session.user.id,
              video_id: id,
              watched_percentage: 0,
              completed: false,
              quiz_completed: false,
              quiz_score: 0,
              last_position: 0
            })
            .select()
            .single();
            
          if (createError) throw createError;
          setUserProgress(newProgress);
        } else {
          setUserProgress(progress);
        }
        
        // Fetch quiz questions
        const { data: quiz, error: quizError } = await supabase
          .from('training_quiz_questions')
          .select(`
            id,
            question,
            training_quiz_options (
              id,
              option_text,
              is_correct
            )
          `)
          .eq('video_id', id)
          .order('created_at', { ascending: true });
          
        if (quizError) throw quizError;
        
        setVideoData(video);
        setQuizData(quiz || []);
      } catch (error) {
        console.error('Error fetching training video:', error);
        toast({
          description: "Failed to load the training video",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [id]);
  
  const handleTimeUpdate = async () => {
    if (!videoRef.current || !userProgress || !videoData) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    const percentage = Math.floor((currentTime / duration) * 100);
    
    setCurrentTime(currentTime);
    setDuration(duration);
    
    // Update progress every 5 seconds or when percentage changes significantly
    if (
      Math.abs(percentage - userProgress.watched_percentage) >= 5 || 
      Date.now() - (userProgress.last_updated_at || 0) > 5000
    ) {
      const { data, error } = await supabase
        .from('training_progress')
        .update({
          watched_percentage: percentage,
          last_position: currentTime,
          last_updated_at: new Date()
        })
        .eq('id', userProgress.id)
        .select()
        .single();
        
      if (!error && data) {
        setUserProgress(data);
      }
      
      // Show quiz when video is complete
      if (percentage >= 95 && !userProgress.quiz_completed) {
        setShowQuiz(true);
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };
  
  const handleVideoEnded = () => {
    if (!userProgress.quiz_completed && quizData.length > 0) {
      setShowQuiz(true);
    }
  };
  
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleQuizComplete = async (score: number, passed: boolean) => {
    if (!userProgress) return;
    
    try {
      const { data, error } = await supabase
        .from('training_progress')
        .update({
          quiz_completed: true,
          quiz_score: score,
          completed: passed,
          completed_at: passed ? new Date() : null
        })
        .eq('id', userProgress.id)
        .select()
        .single();
        
      if (error) throw error;
      
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
          navigate('/training');
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating quiz results:', error);
      toast({
        description: "Failed to save quiz results",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <SideNav role={role as any} />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mr-2"
                onClick={() => navigate('/training')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {isLoading ? 'Loading...' : videoData?.title}
              </h1>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-[450px] bg-muted rounded-lg"></div>
                <div className="h-6 bg-muted rounded w-3/4 mt-4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </div>
            ) : showQuiz ? (
              <Quiz 
                questions={quizData} 
                onComplete={handleQuizComplete} 
                passingScore={60}
              />
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden bg-black">
                  {videoData?.video_url ? (
                    <video
                      ref={videoRef}
                      src={videoData.video_url}
                      className="w-full max-h-[450px]"
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={handleVideoEnded}
                      onLoadedMetadata={() => {
                        if (videoRef.current && userProgress?.last_position) {
                          videoRef.current.currentTime = userProgress.last_position;
                        }
                      }}
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
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{userProgress?.watched_percentage || 0}%</span>
                  </div>
                  <Progress value={userProgress?.watched_percentage || 0} />
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>{videoData?.title}</CardTitle>
                    <CardDescription>
                      {userProgress?.completed ? (
                        <span className="text-green-500">You've completed this training!</span>
                      ) : (
                        <span>Watch the entire video to take the quiz</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p>{videoData?.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
