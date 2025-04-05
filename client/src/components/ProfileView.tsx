import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "./Layout";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Settings, Star, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Problem } from "@/lib/types";
import { AvatarPlaceholder } from "./ui/avatar-placeholder";
import { useLocation } from "wouter";

export function ProfileView() {
  const [, navigate] = useLocation();
  const { user, updateUser, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-problems");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  
  const { data: userProblems, isLoading: isLoadingProblems } = useQuery<Problem[]>({ 
    queryKey: ["/api/users/me/problems"],
    enabled: !!user,
  });
  
  const { data: savedProblems, isLoading: isLoadingSaved } = useQuery({ 
    queryKey: ["/api/users/me/saved"],
    enabled: !!user && activeTab === "saved",
  });
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsUpdating(true);
    
    try {
      // Update username if changed
      if (username && username !== user.username) {
        await updateUser({ username });
      }
      
      // Upload profile picture if selected
      if (profilePicture) {
        const formData = new FormData();
        formData.append("profilePicture", profilePicture);
        
        const response = await fetch("/api/users/me/profile-picture", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Failed to upload profile picture");
        }
      }
      
      setProfileDialogOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfilePicture(e.target.files[0]);
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
  
  if (isLoading) {
    return (
      <Layout title="Profile" leftAction={<BackButton />}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return (
      <Layout title="Profile" leftAction={<BackButton />}>
        <div className="p-6 flex flex-col items-center justify-center h-96">
          <h2 className="text-xl font-semibold mb-4">Login Required</h2>
          <p className="text-gray-500 mb-6 text-center">
            Please login to view your profile
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Feed
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout
      title="Profile"
      leftAction={<BackButton />}
      rightAction={
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <Settings className="h-5 w-5 text-gray-500" />
        </Button>
      }
    >
      {/* User Profile Header */}
      <div className="px-4 py-6 flex flex-col items-center border-b border-gray-200">
        <AvatarPlaceholder user={user} size="lg" className="mb-3" />
        <h2 className="text-xl font-semibold">{user.username}</h2>
        <div className="flex items-center mt-1 text-gray-600">
          <Star className="h-4 w-4 text-yellow-500 mr-2" />
          <span className="font-semibold">{user.points}</span>
          <span className="ml-1">points</span>
        </div>
        
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-4">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Your Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProfileUpdate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  defaultValue={user.username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profile-picture">Profile Picture</Label>
                <Input 
                  id="profile-picture" 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 border-b border-gray-200">
        <div className="flex flex-col items-center py-4 border-r border-gray-200">
          <span className="text-xl font-semibold">{user.problemsSolved}</span>
          <span className="text-xs text-gray-500">Solved</span>
        </div>
        <div className="flex flex-col items-center py-4 border-r border-gray-200">
          <span className="text-xl font-semibold">{user.problemsCreated}</span>
          <span className="text-xs text-gray-500">Created</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-semibold">{user.streak}</span>
          <span className="text-xs text-gray-500">Day Streak</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-problems" onValueChange={setActiveTab}>
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="my-problems" className="flex-1">My Problems</TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
          <TabsTrigger value="badges" className="flex-1">Badges</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-problems" className="p-4">
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
              <p className="text-gray-500">You haven't created any problems yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate("/upload")}
              >
                Create your first problem
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="p-4">
          {isLoadingSaved ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : savedProblems && savedProblems.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {savedProblems.map((item: any) => (
                <div
                  key={item.saved.id}
                  className="aspect-square bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                  onClick={() => navigate(`/problem/${item.problem.id}`)}
                >
                  <div className="p-2 text-center overflow-hidden">
                    <p className="text-xs font-medium truncate">{item.problem.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">You haven't saved any problems yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate("/")}
              >
                Browse problems
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="badges" className="p-4">
          <div className="text-center py-10">
            <p className="text-gray-500">Badges coming soon!</p>
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
