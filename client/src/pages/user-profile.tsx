import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Problem, User } from "@/lib/types";
import { AvatarPlaceholder } from "@/components/ui/avatar-placeholder";
import { useLocation, useParams } from "wouter";

export default function UserProfilePage() {
  const { userId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("problems");
  
  const { data: userData, isLoading: isLoadingUser, error } = useQuery<User>({ 
    queryKey: [`/api/users/${userId}`],
  });
  
  const { data: userProblems, isLoading: isLoadingProblems } = useQuery<Problem[]>({ 
    queryKey: [`/api/users/${userId}/problems`],
    enabled: !!userData,
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "User not found or an error occurred",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [error, toast, navigate]);
  
  if (isLoadingUser) {
    return (
      <Layout title="User Profile" leftAction={<BackButton />}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (!userData) {
    return (
      <Layout title="User Profile" leftAction={<BackButton />}>
        <div className="p-6 flex flex-col items-center justify-center h-96">
          <h2 className="text-xl font-semibold mb-4">User Not Found</h2>
          <p className="text-gray-500 mb-6 text-center">
            The user you're looking for doesn't exist
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout
      title={`${userData.username}'s Profile`}
      leftAction={<BackButton />}
    >
      {/* User Profile Header */}
      <div className="px-4 py-6 flex flex-col items-center border-b border-gray-200">
        <AvatarPlaceholder user={userData} size="lg" className="mb-3" />
        <h2 className="text-xl font-semibold">{userData.username}</h2>
        <div className="flex items-center mt-1 text-gray-600">
          <Star className="h-4 w-4 text-yellow-500 mr-2" />
          <span className="font-semibold">{userData.points}</span>
          <span className="ml-1">points</span>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 border-b border-gray-200">
        <div className="flex flex-col items-center py-4 border-r border-gray-200">
          <span className="text-xl font-semibold">{userData.problemsSolved}</span>
          <span className="text-xs text-gray-500">Solved</span>
        </div>
        <div className="flex flex-col items-center py-4 border-r border-gray-200">
          <span className="text-xl font-semibold">{userData.problemsCreated}</span>
          <span className="text-xs text-gray-500">Created</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-semibold">{userData.streak}</span>
          <span className="text-xs text-gray-500">Day Streak</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="problems" onValueChange={setActiveTab}>
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="problems" className="flex-1">Problems</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="problems" className="p-4">
          {isLoadingProblems ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userProblems && userProblems.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {userProblems.map((problem) => (
                <div
                  key={problem.id}
                  className="aspect-square bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                  onClick={() => navigate(`/problem/${problem.id}`)}
                >
                  <div className="p-2 text-center overflow-hidden">
                    <p className="text-xs font-medium truncate">{problem.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">This user hasn't created any problems yet</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stats" className="p-4">
          <div className="text-center py-10">
            <p className="text-gray-500">Detailed stats coming soon!</p>
          </div>
        </TabsContent>
      </Tabs>
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