import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import FeedPage from "@/pages/feed";
import UploadPage from "@/pages/upload";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import AuthPage from "@/pages/auth-page";
import ProblemDetailPage from "@/pages/problem-detail";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={FeedPage} />
      <ProtectedRoute path="/upload" component={UploadPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/problem/:id" component={ProblemDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
