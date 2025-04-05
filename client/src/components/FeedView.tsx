import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProblemCard } from "./ProblemCard";
import { Layout } from "./Layout";
import { ProblemWithAuthor } from "@/lib/types";
import { Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FeedView() {
  const { isAuthenticated } = useAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [feedType, setFeedType] = useState<"all" | "recommended">("all");
  
  // Query for all problems
  const { 
    data: allProblems, 
    isLoading: allLoading, 
    isError: allError 
  } = useQuery<ProblemWithAuthor[]>({ 
    queryKey: ["/api/problems", feedRefreshKey],
    staleTime: 1000 * 60, // 1 minute
    enabled: feedType === "all" || !isAuthenticated,
  });
  
  // Query for recommended problems (only for authenticated users)
  const { 
    data: recommendedProblems, 
    isLoading: recommendedLoading, 
    isError: recommendedError,
    refetch: refetchRecommended
  } = useQuery<ProblemWithAuthor[]>({ 
    queryKey: ["/api/problems/recommend", feedRefreshKey],
    staleTime: 1000 * 30, // 30 seconds
    enabled: feedType === "recommended" && isAuthenticated,
  });
  
  const handleProblemSolved = () => {
    // Trigger a refresh of the feed
    setFeedRefreshKey(prev => prev + 1);
  };
  
  const handleGetNewRecommendation = () => {
    refetchRecommended();
  };
  
  // Determine which data, loading and error states to use based on feedType
  const problems = feedType === "recommended" && isAuthenticated ? recommendedProblems : allProblems;
  const isLoading = feedType === "recommended" && isAuthenticated ? recommendedLoading : allLoading;
  const isError = feedType === "recommended" && isAuthenticated ? recommendedError : allError;
  
  if (isLoading) {
    return (
      <Layout title="MathSolve" rightAction={<OptionsMenu isAuthenticated={isAuthenticated} />}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (isError) {
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
          onValueChange={(value) => setFeedType(value as "all" | "recommended")}
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
          problems.map((problemData) => (
            <ProblemCard 
              key={problemData.problem.id} 
              problemData={problemData} 
              onSolved={handleProblemSolved}
            />
          ))
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
