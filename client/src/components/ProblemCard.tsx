import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProblemWithAuthor, CheckAnswerResponse } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { AvatarPlaceholder } from "./ui/avatar-placeholder";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProblemCardProps {
  problemData: ProblemWithAuthor;
  onSolved?: () => void;
}

export function ProblemCard({ problemData, onSolved }: ProblemCardProps) {
  const { problem, author, isSolved, isSaved } = problemData;
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // 자신이 올린 문제인지 확인
  const isAuthoredByUser = user && author.id === user.id;
  
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [shortAnswer, setShortAnswer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(isSaved === true);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [cooldownInterval, setCooldownInterval] = useState<number | null>(null);
  
  // 제한 시간 - 5분(밀리초 단위)
  const COOLDOWN_TIME = 5 * 60 * 1000; 
  
  // 로컬스토리지 키
  const getLocalStorageKey = (problemId: number) => `problem_cooldown_${problemId}`;
  
  // 컴포넌트 마운트 시 쿨다운 상태 확인
  useEffect(() => {
    const checkCooldown = () => {
      // 로컬스토리지에서 쿨다운 정보 가져오기
      const cooldownData = localStorage.getItem(getLocalStorageKey(problem.id));
      if (cooldownData) {
        const { timestamp } = JSON.parse(cooldownData);
        const now = Date.now();
        const timePassed = now - timestamp;
        
        // 쿨다운 시간이 남아있으면 상태 업데이트
        if (timePassed < COOLDOWN_TIME) {
          const remaining = Math.ceil((COOLDOWN_TIME - timePassed) / 1000);
          setCooldownTimeLeft(remaining);
          
          // 타이머 설정
          if (cooldownInterval === null) {
            const interval = window.setInterval(() => {
              setCooldownTimeLeft(prev => {
                if (prev <= 1) {
                  clearInterval(interval);
                  setCooldownInterval(null);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
            setCooldownInterval(interval as unknown as number);
          }
        } else {
          // 쿨다운 시간이 지났으면 로컬스토리지에서 제거
          localStorage.removeItem(getLocalStorageKey(problem.id));
          setCooldownTimeLeft(0);
        }
      }
    };
    
    checkCooldown();
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (cooldownInterval !== null) {
        clearInterval(cooldownInterval);
      }
    };
  }, [problem.id, cooldownInterval]);
  
  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
  };
  
  const handleShortAnswerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow integers
    const value = e.target.value;
    if (value === "" || /^-?\d+$/.test(value)) {
      setShortAnswer(value);
    }
  };
  
  const handleSubmitAnswer = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to submit answers",
        variant: "destructive",
      });
      return;
    }
    
    if (isSolved) {
      toast({
        title: "Already solved",
        description: "You've already solved this problem",
      });
      return;
    }
    
    if (isAuthoredByUser) {
      toast({
        title: "Cannot solve own problem",
        description: "You cannot solve problems that you created",
        variant: "destructive",
      });
      return;
    }
    
    if (cooldownTimeLeft > 0) {
      toast({
        title: "Please wait",
        description: `Try again after ${Math.floor(cooldownTimeLeft / 60)}:${(cooldownTimeLeft % 60).toString().padStart(2, '0')}`,
        variant: "destructive",
      });
      return;
    }
    
    const answer = problem.type === "multiple-choice" ? selectedOption : shortAnswer;
    
    if (!answer) {
      toast({
        title: "No answer selected",
        description: "Please select or enter an answer",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", `/api/problems/${problem.id}/check-answer`, { 
        answer 
      });
      
      const result: CheckAnswerResponse = await response.json();
      
      if (result.correct) {
        toast({
          title: "Correct!",
          description: `You earned ${result.pointsEarned} points`,
          variant: "default",
        });
        
        // Update queries that might be affected
        queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        if (onSolved) {
          onSolved();
        }
      } else {
        // 오답 처리: 로컬스토리지에 시간 기록
        localStorage.setItem(
          getLocalStorageKey(problem.id),
          JSON.stringify({ timestamp: Date.now() })
        );
        
        // 쿨다운 시간 설정
        setCooldownTimeLeft(COOLDOWN_TIME / 1000);
        
        // 타이머 시작
        if (cooldownInterval !== null) {
          clearInterval(cooldownInterval);
        }
        
        const interval = window.setInterval(() => {
          setCooldownTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setCooldownInterval(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setCooldownInterval(interval as unknown as number);
        
        toast({
          title: "Incorrect",
          description: "You need to wait 5 minutes before trying again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveProblem = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to save problems",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (savedStatus) {
        // Unsave problem
        await apiRequest("DELETE", `/api/problems/${problem.id}/save`, {});
        setSavedStatus(false);
        toast({
          title: "Removed",
          description: "Problem removed from saved",
        });
      } else {
        // Save problem
        await apiRequest("POST", `/api/problems/${problem.id}/save`, {});
        setSavedStatus(true);
        toast({
          title: "Saved",
          description: "Problem saved successfully",
        });
      }
      
      // Update queries
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/saved"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save problem",
        variant: "destructive",
      });
    }
  };
  
  // Format relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  
  const difficultyColor = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800"
  };
  
  return (
    <Card className="border-b border-gray-200 pb-4 mb-4 shadow-none rounded-none">
      {/* Problem Card Header */}
      <div className="px-4 py-2 flex items-center">
        <AvatarPlaceholder user={author as any} size="sm" />
        <div className="ml-2">
          <p className="text-sm font-semibold">{author.username}</p>
          <p className="text-xs text-gray-500">{formatTimeAgo(problem.createdAt)}</p>
        </div>
      </div>

      {/* Problem Content */}
      <div className="px-4 mt-1">
        <div className="rounded-lg bg-gray-100 p-4 mb-3">
          {problem.image && (
            <div className="aspect-w-16 aspect-h-9 bg-white rounded mb-2 flex items-center justify-center">
              <img 
                src={problem.image} 
                alt="Problem illustration" 
                className="max-h-[200px] object-contain"
              />
            </div>
          )}
          <p className="text-lg font-medium mt-2">{problem.text}</p>
        </div>

        {/* Multiple Choice */}
        {problem.type === "multiple-choice" && problem.options && Array.isArray(problem.options) && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Select the value of x:</p>
            <RadioGroup value={selectedOption} onValueChange={handleOptionSelect} disabled={isSolved}>
              {problem.options.map((option, index) => (
                <div className="flex items-center space-x-2" key={index}>
                  <RadioGroupItem value={option} id={`option-${index}`} disabled={isSolved} />
                  <Label htmlFor={`option-${index}`} className="text-sm">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
        
        {/* Show error message if options is not an array */}
        {problem.type === "multiple-choice" && problem.options && !Array.isArray(problem.options) && (
          <div className="mb-4 p-4 border rounded bg-red-50">
            <p className="text-sm text-red-600">Error loading options for this problem.</p>
          </div>
        )}

        {/* Short Answer */}
        {problem.type === "short-answer" && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Enter your answer (integer only):</p>
            <Input
              type="text"
              placeholder="Enter your answer"
              value={shortAnswer}
              onChange={handleShortAnswerInput}
              disabled={isSolved}
              className="focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">Only positive or negative integers are accepted</p>
          </div>
        )}

        {/* Solved Indicator */}
        {isSolved && (
          <div className="mb-3">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" /> Solved
            </div>
          </div>
        )}
        
        {/* Cooldown Timer Indicator */}
        {cooldownTimeLeft > 0 && !isSolved && (
          <div className="mb-3">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <Clock className="h-3 w-3 mr-1" /> 
              Wait {Math.floor(cooldownTimeLeft / 60)}:{(cooldownTimeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}
        
        {/* User's Own Problem Indicator */}
        {isAuthoredByUser && (
          <div className="mb-3">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <Star className="h-3 w-3 mr-1" /> 
              Your problem (cannot solve)
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || isSolved || !isAuthenticated || cooldownTimeLeft > 0 || isAuthoredByUser}
          >
            {isSubmitting 
              ? "Submitting..." 
              : isSolved 
                ? "Solved" 
                : isAuthoredByUser
                  ? "Your problem"
                  : cooldownTimeLeft > 0 
                    ? `Wait ${Math.floor(cooldownTimeLeft / 60)}:${(cooldownTimeLeft % 60).toString().padStart(2, '0')}` 
                    : "Submit Answer"
            }
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveProblem}
            disabled={!isAuthenticated}
          >
            {savedStatus ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>

        {/* Engagement Stats */}
        <div className="flex mt-3 text-sm text-gray-500">
          <span className="mr-4">
            <CheckCircle className="h-4 w-4 inline mr-1" /> {problem.solveCount} solved
          </span>
          <span>
            <Star className="h-4 w-4 inline mr-1" /> 
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${difficultyColor[problem.difficulty]}`}>
              {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
