import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProblemCard } from "./ProblemCard";
import { Layout } from "./Layout";
import { ProblemWithAuthor } from "@/lib/types";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

export function FeedView() {
  const { isAuthenticated } = useAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  
  const { data: problems, isLoading, isError } = useQuery<ProblemWithAuthor[]>({ 
    queryKey: ["/api/problems", feedRefreshKey],
    staleTime: 1000 * 60, // 1 minute
  });
  
  const handleProblemSolved = () => {
    // Trigger a refresh of the feed
    setFeedRefreshKey(prev => prev + 1);
  };
  
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
      <div className="pb-4">
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
            <h3 className="text-lg font-semibold mb-2">No problems found</h3>
            <p className="text-gray-500">Be the first to upload a math problem!</p>
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
