import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { ProblemCard } from "./ProblemCard";
import { Layout } from "./Layout";
import { ProblemWithAuthor } from "@/lib/types";
import { Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";

export function FeedView() {
  const { isAuthenticated, user } = useAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [feedType, setFeedType] = useState<"all" | "recommended">("all");
  
  // InfiniteQuery for all problems with pagination
  const { 
    data: allProblemsData, 
    isLoading: allLoading, 
    isError: allError,
    fetchNextPage: fetchNextAllProblems,
    hasNextPage: hasMoreAllProblems,
    isFetchingNextPage: isFetchingNextAllProblems
  } = useInfiniteQuery({
    queryKey: ["/api/problems", feedRefreshKey],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/problems?page=${pageParam}&limit=5${user ? `&userId=${user.id}` : ''}`);
      if (!response.ok) {
        throw new Error("Failed to fetch problems");
      }
      return response.json();
    },
    getNextPageParam: (lastPage: any[], allPages) => {
      // 마지막 페이지가 비어있거나 데이터가 5개 미만이면 더 이상 데이터가
      // 없다고 판단하고 undefined 반환
      return lastPage.length < 5 ? undefined : allPages.length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60, // 1 minute
    enabled: feedType === "all" || !isAuthenticated,
  });
  
  // InfiniteQuery for recommended problems
  const { 
    data: recommendedProblemsData, 
    isLoading: recommendedLoading, 
    isError: recommendedError,
    fetchNextPage: fetchNextRecommended,
    hasNextPage: hasMoreRecommended,
    isFetchingNextPage: isFetchingNextRecommended,
    refetch: refetchRecommended
  } = useInfiniteQuery({
    queryKey: ["/api/problems/recommend", feedRefreshKey],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/problems/recommend?limit=5`);
      if (!response.ok) {
        throw new Error("Failed to fetch recommended problems");
      }
      return response.json();
    },
    getNextPageParam: (lastPage: any[], allPages) => {
      // 추천 문제는 기본적으로 무한 로드 가능 (랜덤으로 가져옴)
      return lastPage.length > 0 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 30, // 30 seconds
    enabled: feedType === "recommended" && isAuthenticated,
  });
  
  // Intersection Observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextAllProblems || isFetchingNextRecommended) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (feedType === "all" && hasMoreAllProblems) {
          fetchNextAllProblems();
        } else if (feedType === "recommended" && hasMoreRecommended && isAuthenticated) {
          fetchNextRecommended();
        }
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [
    feedType, 
    hasMoreAllProblems, 
    hasMoreRecommended, 
    fetchNextAllProblems, 
    fetchNextRecommended, 
    isFetchingNextAllProblems, 
    isFetchingNextRecommended,
    isAuthenticated
  ]);
  
  // Clean up the observer on component unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  const handleProblemSolved = () => {
    // Trigger a refresh of the feed
    setFeedRefreshKey(prev => prev + 1);
  };
  
  const handleGetNewRecommendation = () => {
    refetchRecommended();
  };
  
  // Flatten the pages data
  const allProblems = allProblemsData?.pages.flat() || [];
  const recommendedProblems = recommendedProblemsData?.pages.flat() || [];
  
  // Determine which data, loading and error states to use based on feedType
  const problems = feedType === "recommended" && isAuthenticated ? recommendedProblems : allProblems;
  const isLoading = feedType === "recommended" && isAuthenticated ? recommendedLoading : allLoading;
  const isError = feedType === "recommended" && isAuthenticated ? recommendedError : allError;
  const isFetchingNext = feedType === "recommended" && isAuthenticated ? isFetchingNextRecommended : isFetchingNextAllProblems;
  const hasMoreProblems = feedType === "recommended" && isAuthenticated ? hasMoreRecommended : hasMoreAllProblems;
  
  const handleFeedTypeChange = (value: string) => {
    setFeedType(value as "all" | "recommended");
    
    // 문제 목록이 없으면 첫 페이지 로드
    if ((value === "all" && !allProblemsData) || (value === "recommended" && !recommendedProblemsData)) {
      setFeedRefreshKey(prev => prev + 1);
    }
  };
  
  if (isLoading && !problems.length) {
    return (
      <Layout title="MathSolve" rightAction={<OptionsMenu isAuthenticated={isAuthenticated} />}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (isError && !problems.length) {
    return (
      <Layout title="MathSolve" rightAction={<OptionsMenu isAuthenticated={isAuthenticated} />}>
        <div className="flex flex-col items-center justify-center h-96 p-4">
          <h3 className="text-lg font-semibold mb-2">Error loading problems</h3>
          <p className="text-gray-500 mb-4">There was an error loading the feed.</p>
          <Button 
            variant="outline" 
            onClick={() => setFeedRefreshKey(prev => prev + 1)}
          >
            Retry
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="MathSolve" rightAction={<OptionsMenu isAuthenticated={isAuthenticated} />}>
      {isAuthenticated && (
        <Tabs 
          value={feedType} 
          onValueChange={handleFeedTypeChange}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Problems</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      
      <div className="pb-4">
        {feedType === "recommended" && isAuthenticated && (
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetNewRecommendation}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              New Problem
            </Button>
          </div>
        )}
        
        {problems && problems.length > 0 ? (
          <>
            {problems.map((problemData) => (
              <ProblemCard 
                key={problemData.problem.id} 
                problemData={problemData} 
                onSolved={handleProblemSolved}
              />
            ))}
            
            {/* 무한 스크롤을 위한 관찰 요소 */}
            <div 
              ref={loadMoreRef} 
              className="h-10 flex items-center justify-center mb-4"
            >
              {isFetchingNext ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : hasMoreProblems ? (
                <p className="text-sm text-gray-500">스크롤하여 더 보기</p>
              ) : (
                <p className="text-sm text-gray-500">마지막 문제입니다</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 p-4">
            <h3 className="text-lg font-semibold mb-2">
              {feedType === "recommended" 
                ? "No more problems to solve" 
                : "No problems found"}
            </h3>
            <p className="text-gray-500">
              {feedType === "recommended" 
                ? "You've solved all available problems!" 
                : "Be the first to upload a math problem!"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function OptionsMenu({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-500">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAuthenticated && (
          <DropdownMenuItem asChild>
            <a href="/admin">Admin Dashboard</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href="https://github.com/yourusername/mathsolve" target="_blank" rel="noopener noreferrer">
            About MathSolve
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
