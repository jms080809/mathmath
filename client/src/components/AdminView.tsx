import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "./Layout";
import { LogOut, Users, Check, Star, Edit, Trash2, Loader2, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { AvatarPlaceholder } from "./ui/avatar-placeholder";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

export function AdminView() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    userId: number | null;
    username: string;
  }>({
    open: false,
    userId: null,
    username: "",
  });
  
  const [deleteProblemDialog, setDeleteProblemDialog] = useState<{
    open: boolean;
    problemId: number | null;
    problemText: string;
  }>({
    open: false,
    problemId: null,
    problemText: "",
  });
  
  const [editUserDialog, setEditUserDialog] = useState<{
    open: boolean;
    userId: number | null;
    userData: {
      username: string;
      isAdmin: boolean;
      points: number;
    } | null;
  }>({
    open: false,
    userId: null,
    userData: null,
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({ 
    queryKey: ["/api/admin/users"],
  });
  
  const { data: problems, isLoading: isLoadingProblems } = useQuery({ 
    queryKey: ["/api/problems"],
  });
  
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
  
  const handleDeleteUser = async () => {
    if (!deleteUserDialog.userId) return;
    
    try {
      await apiRequest("DELETE", `/api/admin/users/${deleteUserDialog.userId}`, {});
      
      toast({
        title: "User deleted",
        description: `${deleteUserDialog.username} has been deleted successfully`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUserDialog({ open: false, userId: null, username: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteProblem = async () => {
    if (!deleteProblemDialog.problemId) return;
    
    try {
      await apiRequest("DELETE", `/api/admin/problems/${deleteProblemDialog.problemId}`, {});
      
      toast({
        title: "Problem deleted",
        description: "Problem has been deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setDeleteProblemDialog({ open: false, problemId: null, problemText: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete problem",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenEditUser = (userData: any) => {
    setEditUserDialog({
      open: true,
      userId: userData.id,
      userData: {
        username: userData.username,
        isAdmin: userData.isAdmin,
        points: userData.points || 0
      }
    });
  };
  
  const handleUpdateUser = async () => {
    if (!editUserDialog.userId || !editUserDialog.userData) return;
    
    try {
      const { userData } = editUserDialog;
      
      await apiRequest("PUT", `/api/admin/users/${editUserDialog.userId}`, {
        username: userData.username,
        isAdmin: userData.isAdmin,
        points: userData.points
      });
      
      toast({
        title: "User updated",
        description: `${userData.username} has been updated successfully`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUserDialog({ open: false, userId: null, userData: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };
  
  // Check if not admin
  if (user && !user.isAdmin) {
    return (
      <Layout title="Admin Dashboard" hideBottomNav={false}>
        <div className="p-6 flex flex-col items-center justify-center h-96">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-500 mb-6 text-center">
            You don't have admin privileges to access this page.
          </p>
          <Button onClick={() => navigate("/")}>
            Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }
  
  // Calculate statistics
  const totalUsers = users?.length || 0;
  const totalProblems = problems?.length || 0;
  const problemsSolved = users?.reduce((sum, u: any) => sum + u.problemsSolved, 0) || 0;
  const activeUsers = totalUsers; // As a placeholder, we'd normally calculate this
  
  return (
    <Layout
      title="Admin Dashboard"
      hideBottomNav={false}
      rightAction={
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-gray-500" />
        </Button>
      }
    >
      <div className="p-4">
        {/* Users Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Users</h2>
          <Card>
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Problems</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <AvatarPlaceholder user={user} size="sm" />
                            <span className="ml-3 font-medium">{user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.points}</TableCell>
                        <TableCell>{user.problemsCreated}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => handleOpenEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                              onClick={() => setDeleteUserDialog({
                                open: true,
                                userId: user.id,
                                username: user.username,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Problems */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Recent Problems</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoadingProblems ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Problem</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems && problems.slice(0, 5).map((item: any) => (
                      <TableRow key={item.problem.id}>
                        <TableCell className="max-w-[160px] truncate">
                          {item.problem.text}
                        </TableCell>
                        <TableCell>{item.author.username}</TableCell>
                        <TableCell>
                          {item.problem.type === "multiple-choice" ? "Multiple Choice" : "Short Answer"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => navigate(`/problem/${item.problem.id}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                              onClick={() => setDeleteProblemDialog({
                                open: true,
                                problemId: item.problem.id,
                                problemText: item.problem.text,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">System Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold">{totalUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Check className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm text-gray-500">Total Problems</p>
                <p className="text-2xl font-semibold">{totalProblems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Star className="h-8 w-8 text-yellow-500 mb-2" />
                <p className="text-sm text-gray-500">Problems Solved</p>
                <p className="text-2xl font-semibold">{problemsSolved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="h-8 w-8 text-indigo-500 mb-2" />
                <p className="text-sm text-gray-500">Active Users (24h)</p>
                <p className="text-2xl font-semibold">{activeUsers}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Delete User Dialog */}
      <Dialog open={deleteUserDialog.open} onOpenChange={(open) => setDeleteUserDialog({ ...deleteUserDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the user "{deleteUserDialog.username}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialog({ open: false, userId: null, username: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Problem Dialog */}
      <Dialog open={deleteProblemDialog.open} onOpenChange={(open) => setDeleteProblemDialog({ ...deleteProblemDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete Problem</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this problem? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProblemDialog({ open: false, problemId: null, problemText: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProblem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editUserDialog.open} onOpenChange={(open) => !open && setEditUserDialog({ ...editUserDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          
          {editUserDialog.userData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={editUserDialog.userData.username} 
                  onChange={(e) => setEditUserDialog({
                    ...editUserDialog,
                    userData: {
                      ...editUserDialog.userData!,
                      username: e.target.value
                    }
                  })} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input 
                  id="points" 
                  type="number"
                  value={editUserDialog.userData.points} 
                  onChange={(e) => setEditUserDialog({
                    ...editUserDialog,
                    userData: {
                      ...editUserDialog.userData!,
                      points: parseInt(e.target.value) || 0
                    }
                  })} 
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="admin"
                  checked={editUserDialog.userData.isAdmin}
                  onCheckedChange={(checked) => setEditUserDialog({
                    ...editUserDialog,
                    userData: {
                      ...editUserDialog.userData!,
                      isAdmin: checked
                    }
                  })}
                />
                <Label htmlFor="admin" className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${editUserDialog.userData.isAdmin ? 'text-green-500' : 'text-gray-400'}`} />
                  Admin Privileges
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setEditUserDialog({ open: false, userId: null, userData: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
