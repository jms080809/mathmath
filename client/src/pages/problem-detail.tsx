import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, ThumbsUp } from "lucide-react";
import { ProblemCard } from "@/components/ProblemCard";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProblemWithAuthor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";

export default function ProblemDetailPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/problem/:id");
  const problemId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);

  const { data: problemData, isLoading } = useQuery<ProblemWithAuthor>({
    queryKey: [`/api/problems/${problemId}`],
    enabled: !!problemId,
  });

  const handleSave = async () => {
    if (!isAuthenticated || !problemData) {
      toast({
        title: "Login required",
        description: "Please login to save problems",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (problemData.isSaved) {
        await apiRequest("DELETE", `/api/problems/${problemData.problem.id}/save`);
        toast({
          title: "Problem unsaved",
          description: "Problem removed from your saved collection",
        });
      } else {
        await apiRequest("POST", `/api/problems/${problemData.problem.id}/save`);
        toast({
          title: "Problem saved",
          description: "Problem added to your saved collection",
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/problems/${problemId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/saved"] });
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Could not perform action",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSolved = () => {
    // Refresh problem data
    queryClient.invalidateQueries({ queryKey: [`/api/problems/${problemId}`] });
    // Refresh user data
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  if (isLoading) {
    return (
      <Layout title="Problem" leftAction={<BackButton />}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!problemData) {
    return (
      <Layout title="Problem Not Found" leftAction={<BackButton />}>
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Problem Not Found</h2>
          <p className="text-gray-500 mb-6">
            The problem you're looking for couldn't be found.
          </p>
          <Button onClick={() => navigate("/")}>
            Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Problem" 
      leftAction={<BackButton />}
      rightAction={
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving}>
            {problemData.isSaved ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5 text-gray-500" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      }
    >
      <div className="p-4">
        <ProblemCard 
          problemData={problemData} 
          onSolved={onSolved}
        />
      </div>
    </Layout>
  );
}

function BackButton() {
  const [, navigate] = useLocation();
  
  return (
    <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
      <ArrowLeft className="h-5 w-5 text-gray-500" />
    </Button>
  );
}