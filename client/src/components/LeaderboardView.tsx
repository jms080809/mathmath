import { Layout } from "./Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarPlaceholder } from "./ui/avatar-placeholder";

export function LeaderboardView() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  //loading user's info
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/leaderboard"],
  });
  //user leaderboard sorting on scores
  // try {
  //   console.log(Array(users).sort((a, b) => b.points - a.points));
  // } catch (error) {}
  let users_sorted: any[] = [];
  if (users) {
    users_sorted = [...users].sort((a, b) => b.points - a.points);
  }

  // Check if not admin
  if (!user) {
    return <Redirect to="/" />;
  }
  return (
    <Layout title="리더보드" leftAction={null} rightAction={null}>
      <div className="p-4">
        {/* Users Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Leaderboard</h2>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users_sorted.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <AvatarPlaceholder user={user} size="sm" />
                            <span className="ml-3 font-medium">
                              {user.username}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{user.points}</TableCell>
                        <TableCell>{user.problemsCreated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
